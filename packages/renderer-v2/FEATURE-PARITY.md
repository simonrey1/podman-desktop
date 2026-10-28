# Renderer v1 features, and their status in renderer v2

Inventory of the user-facing features of `packages/renderer` (read from the code), grouped by domain, to plan
feature parity in `packages/renderer-v2`. Paths are relative to `packages/renderer/src`.

Status in v2: ✅ done · ◐ partial · ☐ missing

## Cross-cutting patterns (used by most domains)

| Feature                                                                                                                         | v2                                                 |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| List pages: free-text search, sortable columns, default sort                                                                    | ✅                                                 |
| List pages: environment (engine) filter dropdown — v2 scopes lists to the engine selected in the explorer instead               | ◐                                                  |
| List pages: configurable column layout                                                                                          | ☐                                                  |
| List pages: multi-select + bulk actions bar ("On N selected items") with bulk delete + confirmation                             | ☐                                                  |
| List pages: Prune button (containers, pods, volumes, images: all unused / untagged) with confirmation                           | ☐                                                  |
| Empty states: no engine running; filtered with "reset filter"; per-domain empty screen with copyable command + "first X" button | ◐ (plain empty states)                             |
| Confirmation before destructive actions                                                                                         | ☐                                                  |
| Action failures reported to the user (v1: inline error icon; v2: toast with the error)                                          | ✅                                                 |
| Transient statuses on actions (STARTING, STOPPING, DELETING, RESTARTING…)                                                       | ☐                                                  |
| Extension-contributed actions on rows and details (`ContributionActions`, menu contexts + `when` clauses)                       | ☐                                                  |
| Details pages: Summary / Logs / Inspect / Kube / Terminal tabs pattern                                                          | ◐ (segmented sections, logs/terminal in the panel) |
| Inspect = read-only JSON in Monaco                                                                                              | ✅ (containers)                                    |
| Open exposed ports in the browser                                                                                               | ☐                                                  |
| Terminal settings (font size, line height, scrollback) applied to terminals                                                     | ☐                                                  |
| Telemetry events                                                                                                                | ☐                                                  |

## Containers (`lib/container`)

| Feature                                                                                                                             | v2                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| List columns: status, name (+ ports), image, age                                                                                    | ✅                         |
| List columns: environment, uptime (running only)                                                                                    | ☐                          |
| All / Running / Stopped filter                                                                                                      | ✅                         |
| Tree grouping: compose projects and Podman pods, expandable, group status/actions                                                   | ☐                          |
| Row actions: start/stop, restart, delete, logs, terminal                                                                            | ✅                         |
| Row actions: unpause, open browser, generate kube, export, extension actions                                                        | ☐                          |
| Bulk: run, stop, delete, create pod from selection                                                                                  | ☐                          |
| Create: from existing image / from Containerfile                                                                                    | ☐                          |
| Empty state "Start your first container" (pulls + runs hello)                                                                       | ☐                          |
| Details header: status, engine, actions; Summary links to the image and the pod                                                     | ✅                         |
| Details: live CPU / memory stats                                                                                                    | ☐                          |
| Details Summary (name, id, engine, image, command, ports links, state, started, labels, group/pod info, infra banner)               | ◐                          |
| Details Inspect, Kube (generated YAML)                                                                                              | ✅                         |
| Logs: streaming                                                                                                                     | ✅ (panel, multi-instance) |
| Logs: search, clear logs (since-timestamp), re-fetch on restart                                                                     | ☐                          |
| Terminal: interactive shell                                                                                                         | ✅ (panel, multi-instance) |
| Terminal: auto-reconnect, "not running" state, hidden for infra containers                                                          | ☐                          |
| TTY attach tab (Tty + OpenStdin containers)                                                                                         | ☐                          |
| Export container to a `.tar`                                                                                                        | ☐                          |
| Create container from existing image (typeahead on local/registry images and tags, short-name resolution, FQN option, pull-and-run) | ☐                          |
| Recommended registry sign-in hint                                                                                                   | ☐                          |

## Compose (`lib/compose`)

| Feature                                                                   | v2  |
| ------------------------------------------------------------------------- | --- |
| Compose groups in the containers list (by `com.docker.compose.project`)   | ☐   |
| Actions: start, stop, restart, delete, generate kube, extension actions   | ☐   |
| Details: Summary (containers), merged colour-prefixed logs, Inspect, Kube | ☐   |

## Pods — Podman (`lib/pod`)

| Feature                                                                                                | v2  |
| ------------------------------------------------------------------------------------------------------ | --- |
| List columns: status, name, containers count, age                                                      | ✅  |
| List columns: short id, environment, per-container status dots linking to the filtered containers list | ☐   |
| All / Running / Stopped filter                                                                         | ☐   |
| Row actions: start, stop, restart, delete                                                              | ✅  |
| Row actions: generate kube, open exposed port(s), extension actions                                    | ☐   |
| Podman kube play (file or from-scratch YAML, build/replace options, cancel)                            | ☐   |
| Empty state "Start your first pod"                                                                     | ☐   |
| Details: Summary (containers linked), Inspect, Kube                                                    | ✅  |
| Details: merged logs of the containers                                                                 | ☐   |
| Create pod from containers (name, ports to expose, engine; replicates containers)                      | ☐   |

