# Renderer v2: design decisions

The decisions taken for `packages/renderer-v2`, and the designs still open. What is done or missing is in
[FEATURE-PARITY.md](FEATURE-PARITY.md); where a view goes (section, tab, panel, dialog) is in
[docs/views.md](docs/views.md).

Status: **Decided** (applied, or to apply as written) · **Direction** (agreed, its design to detail) · **Proposed**
(to discuss before building)

## 1. Scope

**Decided.**

- Renderer v2 reaches the parity of v1 for the container engines, the settings and the shell, not for Kubernetes:
  Kubernetes moves to its own extension. Generate Kube and Podman kube play stay, as Podman features.
- Rejected for now, not duplicated in v2: creating a container from an image or a Containerfile, the merged logs of
  a pod or a Compose project, the onboarding wizard (and its markdown directives), the set-up pages of the providers,
  the provider details page, the Resources page of the settings.
- The welcome screen of the first run is the telemetry opt-in only.

## 2. Shell

**Decided.**

- The explorer lists the resources of one **container engine**, chosen in its dropdown ("Container engines"); the
  dashboard and the settings are not about an engine.
- The content is in **tabs** (preview tabs, kept open once used, restored after a restart) and in the **panel**
  (sessions: logs, terminals, TTYs, build outputs). The rules are in [docs/views.md](docs/views.md).
- The explorer keeps its width in pixels, 14rem by default (the width of the navigation of the settings); the editor
  takes the rest when the window is resized.

## 3. Resources (providers and connections)

**Decided.**

- A provider registers connections of three kinds: container engines, Kubernetes clusters, virtual machines. They are
  shown once, in the **system overview of the dashboard**, by kind, with their provider, version or VM type, status or
  error, and CPU / memory / disk usage, under the health of the system. The CLI-only providers (kubectl, Compose,
  bootc...) are not resources: their versions are in Settings › CLI tools.
- A container engine opens its **overview** (the Overview entry of the explorer): its resources, and the details and
  the lifecycle of its connection. A Kubernetes cluster or a VM opens a simple overview of its details: v2 has no views
  of their resources (see 8).
- A connection is created with **+ Add resource** in a **tab** (it takes a while, its output matters, it can fail and
  be tried again: its output is a session of the panel, as a build) and edited in a **modal**, both generated from the
  properties of its provider. The set-up of a provider (e.g. Podman not installed) is the notification of its extension on the dashboard.
- A form tab (a connection, Build, Run, Kube play) stays mounted while another tab is shown: its values and its last
  creation are kept. Each attempt of a creation has its own output session. The task of a creation goes back to its
  form and to the output of this attempt, even if the form was closed (with the values of this creation, unless it
  succeeded).
- A connection has one id, `<provider id>.<kind>.<name>`; a container connection also has the id of its engine,
  `<provider id>.<name>`, the one its resources carry.

## 4. Settings

**Decided.**

- One Settings tab (from the explorer): the pages of their own first (Proxy, Registries, Authentication, CLI tools,
  Docker compatibility once enabled), the experimental features, then a page per configuration section and node.
- The search is in the header, as on the other pages, and finds the settings and the pages (by their name or what
  they are about).
- A setting is written as it is changed; the terminal settings apply to the open terminals, the look of v2 while a
  setting keeps its default.

## 5. Components and look

**Decided.**

- shadcn-svelte components, compact (fields and buttons 28px high, 1px focus ring), the theme colors of Podman
  Desktop; a select is a menu of the theme (`ChoiceSelect`), never a native select; one tooltip for the application.
- Dialogs for short forms (sizes `sm` / `md`); the long forms are tabs which keep their values after a failure.

## 6. Performance

**Decided.** The experience must stay seamless: no freeze, even a short one.

- Budget: no long task (above 50 ms) when opening or switching a view, 60 frames per second when scrolling; measured
  in the running application (long tasks, profile, trace) before and after a change.
- No component tree per row of a list: one tooltip for the application, the menus of a row created when opened, the
  rows of a table **virtualized** (`@tanstack/virtual-core`, driven by runes in `VirtualRows`).
