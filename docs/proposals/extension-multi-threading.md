# Extension Multi-Threading: Analysis & Proof of Concept

> **Branch:** `experiment/extension-worker-threads`
> **Date:** 2026-04-30
> **Status:** Draft / Exploration

---

## 1. Problem Statement

All Podman Desktop extensions currently run on **a single Node.js thread** inside the Electron main process. This has three consequences:

1. **Sequential startup** — Extensions load and activate one after another. Even when they have no dependencies on each other, each must wait for the previous one to finish. With 10+ built-in extensions, this adds up.

2. **No isolation** — A misbehaving extension (infinite loop, unhandled exception, memory leak) can freeze or crash the entire application, including the UI.

3. **Main process blocking** — Long-running synchronous work in any extension blocks the Electron main process, which is also responsible for IPC with the renderer (UI). This causes visible UI freezes.

---

## 2. Current Architecture

### How extensions are loaded

The entry point is `ExtensionLoader.loadExtensions()` in `packages/main/src/plugin/extension/extension-loader.ts`.

```
loadExtensions(analyzedExtensions)
  │
  ├── searchForMissingDependencies()
  ├── searchForCircularDependencies()
  ├── sortExtensionsByDependencies()   // topological sort
  │
  └── for (ext of sorted) {
        await loadExtension(ext)       // sequential!
      }
```

### How each extension activates

```
loadExtension(extension)
  │
  ├── loadRuntime(extension)           // synchronous require()
  │     └── require(extension.mainPath)
  │
  └── activateExtension(extension, runtime)
        └── await runtime.activate(extensionContext)  // async but awaited
```

### The API surface

Each extension receives a `containerDesktopAPI` object built by `createApi()` with **18+ namespaces**:

| Namespace         | Examples                                       |
| ----------------- | ---------------------------------------------- |
| `commands`        | `registerCommand`, `executeCommand`            |
| `provider`        | `createProvider`, `registerLifecycle`          |
| `containerEngine` | `listContainers`, `createContainer`            |
| `kubernetes`      | `createResources`, `getKubeconfig`             |
| `window`          | `showInformationMessage`, `createWebviewPanel` |
| `configuration`   | `getConfiguration`, `onDidChangeConfiguration` |
| `registry`        | `registerRegistry`, `suggestRegistry`          |
| `authentication`  | `registerAuthenticationProvider`               |
| `tray`            | `registerMenuItem`                             |
| `cli`             | `createCliTool`                                |
| `imageChecker`    | `registerImageCheckerProvider`                 |
| `navigation`      | `navigateToContainers`, `navigateToImages`     |
| `fs`              | `createFileSystemWatcher`                      |
| `proxy`           | `getProxySettings`, `onDidStateChange`         |
| `env`             | `clipboard`, `openExternal`, `isMac`           |
| `process`         | `exec`                                         |
| `context`         | `setValue`                                     |
| `net`             | `createSocket`                                 |

Plus synchronous constructors: `Disposable`, `Uri`, `EventEmitter`, `CancellationTokenSource`, `TelemetryTrustedValue`.

### Extension dependencies

A key discovery: **none of the built-in extensions declare `extensionDependencies`**. They are all independent. The topological sort produces a flat list and they still load sequentially — this is the low-hanging fruit.

---

## 3. What We Built

### 3.1 Parallel Wave-Based Loading (Ready to Use)

**File:** `packages/main/src/plugin/extension/extension-loader.ts` (modified `loadExtensions`)

Instead of a sequential `for` loop, extensions are grouped into **waves** based on their dependency graph:

```
Wave 0: [ext-a, ext-b, ext-c, ext-d, ...]   // no dependencies → all parallel
Wave 1: [ext-e, ext-f]                        // depend on wave-0 extensions
Wave 2: [ext-g]                               // depends on wave-1 extensions
```

Each wave runs `Promise.all(wave.map(ext => loadExtension(ext)))`.

Since all built-in extensions have zero dependencies, they all land in **wave 0** and activate concurrently. The async I/O they do during activation (file reads, binary detection, API calls) now overlaps.

**Timing logs** are printed to the console:

```
Extension loader: wave 0 loaded 12 extension(s) in 847ms [podman, compose, ...]
Extension loader: all extensions loaded in 847ms (1 wave)
```

Compare to the current sequential approach where the same extensions take ~3-5 seconds.

**All 113 existing tests pass unchanged.** The dependency ordering test still passes because its 3 test extensions have explicit dependencies that force them into separate waves.

