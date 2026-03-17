# Sub-issues for #9670: Podman machine startup gets stuck in STARTING state permanently

## Sub-issue 1: Gracefully cancel in-flight `podman machine start` on shutdown

**Parent issue:** #9670

### Description

When Podman Desktop exits (via "Exit on Close" or quit) while a `podman machine start` child process is running, the Electron main process tears down stdout/stderr pipes. The orphaned child process receives **SIGPIPE**, which it cannot handle gracefully, and dies without resetting the `Starting` flag in the machine's JSON config (`~/.config/containers/podman/machine/applehv/<name>.json`). This leaves the machine permanently stuck in `STARTING` state.

The podman CLI handles `SIGTERM` and `SIGINT` correctly (since v5.6), but PD never sends either of these signals — it simply exits and lets the OS deliver SIGPIPE.

### Proposed solution

- Create a cancellation token that is passed to `execPodman()` inside `startMachine()` (`extensions/podman/packages/extension/src/extension.ts`).
- In `deactivate()`, cancel the token **before** any other cleanup. This triggers `childProcess.kill()` (SIGTERM) in the exec layer (`packages/main/src/plugin/util/exec.ts`), giving podman a signal it can handle.
- Allow a short grace period (~2s) after cancellation for the process to clean up before the app fully exits.
- If the start was cancelled, swallow the resulting error (don't surface it to the user as a failure).

### Acceptance criteria

- [ ] Closing PD while a machine is starting sends SIGTERM to the `podman machine start` process
- [ ] The machine does **not** end up stuck in STARTING state after PD exits during startup
- [ ] Cancellation errors are not shown to the user
- [ ] Existing `startMachine` tests updated and passing

### Files involved

- `extensions/podman/packages/extension/src/extension.ts` — `startMachine()`, `deactivate()`
- `extensions/podman/packages/extension/src/extension.spec.ts`

---

## Sub-issue 2: Auto-recover machines stuck in STARTING state from a previous session

**Parent issue:** #9670

### Description

Even with graceful cancellation (sub-issue 1), there are edge cases where the machine can still end up stuck in STARTING state (e.g., force-kill of PD, OS crash, power loss). Currently PD has **no recovery mechanism** — it faithfully reports the stale `Starting: true` flag from podman's JSON config, and the UI doesn't offer a way to stop a machine in STARTING state. The only workaround is manually editing the JSON file or running `podman machine reset -f`.

### Proposed solution

- Add a `recoverStuckStartingMachines()` function that iterates over machines in STARTING state and runs `podman machine stop` on each.
- Call it **once** during `doAutoStart()`, after the initial `updateMachines()` poll but **before** any new `startMachine()` call. At this point, no start has been initiated by PD, so any STARTING machine is stale from a previous session.
- On success, update the machine's status to `stopped` so autostart can proceed normally.
- Log warnings/errors for observability but don't block startup if recovery fails.

### Acceptance criteria

- [ ] On PD startup, machines left in STARTING from a previous crash are automatically recovered to STOPPED
- [ ] Autostart proceeds normally after recovery
- [ ] Recovery does **not** interfere with machines that are legitimately starting (i.e., when PD initiates a start)
- [ ] Recovery failures are logged but don't block PD startup
- [ ] Tests covering both stuck and non-stuck scenarios

### Files involved

- `extensions/podman/packages/extension/src/extension.ts` — new `recoverStuckStartingMachines()`, called from `doAutoStart()`
- `extensions/podman/packages/extension/src/extension.spec.ts`

---

## Sub-issue 3: Fix double-reject in exec cancellation handler

**Parent issue:** #9670

### Description

The `onCancellationRequested` handler in `Exec.exec()` has a pre-existing bug: after the `if (!childProcess.killed)` block kills the process and calls `reject()`, execution falls through to a second `reject()` call (the "Process has been already killed" path). The missing `else` means the Promise is rejected twice, which can cause unpredictable behavior — particularly now that cancellation is actively used for machine start shutdown (sub-issue 1).

### Proposed solution

Add an `else` branch so only one `reject()` is called per cancellation event.

**Before:**
```typescript
if (!childProcess.killed) {
  childProcess.kill();
  // ...
  reject(errResult);
}
// falls through — reject called again unconditionally
reject(errResult);
```

**After:**
```typescript
if (!childProcess.killed) {
  childProcess.kill();
  // ...
  reject(errResult);
} else {
  // ...
  reject(errResult);
}
```

### Acceptance criteria

- [ ] Only one `reject()` is called per cancellation event
- [ ] Existing exec cancellation test still passes
- [ ] No behavioral change for non-cancellation paths

### Files involved

- `packages/main/src/plugin/util/exec.ts`
- `packages/main/src/plugin/util/exec.spec.ts`
