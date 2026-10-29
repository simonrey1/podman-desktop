# Renderer v1 features, and their status in renderer v2

Inventory of the user-facing features of `packages/renderer` (read from the code), grouped by domain, to plan
feature parity in `packages/renderer-v2`. Paths are relative to `packages/renderer/src`.

Status in v2: ✅ done · ◐ partial · ☐ missing · ✕ rejected for now (not planned in the phases, may come back later)

The decisions behind this inventory, and the designs still open, are in [DESIGN-DECISIONS.md](DESIGN-DECISIONS.md).

## Cross-cutting patterns (used by most domains)

| Feature                                                                                                                                                                      | v2                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| List pages: free-text search, sortable columns, default sort                                                                                                                 | ✅                                                 |
| List pages: environment (engine) filter dropdown — v2 scopes lists to the engine selected in the explorer instead                                                            | ◐                                                  |
| List pages: configurable column layout                                                                                                                                       | ☐                                                  |
| List pages: multi-select (checkbox column, select-all of the rows shown, used resources not selectable)                                                                      | ✅                                                 |
| List pages: bulk actions bar ("N selected", the actions on the selected rows, Clear), one confirmation, one toast for the failures                                           | ✅                                                 |
| List pages: Prune button (containers, pods, volumes, images: all unused / untagged) with confirmation                                                                        | ✅                                                 |
| Empty states: engine not running; nothing matching the filters, with "reset filter(s)"                                                                                       | ✅                                                 |
| Empty states: per-domain empty screen with "first X" button (containers, pods)                                                                                               | ✅                                                 |
| Confirmation before destructive actions (delete)                                                                                                                             | ✅                                                 |
| Action failures reported to the user (v1: inline error icon; v2: toast with the error)                                                                                       | ✅                                                 |
| Transient statuses on actions (starting, stopping, deleting, restarting… on the row and the details header; buttons disabled with a spinner)                                 | ✅                                                 |
| Extension-contributed actions on rows and details (`ContributionActions`, menu contexts + `when` clauses)                                                                    | ☐                                                  |
| Details pages: Summary / Logs / Inspect / Kube / Terminal tabs pattern                                                                                                       | ◐ (segmented sections, logs/terminal in the panel) |
| Inspect = read-only JSON in Monaco                                                                                                                                           | ✅ (containers)                                    |
| Search in the logs and the editors (Inspect, Kube): one find widget (Ctrl/Cmd+F), match case, regex                                                                          | ✅                                                 |
| Open exposed ports in the browser (containers, pods)                                                                                                                         | ✅                                                 |
| Terminal settings (font size, line height, scrollback) applied to the terminals, the logs and the build output, as they change (v2's look while a setting keeps its default) | ✅                                                 |
| Telemetry events                                                                                                                                                             | ☐                                                  |

## Containers (`lib/container`)

| Feature                                                                                                                             | v2                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| List columns: status, name (+ ports), image, age                                                                                    | ✅                         |
| List columns: uptime (running only)                                                                                                 | ✅                         |
| List columns: environment — v2 lists the containers of the engine selected in the explorer                                          | ◐                          |
| All / Running / Stopped filter                                                                                                      | ✅                         |
| Tree grouping: compose projects and Podman pods, expandable, group status/actions                                                   | ✅                         |
| Row actions: start/stop, restart, delete, logs, terminal                                                                            | ✅                         |
| Row actions: unpause, open in the browser, generate kube, export                                                                    | ✅                         |
| Row actions: extension actions (phase 9)                                                                                            | ☐                          |
| Bulk: run, stop, delete                                                                                                             | ✅                         |
| Bulk: create pod from selection (Podman, the containers not in a pod)                                                               | ✅                         |
| Create: from existing image / from Containerfile                                                                                    | ✕                          |
| Empty state "Start your first container" (pulls and runs quay.io/podman/hello, a toast opens it)                                    | ✅                         |
| Details header: status, engine, actions; Summary links to the image and the pod                                                     | ✅                         |
| Details: live CPU / memory stats                                                                                                    | ✅                         |
| Details Summary (name, id, engine, image, command, ports links, state, started, labels, group/pod info, infra banner)               | ✅                         |
| Details Inspect, Kube (generated YAML)                                                                                              | ✅                         |
| Logs: streaming                                                                                                                     | ✅ (panel, multi-instance) |
| Logs: search, clear logs (since-timestamp), re-fetch on restart                                                                     | ✅                         |
| Terminal: interactive shell                                                                                                         | ✅ (panel, multi-instance) |
| Terminal: auto-reconnect, "not running" state, hidden for infra containers                                                          | ✅                         |
| TTY attach (panel session from Attach in the details of a Tty + OpenStdin container, attached again on each start)                  | ✅                         |
| Export container to a `.tar`                                                                                                        | ✅                         |
| Create container from existing image (typeahead on local/registry images and tags, short-name resolution, FQN option, pull-and-run) | ✕                          |
| TTY attach: Run opens it after starting a Tty + OpenStdin container                                                                 | ✅                         |

## Compose (`lib/compose`)

| Feature                                                                                                           | v2  |
| ----------------------------------------------------------------------------------------------------------------- | --- |
| Compose groups in the containers list (by `com.docker.compose.project`)                                           | ✅  |
| Actions: start, stop, restart, delete                                                                             | ✅  |
| Actions: generate kube                                                                                            | ✅  |
| Actions: extension actions (phase 9)                                                                              | ☐   |
| Details: Summary (project, Compose file, containers with their service), Inspect, Kube; opened from the group row | ✅  |
| Details: merged colour-prefixed logs                                                                              | ✕   |

## Pods — Podman (`lib/pod`)

| Feature                                                                                                                                                                                         | v2  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| List columns: status, name, containers count, age                                                                                                                                               | ✅  |
| List columns: short id, per-container status dots (name and status in their tooltip)                                                                                                            | ✅  |
| List columns: environment (v2: the engine of the explorer); status dots linking to the containers                                                                                               | ☐   |
| All / Running / Stopped filter                                                                                                                                                                  | ✅  |
| Row actions: start, stop, restart, delete                                                                                                                                                       | ✅  |
| Bulk: start, stop, delete                                                                                                                                                                       | ✅  |
| Row actions: generate kube, open the exposed port in the browser                                                                                                                                | ✅  |
| Row actions: extension actions (phase 9)                                                                                                                                                        | ☐   |
| Podman kube play (tab from the pods list of a Podman engine: a file or YAML written in an editor, build/replace options, cancel; the pods created with Open, their container errors; form kept) | ✅  |
| Empty state "Start your first pod" (my-first-pod with a hello container, a toast opens it)                                                                                                      | ✅  |
| Details: Summary (containers linked), Inspect, Kube                                                                                                                                             | ✅  |
| Details: merged logs of the containers                                                                                                                                                          | ✕   |
| Create pod from containers (name, ports to expose; copies the containers)                                                                                                                       | ✅  |

## Images (`lib/image`) and manifests (`lib/manifest`)

| Feature                                                                                                                                                                                                                                                                                                                                      | v2  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| List columns: status (in use), name, tag, age, size, id                                                                                                                                                                                                                                                                                      | ✅  |
| List columns: arch                                                                                                                                                                                                                                                                                                                           | ✅  |
| List columns: environment (v2: the engine of the explorer), extension badges                                                                                                                                                                                                                                                                 | ☐   |
| Manifests as a tree with their child images                                                                                                                                                                                                                                                                                                  | ✅  |
| Row actions: delete (unused only)                                                                                                                                                                                                                                                                                                            | ✅  |
| Row actions: history, save (to a `.tar`), update (pull again, confirmed)                                                                                                                                                                                                                                                                     | ✅  |
| Row actions: push (tag, registry credentials, progress of the layers), edit (rename / retag)                                                                                                                                                                                                                                                 | ✅  |
| Row actions: run (opens the run form)                                                                                                                                                                                                                                                                                                        | ✅  |
| Row actions: extension actions (phase 9)                                                                                                                                                                                                                                                                                                     | ☐   |
| Manifest actions: delete                                                                                                                                                                                                                                                                                                                     | ✅  |
| Manifest actions: push (confirmed, result in a toast)                                                                                                                                                                                                                                                                                        | ✅  |
| Header actions: prune (unused / untagged), load, import, pull                                                                                                                                                                                                                                                                                | ✅  |
| Header actions: build                                                                                                                                                                                                                                                                                                                        | ✅  |
| Bulk: delete                                                                                                                                                                                                                                                                                                                                 | ✅  |
| Bulk: save                                                                                                                                                                                                                                                                                                                                   | ✅  |
| Details: Summary (used by, tags, labels, platform), History, Inspect                                                                                                                                                                                                                                                                         | ✅  |
| Details: manifest sub-images (platforms linked to their pulled images)                                                                                                                                                                                                                                                                       | ✅  |
| Files tab (Browse files on an image, with an image files extension: the layers, the filesystem up to a layer or the files of the layer, added / modified / removed)                                                                                                                                                                          | ✅  |
| Details: Check tab (image-checker extensions, phase 9)                                                                                                                                                                                                                                                                                       | ☐   |
| Pull image (dialog: registry search as typed, short names; progress in the task and a toast, then Open)                                                                                                                                                                                                                                      | ✅  |
| Pull image: cancel (toast or task), the tags of the registry suggested after a colon, a hint without a latest tag                                                                                                                                                                                                                            | ✅  |
| Pull image: run after the pull (v2: Open, then Run in the image)                                                                                                                                                                                                                                                                             | ◐   |
| Build image (tab: Containerfile, context, name, target stage, build args, platforms → manifest, registry validation; output in a panel session, cancel)                                                                                                                                                                                      | ✅  |
| Run image (tab: name, entrypoint, command, ports with free host ports and checks, volumes, env, env files, secrets; tty, interactive, user, auto-remove, restart policy, devices; network mode, hostname, DNS, extra hosts; privileged, read-only, security options, capabilities, userns; create or create and start, form kept, then Open) | ✅  |
| Import containers (tar), save images (one tar for the images selected), load images (archives)                                                                                                                                                                                                                                               | ✅  |
| Manifest details page (Summary with the platforms, Inspect of the manifest)                                                                                                                                                                                                                                                                  | ✅  |

## Volumes, networks, secrets

| Feature                                                                                            | v2  |
| -------------------------------------------------------------------------------------------------- | --- |
| Volumes list: status (in use), name, driver, age, delete                                           | ✅  |
| Volumes list: bulk delete                                                                          | ✅  |
| Volumes list: size + "gather sizes"                                                                | ✅  |
| Volumes list: environment (v2: the engine of the explorer), extension actions (phase 9)            | ☐   |
| Volume details (Summary with containers using it, Inspect)                                         | ✅  |
| Create volume (dialog: name, or one generated by the engine)                                       | ✅  |
| Networks list: status (in use), name, driver, id, delete, bulk delete                              | ✅  |
| Network details (Summary with addressing and containers, Inspect)                                  | ✅  |
| Networks: update DNS dialog (Podman networks)                                                      | ✅  |
| Networks: create (dialog — name, driver, subnet; advanced: IP range, gateway, IPv6, internal, DNS) | ✅  |
| Secrets: list, create (name + data), details (Summary, Inspect), delete, bulk delete               | ✅  |

## Engines and providers (`lib/preferences` Resources, `lib/dashboard` providers)

| Feature                                                                                                                                                                                                                                                      | v2            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Engine switcher with status                                                                                                                                                                                                                                  | ✅ (explorer) |
| Engine overview page with resource counts                                                                                                                                                                                                                    | ✅            |
| System overview on the dashboard: the connections by type (container engines, Kubernetes, VMs), their provider, version or VM type, status or error, CPU / memory / disk usage, health summary (replaces the Resources page of the settings, not duplicated) | ✅            |
| Resources page of the settings (v1: the providers, the CLI-only ones included)                                                                                                                                                                               | ✕             |
| + Add resource: create a connection (a Podman machine, a kind cluster, a VM) in a modal generated from the provider's properties                                                                                                                             | ☐             |
| Provider set-up, install, update (v2: the notifications of the extensions on the dashboard, e.g. Podman not installed)                                                                                                                                       | ✕             |
| Connection overview: Kubernetes and VM connections in a simple overview of their details (provider, status, API server, error)                                                                                                                               | ✅            |
| Connection overview: container engines in the engine overview (status/error, type, VM type, endpoint + copy, usage, default connection)                                                                                                                      | ☐             |
| Connection lifecycle: start, stop, restart, edit, delete (confirm), open terminal, extension menus                                                                                                                                                           | ☐             |
| Edit connection in a modal, generated from the provider's properties (resource sliders bounded by the host, logs, cancel)                                                                                                                                    | ☐             |
| Connection logs and terminal (panel sessions, from the overview)                                                                                                                                                                                             | ☐             |
| Provider details page (v1)                                                                                                                                                                                                                                   | ✕             |

## Kubernetes — out of scope

Kubernetes is not part of renderer v2: it moves to its own extension (and is planned to be removed from renderer v1).
Out of scope with it: contexts and namespaces, the Kubernetes dashboard and resource views, port forwarding,
deploying a pod / container / compose project to a cluster, the Kubernetes contexts settings page and the Kubernetes
troubleshooting tab. Kept, as Podman features: Generate Kube and Podman kube play. Kubernetes connections registered by
providers stay part of the engines and providers domain. How extensions (e.g. the Kubernetes dashboard) could contribute what the explorer
browses is a proposal in [DESIGN-DECISIONS.md](DESIGN-DECISIONS.md#8-extensions-contributing-to-what-the-explorer-browses).

## Settings (`lib/preferences`)

| Feature                                                                                                                                                                                                                 | v2                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Settings shell: a Settings tab (from the explorer), its pages: one per configuration section and node, the pages of their own, search in every section                                                                  | ✅                                           |
| Settings: the settings with a `when` clause (they need the context keys, phase 9)                                                                                                                                       | ☐                                            |
| Configuration properties rendering by type (boolean switch, number, string, enum, file/folder, password, markdown), reset to default, managed/locked, number validation, search, written as changed and kept up to date | ✅                                           |
| Proxy (system / given / none, HTTP, HTTPS, hosts without the proxy, address validation, managed fields, restart hint for the running engines)                                                                           | ✅                                           |
| Docker compatibility (a page once enabled: the engine answering the Docker socket, its version, check again)                                                                                                            | ✅                                           |
| Docker compatibility: the settings contributed by the extensions (they need the context keys, phase 9)                                                                                                                  | ☐                                            |
| Registries (signed in, sign in with a credential check and the untrusted certificate question, change the credentials, sign out confirmed, suggested registries, preferred registries for short names)                  | ✅                                           |
| Recommended registry sign-in hint (a failed pull: sign in to the registry, or with the extension recommended for it in the authentication settings)                                                                     | ✅                                           |
| Authentication providers (accounts, sign out, the sign-ins asked by the extensions)                                                                                                                                     | ✅                                           |
| CLI tools (version and path, install or update to a version chosen in a picker, remove once confirmed, progress, the error of a failure)                                                                                | ✅                                           |
| Experimental features (master switch + properties, share feedback)                                                                                                                                                      | ✅                                           |
| Theme (light / dark / system) applied                                                                                                                                                                                   | ✅ (follows the setting; no settings UI yet) |
| Renderer v2 itself is switched by the experimental `rendererV2.enabled` setting                                                                                                                                         | ✅                                           |

## Onboarding and welcome

| Feature                                                                                                                                                       | v2  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Welcome screen on first run: the telemetry opt-in only                                                                                                        | ☐   |
| Onboarding wizard (global multi-extension and per extension; steps with `when`, completion events, commands, embedded forms, skip/retry/cancel, saved status) | ✕   |

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
| Notifications box (markdown, actions, dismiss)                                                                                        | ✅         |
| Release notes banner (dismiss, learn more, update)                                                                                    | ☐          |
| Learning center (guides carousel)                                                                                                     | ☐          |
| Providers section per provider state (not installed, installed, starting, configured, ready, stopped; install / initialize with logs) | ☐          |
| Experimental system overview (health, connection cards, CPU / memory / disk usage)                                                    | ☐          |

## Application shell

| Feature                                                                                                                                                     | v2                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Navigation: explorer of the selected engine                                                                                                                 | ✅ (different model from v1 nav bar) |
| Navigation for non-engine areas (extensions, settings, webviews, accounts)                                                                                  | ☐                                    |
| Navigation entries contributed by extensions, hideable entries                                                                                              | ☐                                    |
| Title bar, window controls (Windows / Linux), macOS spacing                                                                                                 | ✅                                   |
| Title bar: back / forward history (keyboard shortcuts, long-press list)                                                                                     | ☐                                    |
| Title bar text from main (`getTitleBarText`)                                                                                                                | ☐                                    |
| Tabs, preview tabs, panel with sessions, resizable layout                                                                                                   | ✅ (new in v2)                       |
| Navigation requests from main (protocol links, notifications: `NavigationPage` → view)                                                                      | ☐                                    |
| Command palette (commands, documentation, go to; Ctrl/Cmd+Shift+P, F1, Ctrl/Cmd+K)                                                                          | ☐                                    |
| Status bar entries contributed by extensions / main                                                                                                         | ☐                                    |
| Status bar: task indicator (running tasks, opens the tasks)                                                                                                 | ✅                                   |
| Status bar: pinned provider widgets                                                                                                                         | ☐                                    |
| Task manager (running / completed tasks, view, cancel, clear), in the panel                                                                                 | ✅                                   |
| Toasts: failures of the actions, task toasts (setting tasks.Toast: running, then success / failure / canceled)                                              | ✅                                   |
| Dialogs requested by extensions / main: message box (markdown, type icon, cancel / default buttons, dropdown buttons, queued)                               | ✅                                   |
| Dialogs requested by extensions / main: input box (validation, password, multiline, selection), quick pick (filter, details, pick many, highlight callback) | ✅                                   |
| Dialogs requested by extensions / main: custom pick (cards with markdown and details, one or several selected)                                              | ✅                                   |
| Markdown rendering: links opened in the browser, image directive                                                                                            | ✅                                   |
| Markdown directives: buttons and links running commands (busy while running, failures in a toast), button links                                             | ✅                                   |
| Markdown directives: warnings, expandable sections (used by the onboarding)                                                                                 | ✕                                    |
| Troubleshooting (engine checks and reconnect, repair/cleanup, console logs, gather logs, stores)                                                            | ☐                                    |
| Help menu, feedback (direct and GitHub issue)                                                                                                               | ☐                                    |
| Accounts menu (sign in / out)                                                                                                                               | ☐                                    |
| Keyboard: back/forward, Esc closes popups; v2 has ` (panel) and Ctrl+B (explorer)                                                                           | ◐                                    |