## Images (`lib/image`) and manifests (`lib/manifest`)

| Feature                                                                                                                                                                                                                                                                                                | v2  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| List columns: status (in use), name, tag, age, size, id                                                                                                                                                                                                                                                | ✅  |
| List columns: arch, environment, extension badges                                                                                                                                                                                                                                                      | ☐   |
| Manifests as a tree with their child images                                                                                                                                                                                                                                                            | ☐   |
| Row actions: delete (unused only)                                                                                                                                                                                                                                                                      | ✅  |
| Row actions: run, push (modal), edit/retag (modal), history, save, update (re-pull), extension actions                                                                                                                                                                                                 | ☐   |
| Manifest actions: delete, push                                                                                                                                                                                                                                                                         | ☐   |
| Header actions: prune (unused / untagged), load, import, pull, build                                                                                                                                                                                                                                   | ☐   |
| Bulk: delete, save                                                                                                                                                                                                                                                                                     | ☐   |
| Details: Summary (used by, tags, labels, platform), History, Inspect                                                                                                                                                                                                                                   | ✅  |
| Details: manifest sub-images                                                                                                                                                                                                                                                                           | ☐   |
| Details: Check tab (image-checker extensions), Files tab (layers and filesystem tree)                                                                                                                                                                                                                  | ☐   |
| Pull image (registry search typeahead, tags, short names, engine, progress, cancel, then run / view details)                                                                                                                                                                                           | ☐   |
| Build image (Containerfile, context, name, target stage, build args, platforms → manifest, registry validation, background task, cancel)                                                                                                                                                               | ☐   |
| Run image / create container: Basic (name, entrypoint, command, volumes, ports, env, env files, secrets), Advanced (tty, interactive, user, auto-remove, restart policy, devices), Security (privileged, read-only, security-opt, caps, userns), Networking (hostname, DNS, extra hosts, network mode) | ☐   |
| Import containers (tar), save images (file/folder), load images (archives)                                                                                                                                                                                                                             | ☐   |
| Manifest details page (sub-manifests summary)                                                                                                                                                                                                                                                          | ☐   |

## Volumes, networks, secrets

| Feature                                                                                                                                  | v2  |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Volumes list: status (in use), name, driver, age, delete                                                                                 | ✅  |
| Volumes list: environment, size + "gather sizes", prune, bulk delete, extension actions                                                  | ☐   |
| Volume details (Summary with containers using it, Inspect)                                                                               | ✅  |
| Create volume                                                                                                                            | ☐   |
| Networks list: status (in use), name, driver, id, delete                                                                                 | ✅  |
| Network details (Summary with addressing and containers, Inspect)                                                                        | ✅  |
| Networks: create (basic: engine, name, driver, subnet; advanced: IPv6, internal, IP range, gateway, DNS), update DNS dialog, bulk delete | ☐   |
| Secrets: list, create (name + data), details (Summary, Inspect), delete, bulk delete                                                     | ☐   |

## Engines and providers (`lib/preferences` Resources, `lib/dashboard` providers)

| Feature                                                                                                                                                          | v2            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Engine switcher with status                                                                                                                                      | ✅ (explorer) |
| Engine overview page with resource counts                                                                                                                        | ✅            |
| Resources page: one card per provider, version, managed-config indicator                                                                                         | ☐             |
| Provider: create connection, set up (onboarding), install with preflight checks, update, extension buttons                                                       | ☐             |
| Connection cards: status/error, type, VM type, endpoint + copy, CPU/memory/disk usage, default connection                                                        | ☐             |
| Connection lifecycle: start, stop, restart, edit, delete (confirm), open terminal, extension menus                                                               | ☐             |
| Create / edit connection form generated from provider configuration properties (resource sliders bounded by the host, live audit, logs, cancel, background task) | ☐             |
| Connection details: Summary, Logs, Terminal (container, Kubernetes and VM connections)                                                                           | ☐             |
| Provider details: status, start/stop, logs, configuration                                                                                                        | ☐             |

## Kubernetes — out of scope

Kubernetes is not part of renderer v2: it moves to its own extension (and is planned to be removed from renderer v1).
Out of scope with it: contexts and namespaces, the Kubernetes dashboard and resource views, port forwarding,
deploying a pod / container / compose project to a cluster, the Kubernetes contexts settings page and the Kubernetes
troubleshooting tab. Kept, as Podman features: Generate Kube and Podman kube play. Kubernetes connections registered by
providers stay part of the engines and providers domain.

## Settings (`lib/preferences`)