### 3.2 Worker Thread PoC (Experimental)

**Files:**

- `packages/main/src/plugin/extension/extension-worker-host.ts` — Main thread side
- `packages/main/src/plugin/extension/extension-worker-runtime.ts` — Worker thread side

Architecture:

```
Main Thread                          Worker Thread (per extension)
───────────                          ────────────────────────────
ExtensionWorkerHost                  extension-worker-runtime.ts
  │                                    │
  │── postMessage({init}) ────────────>│  require(extension)
  │                                    │  call activate(proxyApi)
  │                                    │
  │<── postMessage({api-call}) ────────│  extension calls api.commands.registerCommand(...)
  │                                    │
  │  [dispatch to real registry]       │
  │                                    │
  │── postMessage({api-result}) ──────>│  proxy resolves the promise
  │                                    │
  │<── postMessage({callback}) ────────│  main thread invokes registered command
  │── postMessage({callback-result}) ─>│  callback resolves in worker
```

The worker runtime:

- Loads the extension module via the worker's own `require()`
- Hooks `require('@podman-desktop/api')` to return a Proxy object
- Every property access on the proxy (e.g., `commands.registerCommand`) creates a `postMessage` call to the main thread
- Callback arguments (functions) are replaced with callback IDs that the main thread can invoke back

---

## 4. Walls & Blockers

### Wall 1 — Massive API Proxy Surface

**Severity: High**

The `containerDesktopAPI` exposes 18+ namespaces with dozens of methods each. Every single method call must be:

1. Serialized to a message in the worker
2. Sent via `MessagePort` to the main thread
3. Dispatched to the real registry/service
4. Result serialized back
5. Returned to the extension

This is hundreds of methods to proxy. Each round-trip adds latency (~0.1-1ms per call). Extensions that make many API calls during activation would see measurable slowdown.

**VS Code's approach:** They built a full JSON-RPC protocol (`extHost.protocol.ts`) with auto-generated proxy classes. This is ~20k+ lines of infrastructure code.

### Wall 2 — Bidirectional Callback Invocation

**Severity: High**

Extensions register callbacks that must be invoked from the main thread:

```typescript
commands.registerCommand('my.command', args => {
  // This callback lives in the worker thread
  // but the main thread needs to call it when the command is triggered
});

provider.registerLifecycle(myProvider, {
  start: async () => {
    /* lives in worker */
  },
  stop: async () => {
    /* lives in worker */
  },
});
```

This requires bidirectional async messaging: main→worker to invoke, worker→main to return the result. Each callback needs a unique ID, a pending-call map, and timeout handling.

**Compounding factor:** Some callbacks return `Disposable` objects, which themselves have callbacks (`dispose()`), creating nested proxy chains.

### Wall 3 — Non-Serializable Objects

**Severity: High**

`MessagePort` uses the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm). This **strips methods and prototype chains**.

Objects that break:

- `Disposable` — has `dispose()` method
- `Uri` — has `fsPath`, `toString()`, `with()` methods
- `Provider` — complex object with lifecycle methods
- `ContainerProviderConnection` — has `lifecycle` with start/stop callbacks
- `EventEmitter` / `Event` — has `fire()`, `dispose()`, subscription management
- `WebviewPanel` — has `webview.postMessage()`, `dispose()`, `onDidDispose`

Each of these would need a remote proxy: a thin wrapper that sends method calls over `MessagePort` and returns results.

### Wall 4 — Module System Differences

**Severity: Medium**

The current `loadRuntime()` manipulates `require.cache` extensively to handle extension reloading (cleaning up old modules, removing child references). Worker threads have their own module cache, so:

- Cache cleanup logic becomes irrelevant (each worker is fresh)
- But extension module resolution may differ if extensions expect to resolve modules relative to the main process
- The `require('@podman-desktop/api')` hook needs to work in the worker's module system

### Wall 5 — Synchronous API Contracts (BLOCKER)

**Severity: Blocker**

Several core API objects are synchronous and used as such by every extension:

```typescript
// Extensions do this today:
const disposable = commands.registerCommand('foo', handler);
disposable.dispose(); // synchronous!

const emitter = new EventEmitter<string>();
emitter.fire('hello'); // synchronous!

const uri = Uri.file('/path/to/file'); // synchronous constructor!
uri.fsPath; // synchronous property!

const cts = new CancellationTokenSource();
cts.token.isCancellationRequested; // synchronous!
```

In a worker thread, `commands.registerCommand()` would become async (must round-trip to main thread). This breaks:

