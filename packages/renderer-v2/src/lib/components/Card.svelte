<script lang="ts">
import type { Snippet } from 'svelte';

// a titled card of a page: card background, 8px radius, 16px padding, no border
let { title, children }: { title: string; children: Snippet } = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg bg-card p-4 text-base text-card-foreground">
  <h2 class="text-lg font-semibold">{title}</h2>
  {@render children()}
</section>