| Feature                                                                                                                                                                  | v2                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Settings shell: navigation with static pages + one entry per configuration section, conditional entries                                                                  | ☐                                            |
| Configuration properties rendering by type (boolean, number/slider, string, enum, file/folder, password, markdown), reset to default, managed/locked, validation, search | ☐                                            |
| Proxy (disabled / manual / system, HTTP/HTTPS/no-proxy)                                                                                                                  | ☐                                            |
| Docker compatibility (socket mapping status, extension toggles)                                                                                                          | ☐                                            |
| Registries (list, login, edit, remove, suggested registries, add with credential check)                                                                                  | ☐                                            |
| Authentication providers (accounts, sign in/out, pending session requests)                                                                                               | ☐                                            |
| CLI tools (install/update to a version, uninstall, progress)                                                                                                             | ☐                                            |
| Experimental features (master toggle + properties)                                                                                                                       | ☐                                            |
| Theme (light / dark / system) applied                                                                                                                                    | ✅ (follows the setting; no settings UI yet) |
| Renderer v2 itself is switched by the experimental `rendererV2.enabled` setting                                                                                          | ✅                                           |

## Onboarding and welcome

| Feature                                                                                                                                                       | v2  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Welcome page (first run: extensions to set up, telemetry opt-in)                                                                                              | ☐   |
| Onboarding wizard (global multi-extension and per extension; steps with `when`, completion events, commands, embedded forms, skip/retry/cancel, saved status) | ☐   |

## Extensions (`lib/extensions`, `lib/featured`, `lib/recommendation`, `lib/explore-features`)

| Feature                                                                                       | v2  |
| --------------------------------------------------------------------------------------------- | --- |
| Extensions page: Installed / Catalog / Local tabs, search                                     | ☐   |
| Installed cards: status, badges, start / stop / remove, update, onboarding, edit properties   | ☐   |
| Install from an OCI image (custom)                                                            | ☐   |
| Catalog with install, refresh                                                                 | ☐   |
| Local (development) folders: add, start, stop, untrack                                        | ☐   |
| Extension details: summary, auto-update, README (markdown), errors                            | ☐   |
| Featured extensions, recommendation banners, explore-features carousel                        | ☐   |
| Docker Desktop extensions (`/contribs/:name`, webview with dedicated preload)                 | ☐   |
| Extension webviews (`/webviews/:id`, messages, DevTools)                                      | ☐   |
| Context keys synced from main (for `when` clauses), extension icon fonts, registered features | ☐   |

## Dashboard

| Feature                                                                                                                               | v2         |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Dashboard with containers / engines counts and engines                                                                                | ✅ (basic) |
| Reorderable / hideable sections                                                                                                       | ☐          |
| Notifications box (markdown, actions, dismiss)                                                                                        | ☐          |
| Release notes banner (dismiss, learn more, update)                                                                                    | ☐          |
| Learning center (guides carousel)                                                                                                     | ☐          |
| Providers section per provider state (not installed, installed, starting, configured, ready, stopped; install / initialize with logs) | ☐          |
| Experimental system overview (health, connection cards, CPU / memory / disk usage)                                                    | ☐          |

## Application shell

| Feature                                                                                          | v2                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Navigation: explorer of the selected engine                                                      | ✅ (different model from v1 nav bar) |
| Navigation for non-engine areas (extensions, settings, webviews, accounts)                       | ☐                                    |
| Navigation entries contributed by extensions, hideable entries                                   | ☐                                    |
| Title bar, window controls (Windows / Linux), macOS spacing                                      | ✅                                   |
| Title bar: back / forward history (keyboard shortcuts, long-press list)                          | ☐                                    |
| Title bar text from main (`getTitleBarText`)                                                     | ☐                                    |
| Tabs, preview tabs, panel with sessions, resizable layout                                        | ✅ (new in v2)                       |
| Navigation requests from main (protocol links, notifications: `NavigationPage` → view)           | ☐                                    |
| Command palette (commands, documentation, go to; Ctrl/Cmd+Shift+P, F1, Ctrl/Cmd+K)               | ☐                                    |
| Status bar entries contributed by extensions / main                                              | ☐                                    |
| Status bar: pinned provider widgets, task indicator                                              | ☐                                    |
| Task manager (running / completed tasks, view, cancel, clear)                                    | ☐                                    |
| Toasts (success / error / warning / info, task toasts)                                           | ◐ (failures of the actions)          |
| Dialogs requested by extensions / main: message box, input box, quick pick, custom pick          | ☐                                    |
| Markdown rendering with directives (buttons running commands, links, warnings, expandable)       | ☐                                    |
| Troubleshooting (engine checks and reconnect, repair/cleanup, console logs, gather logs, stores) | ☐                                    |
| Help menu, feedback (direct and GitHub issue)                                                    | ☐                                    |
| Accounts menu (sign in / out)                                                                    | ☐                                    |
| Keyboard: back/forward, Esc closes popups; v2 has ` (panel) and Ctrl+B (explorer)                | ◐                                    |
