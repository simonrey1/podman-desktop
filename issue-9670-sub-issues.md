# Sub-issues for #9670: Podman machine startup gets stuck in STARTING state permanently

## Root cause analysis

When Podman Desktop exits while `podman machine start` is running, two things go wrong:

### 1. SIGPIPE is never delivered

PD spawns `podman machine start` via Node.js `spawn()` with piped stdio. When PD exits, the pipes break — but SIGPIPE is only sent when the child process tries to **write** to the broken pipe. If podman is busy booting the VM (krunkit/vfkit) and not printing anything to stdout at that moment, SIGPIPE never arrives. The process eventually hangs or finishes with `Starting: true` still set.

### 2. SIGTERM fixes the flag but orphans the VM

Sending SIGTERM explicitly does reset `Starting: false` — but podman's signal handler ([`pkg/machine/shim/host.go` L529-543](https://github.com/containers/podman/blob/main/pkg/machine/shim/host.go)) calls `os.Exit(1)`, which **skips all Go defers**. This means:

- The VM (krunkit/vfkit) that was already booted at `StartVM()` is never stopped
- gvproxy is never cleaned up
- The `callBackFuncs.CleanIfErr` defer never runs

Result: `Starting: false` but the VM is orphaned — "running" with no API forwarding. `podman machine stop` hangs on it.

### Reproducers

All commands assume a stopped machine. Run with `podman machine ls` to check state after each.

**No signal (current PD behavior — parent just exits, pipes break):**

```bash
node -e "const c = require('child_process').spawn('podman', ['machine', 'start']); setTimeout(() => process.exit(), 1500)"
```

Result: `Starting: true` stuck forever, VM orphaned, machine unusable.

**SIGTERM before exit:**

```bash
node -e "const c = require('child_process').spawn('podman', ['machine', 'start']); setTimeout(() => { c.kill('SIGTERM'); setTimeout(() => process.exit(), 2000) }, 1500)"
```