- The lists are kept alive; a view kept alive and hidden skips its rendering (`content-visibility`).
- A value read from a list is derived on its primitives (an id, a status), not on the objects replaced at each reload.

## 7. Verification

**Decided.** A change is tested in a running application before it is reported done, in a test instance of its own
(its own home and Electron user data directories), never in the application of the developer.

## 8. Extensions contributing to what the explorer browses

**Direction** for the targets, **Proposed** for the rest. Phase 9 and beyond: the Kubernetes dashboard, the quadlets
and the other extensions whose content belongs to a connection.

### What exists

- No contribution point scopes an entry, a view or a webview to a connection: `contributes` has `configuration`,
  `commands`, `menus`, `icons`, `themes`, `views` (row decorations only), `onboarding`, `features`. A webview is one
  global entry.
- A `KubernetesProviderConnection` has a name, an API URL, a lifecycle and a status: no link to a kubeconfig
  context. kind registers `https://localhost:<port>`; the context it writes is `kind-<name>`.
- The Kubernetes contexts and dashboard extensions work from the kubeconfig only, not from the provider connections;
  the dashboard is one webview whose pages are relative to the current context, and cannot be opened on a given
  context, namespace or resource from outside.
- The quadlet extension keeps its quadlets per Podman connection; its list shows all of them, with a filter.

### Kubernetes: what is browsed is not a provider connection

A provider connection is what a provider runs and manages (its lifecycle); a kubeconfig context is a cluster one can
talk to. Registering a connection per context (by the contexts extension) would make connections without a
lifecycle, duplicate the clusters of kind or minikube, and need a merge somewhere.

Direction (agreed): Podman Desktop browses its container engines by default; what else can be browsed is the logic
of each extension (Kubernetes contexts, RHEL VMs, subscriptions...).

- **Provider connections stay their lifecycle**, in the system overview (create, start, stop, delete, usage).
- **The dropdown of the explorer lists targets**: what can be browsed, with an id, a kind, a label, an icon and a
  status. The container engines are targets of the core; the other targets are registered by extensions through a
  generic API, e.g. the contexts extension registers a target per kubeconfig context. Selecting a Kubernetes target
  makes its context the current one (the model of the dashboard).
- **The contexts extension links a context to the provider connection of its cluster** (its icon, its lifecycle):
  from a context name declared by the provider, else the server URL (host normalized: `localhost` is `127.0.0.1`).
  It needs `provider.getKubernetesConnections()` (and, optionally, `KubernetesProviderConnection.context`).
- No Kubernetes logic comes back into the core, and a cluster is listed once.

Alternative considered: the core links the connections to the contexts (an optional `context` on the connection, the
kubeconfig merged in the main process). Simpler for the extensions, but it brings Kubernetes back into the core, and
gives nothing to the other kinds of targets.

### Contributing to a target

- **Explorer entries**, in the manifest: an id, a title, an icon, a `when` on the target (e.g.
  `target.kind == 'container' && target.type == 'podman' && target.status == 'started'` for the quadlets,
  `target.kind == 'kubernetes'` for the dashboard), and a command run with the identity of the target.
- **Tabs**: with tabs, a webview is one tab for one target (e.g. the pods of a context, a deployment), not one webview
  for an extension routing itself. The host asks the extension for it (a webview provider resolving a panel for a
  target, again after a restart), and a webview opens another tab through the host (preview or kept open).
- **Native lists** (to weigh against the cost of a webview per tab: each one loads the whole frontend of its
  extension): the extension gives the columns, the rows and the actions of a list, the host renders it as its other
  lists (virtualized, the same look); the details, the forms and the custom pages stay webview tabs. Drafted in
  [docs/draft-extension-data-views.md](docs/draft-extension-data-views.md).

### Open questions

1. Webview tabs only, or native lists with webview details (the cost of a webview tab to measure first)?
2. The name and the shape of the targets API, and who registers the container engines (the core, as today).
3. Whether `KubernetesProviderConnection.context` is worth adding, or the server URL is enough.
4. The first adopter: the quadlets (a list per Podman connection) to validate explorer entries and webview tabs,
   before the Kubernetes dashboard (which also needs to serve a context that is not the current one).
