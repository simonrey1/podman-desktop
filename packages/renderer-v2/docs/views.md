# Where a view goes: section, tab, panel or dialog

Renderer v2 has four containers for what the user looks at or does. Each answers a different need: pick the
container from the questions below, not from the size of the content.

| Container                     | Use it for                                                                                                   | Examples                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Section** of a details view | A facet of the resource: same title and actions, cheap to load, read-only                                    | Summary, History, Inspect, Kube                          |
| **Editor tab** (a view)       | A task or an exploration with a subject of its own, and a state worth keeping while the user looks elsewhere | lists, details, Build, Run, Kube play, Files of an image |
| **Panel session**             | Something that goes on over time, watched while doing something else, possibly several at once               | logs, terminal, TTY, build output                        |
| **Dialog**                    | A short input, done in one go, blocking until it is done                                                     | create a volume, a network or a pod; pull; push; edit    |

## Section or tab

1. **Is it about the resource, or a job of its own?** "What is the platform of this image?" is a facet of the image.
   "What did each layer add?" is an exploration that starts from the image.
2. **Would leaving it cost something?** A section is unmounted when another one is shown: what it loaded is lost.
   Something that takes more than a second or two to load, or can be canceled, is a tab (with `keepAlive` when it
   must survive another tab being shown).
3. **Does it have a state of its own?** A selection, expanded nodes, filters, a toolbar or a layout of several panes
   make a view, not a facet.
4. **Do the actions of the header still apply?** Delete, Push or Run belong next to Inspect, not next to a file
   browser.
5. **Is it opened from several places, or linked to?** It then needs an identity of its own: a tab title (e.g.
   "Files of nginx") and an action (in the row, in the details) opening it. Its header links back to the resource it
   is about (the `parent` of `Page`, e.g. `nginx › Files`).
6. **Is it watched next to the resource, or several at once?** When it also changes over time, it is a panel
   session.

Rule of thumb: if coming back to it should find it as it was left, it is a tab; if it can be rebuilt at once, it is a
section.

## Tab or dialog

A form is a dialog when it is short (a few fields, no long list or editor), when nothing has to be looked up
elsewhere while filling it, and when its result is immediate or goes on in the background (a task, a toast). It is a
tab when it is long or has sections, when the user may switch to another view while filling it, or when its
operation takes a while and its output matters: the form then stays open with its values (a failure loses nothing)
and links to the result.

## Panel sessions

A session streams: the output of a build, the logs of a container, a shell. It keeps running while hidden
(`keepAlive`), and opens once per click when several make sense (`instances: 'multiple'`, e.g. shells), else once per
resource (e.g. the TTY of a container, which cannot be detached).

## Applied

- History, Inspect and Kube are sections: cheap, read-only facets, regenerated at once.
- The files of an image are a tab: reading the layers is long and can be canceled, the selected layer and the
  expanded directories are a state of their own, the layout has two panes, and the actions of the image do not apply.
- Build, Run and Kube play are tabs: long forms whose operation takes a while; their output, when it streams, is a
  panel session.
- Pull, push and the creation of volumes, networks, pods and secrets are dialogs: short, and their result is a task or
  a toast.
