<script lang="ts">
import { onMount } from 'svelte';

import { App, setApp } from '#lib/app.svelte.js';
import AppShell from '#lib/shell/AppShell.svelte';

// the views are not routes: the workbench shows several of them at once, in its tab groups
const app = setApp(new App());
onMount(() => app.start());
</script>

<AppShell />
