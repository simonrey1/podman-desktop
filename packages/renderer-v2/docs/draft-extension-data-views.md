# Draft: extensions contributing data, rendered by the host

Status: **draft**, an idea to discuss; not planned. The decisions it builds on are in
[../DESIGN-DECISIONS.md](../DESIGN-DECISIONS.md) (section 8: extensions contributing to what the explorer browses).

## The problem

An extension shows its content in a webview today: one page of its own, with its own frontend (often a whole Svelte
application), its own look, and its own navigation inside. With the tabs of renderer v2, the content of an extension
belongs in tabs: the pods of a cluster, a deployment, the quadlets of a Podman machine. A webview per tab costs: each
one is a separate page loading the whole frontend of its extension (memory, and hundreds of milliseconds to open), and
each one draws its tables with its own components, not the ones of the application (virtualized, with the same
actions, filters, selection and look).

Most of the content of the extensions is a list of resources (a table with columns, a status, actions, a filter), and
the details of one of them. The lists could be data, rendered by the host; the details, the forms and the custom pages
stay webviews.

## How VS Code does it: the tree views

VS Code has the same split: its extensions contribute **tree views** rendered by VS Code, and **webviews** for the
rest.

- **Declared in the manifest**: `contributes.viewsContainers` adds a container (e.g. an icon in the activity bar), and
  `contributes.views` adds views to a container, each with an `id`, a `name` and a `when` clause. VS Code shows the view
  before the extension is activated, and activates it (`onView:<id>`) when the view is shown.
- **The data comes from a provider**: the extension registers a `TreeDataProvider` for the id of the view
  (`window.registerTreeDataProvider(id, provider)`, or `window.createTreeView(id, { treeDataProvider })` to get a
  `TreeView` back):
  - `getChildren(element?)`: the children of an element, the roots without one; called lazily, when a node is
    expanded;
  - `getTreeItem(element)`: how an element is shown, as a `TreeItem`: `label`, `description` (muted, after the
    label), `tooltip`, `iconPath` (or a theme icon), `collapsibleState` (none, collapsed, expanded), `command` (run when
    the item is selected), `contextValue` (a string, for the menus), `resourceUri`;
  - `onDidChangeTreeData`: an event the provider fires with the elements changed (or none: everything), to refresh
    them;
  - optional: `getParent` (to reveal an element), `resolveTreeItem` (a tooltip resolved on hover), drag and drop.
- **Actions are menus with `when` clauses**: `contributes.menus` with `view/title` (the toolbar of the view:
  `view == <id>`) and `view/item/context` (the actions of an item: `view == <id> && viewItem == <contextValue>`),
  inline (icons on the row) or in the context menu, running commands which receive the element.
- **The `TreeView` object** lets the extension reveal and select an element, set a badge, a title, a message (e.g. an
  empty state), and know the selection and the visibility.

What VS Code gets from it: the views look the same in every extension, they are fast (rendered by the host, virtualized,
no web page per view), keyboard and accessibility come from the host, and the extension only writes data and commands.
What it does not do: tables (a tree item has a label and a description, not columns), and anything custom, which
stays a webview (a `WebviewView` can also be put in a view container).

## A proposal for Podman Desktop

The same split, for tables rather than trees:

- **Declared in the manifest**: the explorer entries of an extension (see the targets in the design decisions), each
  naming a **resource list** it provides, with a `when` on the target (e.g. `target.kind == 'kubernetes'`).
- **The data comes from a provider** registered by the extension for that list:
  - `columns`: an id, a title, a type (text, status, date, size, a link to another resource), a width, sortable;
  - `list(target)`: the rows of the target, each with an id, its values, its status, and a `contextValue` for its
    actions;
  - `onDidChange(target)`: the rows to read again (all, or some), as the resources change;
  - optional: `children(row)` for groups (e.g. the containers of a pod), a filter, the total.
- **Actions are menus with `when` clauses**, on the list (its header: e.g. Create) and on a row (its buttons and its
  menu, and the bulk actions of a selection), running commands which receive the rows.
- **Opening a row** runs a command, which can open a **webview tab** for it (its details), through the host (a webview
  provider resolving a panel for a target, see the design decisions), or another list.
- **The host renders** the list as its own lists: the same table (virtualized), filter, sort, selection, bulk actions,
  empty states, keyboard and look; the list is kept alive and refreshed by the events of the provider.

Example (sketch, not an API):

```ts
// package.json: contributes.explorer = [{ id: 'kubernetes.pods', title: 'Pods', icon: '${pod-icon}',
//   when: "target.kind == 'kubernetes'", list: 'kubernetes.pods' }]
resources.registerResourceListProvider('kubernetes.pods', {
  columns: [
    { id: 'status', type: 'status' },
    { id: 'name', title: 'Name', sortable: true },
    { id: 'namespace', title: 'Namespace', sortable: true },
    { id: 'age', title: 'Age', type: 'date', sortable: true },
  ],
  list: async target =>
    (await pods(target.id)).map(pod => ({
      id: pod.metadata.uid,
      status: pod.status.phase,
      values: { name: pod.metadata.name, namespace: pod.metadata.namespace, age: pod.metadata.creationTimestamp },
      contextValue: 'pod',
    })),
  onDidChange: podsChanged,
});
```

## Who would use it

- **Kubernetes dashboard**: the lists of resources (pods, deployments, services...), per context; the details, the
  logs, the YAML and the forms as webview tabs.
- **Quadlets**: the quadlets of a Podman connection; the editor of a quadlet as a webview tab.
- **Others** with lists of their own: VMs (RHEL VMs, bootc disk images), subscriptions, models and services (AI Lab).

## Cost and open questions

- A new API in the core (the manifest schema, the providers, their events, the menus of their rows), the rendering in
  renderer v2, and the extensions moving their lists to it: a long project, not committed.
- Before deciding: measure the cost of a webview tab (memory, time to open) against a native list, on a real list (the
  quadlets, or the pods of a cluster).
- Large lists: pages, or a window of the rows asked to the provider, rather than all the rows at once.
- The column types and the cell renderers the host offers (a status, a link to another resource, a badge), and what
  stays the extension's (nothing: a custom cell means a webview).
- Where the data runs: the provider is in the extension host; the rows cross the IPC at each change (to batch, and to
  keep small).
