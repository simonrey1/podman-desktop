<script lang="ts">
import { onMount } from 'svelte';

import { App, setApp } from '#lib/app.svelte.js';
import * as Tooltip from '#lib/components/ui/tooltip/index.js';
import AppShell from '#lib/shell/AppShell.svelte';

// the views are not routes: the workbench shows several of them at once, in its tab groups
const app = setApp(new App());
onMount(() => app.start());
</script>

<!-- every tooltip of the application, including the ones in the dialogs and the menus (rendered in portals) -->
<Tooltip.Provider delayDuration={300}>
  <AppShell />
</Tooltip.Provider>
