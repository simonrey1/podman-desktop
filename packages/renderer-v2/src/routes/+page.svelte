<script lang="ts">
import { Button } from '#lib/components/ui/button/index.js';
</script>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
  <h1 class="text-2xl font-semibold">Podman Desktop: renderer v2</h1>
  <p class="text-muted-foreground">
    Experimental renderer. Disable <code>rendererV2.enabled</code> in Settings, Experimental, then restart to switch back.
  </p>
  <Button href="#/">shadcn-svelte button</Button>
</main>