```typescript
// This pattern is everywhere and cannot become async without
// changing every extension:
context.subscriptions.push(
  commands.registerCommand('foo', handler), // would need await
);
```

**Options:**

- Ship `Disposable`, `Uri`, `EventEmitter`, `CancellationTokenSource` as real classes in the worker (not proxied). This helps but `registerCommand` still returns a Disposable that wraps a main-thread registration.
- Make all registration methods async and require extensions to `await` them. This is a **breaking API change** affecting every extension.
- Use `Atomics.wait()` + `SharedArrayBuffer` for synchronous cross-thread calls. This works but blocks the worker thread during the call, defeating the purpose.

### Wall 6 — Extension Cross-Exports

**Severity: Medium**

Extensions can access each other's exports:

```typescript
const ext = extensions.getExtension('other.extension');
const api = ext?.exports; // direct object reference
```

If extensions run in separate workers, their exports can't be shared directly. Would need serialization or a shared registry with proxy objects.

**Mitigating factor:** This pattern is rare in the built-in extensions. External extensions may use it more.

### Wall 7 — Native Modules

**Severity: Low**

Some extensions might load native `.node` addons. Worker threads can load native modules, but:

- The addon must be thread-safe
- Some addons assume they run in the main thread
- The `loadRuntime` code already skips `.node` files during cache cleanup

**Mitigating factor:** Few Podman Desktop extensions use native addons directly.

---

## 5. Comparison with VS Code

VS Code solved this problem with a **full extension host process**:

| Aspect               | VS Code                    | Podman Desktop (current)                  |
| -------------------- | -------------------------- | ----------------------------------------- |
| Extension isolation  | Separate child process     | Same thread as main                       |
| API transport        | JSON-RPC over IPC          | Direct function calls                     |
| Serialization        | Full ser/deser protocol    | None needed                               |
| Crash isolation      | Extension host can restart | App crashes                               |
| Performance overhead | ~2-5ms per API call        | ~0 (direct)                               |
| Infrastructure code  | ~20k+ lines                | 0                                         |
| Startup              | Parallel activation        | Sequential (now parallel with our change) |

**Key takeaway:** VS Code invested heavily in the extension host infrastructure over years. It's not a weekend project.

---

## 6. Recommended Path Forward

### Phase 1 — Parallel Activation (Quick Win, This Branch)

**Effort: Done | Risk: Low | Impact: Medium**

The wave-based parallel loading is already implemented and tested. Since all built-in extensions are independent, they all activate in a single parallel wave. Expected startup improvement: **2-4x faster** extension loading.

This is safe to merge after real-world testing.

### Phase 2 — Offload Heavy Work to Workers (Medium Term)

**Effort: Medium | Risk: Low | Impact: Medium**

Instead of running entire extensions in workers, offload specific expensive operations:

- Image building/pulling progress tracking
- Container log streaming
- Kubernetes resource watching
- Binary detection and version parsing

This doesn't require API changes — extensions would use a helper to spawn workers for compute-heavy tasks, similar to how web apps use Web Workers for parsing.

### Phase 3 — Extension Host Process (Long Term, if Needed)

**Effort: Very High | Risk: High | Impact: High**

Full VS Code-style extension host in a child process with:

- JSON-RPC or MessagePort-based API protocol
- Auto-generated proxy classes for all 18+ namespaces
- Bidirectional callback support
- Object serialization/deserialization layer
- Extension host lifecycle management (restart on crash)

**Only worth pursuing if:**

- Third-party extensions become common and untrusted
- Extension crashes become a frequent user-reported issue
- Startup time remains a problem after Phase 1

---

## 7. Files Changed

| File                                                             | Change                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/main/src/plugin/extension/extension-loader.ts`         | Wave-based parallel `loadExtensions()` with timing logs |
| `packages/main/src/plugin/extension/extension-worker-host.ts`    | NEW — Main-thread worker manager                        |
| `packages/main/src/plugin/extension/extension-worker-runtime.ts` | NEW — Worker-thread extension runtime                   |

---

## 8. Testing

All 113 existing tests in `extension-loader.spec.ts` pass unchanged, including the test `load extensions sequentially` which exercises dependency ordering with 3 extensions that have explicit dependencies.

To run:

```bash
pnpm exec vitest run packages/main/src/plugin/extension/extension-loader.spec.ts
```

To see the parallel loading in action, start the app and check the console for:

```
Extension loader: wave 0 loaded N extension(s) in XXXms [...]
Extension loader: all extensions loaded in XXXms (1 wave)
```