Result (without fix): `Starting: false` but VM orphaned, `podman machine stop` hangs.
Result (with fix from [simonrey1/podman#1](https://github.com/simonrey1/podman/pull/1)): `Starting: false`, machine finishes starting normally, fully usable.

**SIGPIPE (explicit — rarely delivered in practice):**

```bash
node -e "const c = require('child_process').spawn('podman', ['machine', 'start']); setTimeout(() => { c.kill('SIGPIPE'); setTimeout(() => process.exit(), 2000) }, 1500)"
```

Result: same as SIGTERM without fix — `Starting: false` but VM orphaned.

### Summary table

| Scenario | `Starting` flag | VM state | `podman machine stop` | Usable? |
|----------|----------------|----------|----------------------|---------|
| No signal (current PD behavior) | **True — stuck** | Running (orphaned) | Hangs | No |
| SIGTERM (without upstream fix) | False | Running (orphaned) | Hangs | No |
| SIGTERM (with upstream fix) | False | Running (healthy) | Works | Yes |
| SIGPIPE (without upstream fix) | False | Running (orphaned) | Hangs | No |
| Let `podman machine start` finish | False | Running | Works | Yes |

### Tested on

- macOS Sequoia (darwin/arm64)
- Podman 5.8.0 (system), 6.0.0-dev (built from fix branch)
- VM type: libkrun

---

## Proposed approach

### On the podman side (upstream fix)

**PR: [simonrey1/podman#1](https://github.com/simonrey1/podman/pull/1)** — fixes the signal handler in `pkg/machine/shim/host.go` to properly stop the VM and clean up gvproxy before `os.Exit(1)`, instead of skipping all defers. Uses an `atomic.Bool` to track whether `StartVM()` has been called, and removes the redundant `CleanOnSignal()` goroutine that raced with the signal handler.

Tested locally: after the fix, sending SIGTERM during startup results in the machine finishing its boot normally and being fully usable (`podman ps` works, `podman machine stop` works).

### On the Podman Desktop side

Since we can't control when the upstream fix ships, PD should handle this defensively:

---

## Sub-issue 1: Let `podman machine start` finish even when PD exits

**Parent issue:** #9670

### Description

The cleanest outcome is for the machine to finish starting, even if PD exits. Right now the child process is spawned with piped stdio tied to the parent — when PD exits, the pipes break and the child either hangs (no SIGPIPE) or gets killed (SIGTERM) leaving an orphaned VM.

### Proposed solution

When spawning `podman machine start`, use `detached: true` and `stdio: 'ignore'` (or redirect to a log file) so the child process is not tied to PD's lifecycle. This way:

- If PD exits, the child keeps running and finishes normally
- The machine ends up in a clean `started` state
- No orphaned VM, no stuck `Starting` flag
- On next PD launch, the machine is detected as running

**Trade-off:** PD loses real-time stdout/stderr from the start process. We could mitigate this by writing to a log file instead of piping.

**Alternative (simpler):** Keep the current piped spawn, but in `deactivate()`, simply `unref()` the child process so Node.js doesn't wait for it. The child inherits the broken pipe but may still finish if it doesn't write at the wrong time. Less reliable but lower risk.

### Acceptance criteria

- [ ] Closing PD while a machine is starting does not interrupt the start process
- [ ] Machine finishes starting and is usable after PD restarts
- [ ] Start progress/logs are still captured if possible

### Files involved

- `extensions/podman/packages/extension/src/extension.ts` — `startMachine()`
- `packages/main/src/plugin/util/exec.ts` — `spawn()` options

---

## Sub-issue 2: Auto-recover machines stuck in STARTING or orphaned state on startup

**Parent issue:** #9670

### Description

Even with sub-issue 1, edge cases (force-kill, OS crash, power loss) can still leave a machine stuck in STARTING or in an orphaned running-but-unresponsive state. Currently PD has **no recovery mechanism**.

### Proposed solution

- Add a `recoverStuckStartingMachines()` function that runs once at PD startup, before autostart.
- Detect machines in STARTING state (stale from a previous session since PD hasn't started anything yet).
- Attempt recovery in order:
  1. `podman machine stop` — works in most cases
  2. If stop hangs/fails: kill orphaned VM processes (krunkit/vfkit/gvproxy) directly, then reset the JSON config
  3. Last resort: `podman machine reset -f` (destructive, but better than permanently stuck)
- Also run this check on the first `monitorMachines()` cycle, not just during autostart, so it works even when autostart is disabled.

### Acceptance criteria

- [ ] On PD startup, machines stuck in STARTING from a previous crash are automatically recovered
- [ ] Orphaned VMs (running but unresponsive) are detected and cleaned up
- [ ] Recovery does **not** interfere with machines that are legitimately starting
- [ ] Recovery failures are logged but don't block PD startup
- [ ] Tests covering stuck and non-stuck scenarios

### Files involved

- `extensions/podman/packages/extension/src/extension.ts` — new `recoverStuckStartingMachines()`
- `extensions/podman/packages/extension/src/extension.spec.ts`

---

## Sub-issue 3: Fix double-reject in exec cancellation handler

**Parent issue:** #9670

### Description

Pre-existing bug: the `onCancellationRequested` handler in `Exec.exec()` calls `reject()` twice due to a missing `else`. Not directly related to the machine stuck issue but should be fixed for correctness.

[exec.ts L179-L191](https://github.com/podman-desktop/podman-desktop/blame/46f88a319f9fe3f0ab7504299724b15815c369a5/packages/main/src/plugin/util/exec.ts#L179-L191)

### Proposed solution

Add an `else` branch so only one `reject()` is called per cancellation event.

### Acceptance criteria

- [ ] Only one `reject()` is called per cancellation event
- [ ] Existing exec cancellation test still passes

### Files involved

- `packages/main/src/plugin/util/exec.ts`
- `packages/main/src/plugin/util/exec.spec.ts`
