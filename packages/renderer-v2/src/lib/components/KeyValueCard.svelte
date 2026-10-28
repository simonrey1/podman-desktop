<script lang="ts">
export interface KeyValue {
  label: string;
  value: string;
  /** monospace value, e.g. an ID or a command */
  mono?: boolean;
}

// a titled card of key/value rows (label column 160px, muted), e.g. the summary of a resource
let { title, rows, empty = 'None' }: { title: string; rows: KeyValue[]; empty?: string } = $props();
</script>

<section class="flex flex-col gap-3 rounded-lg bg-card p-4 text-base text-card-foreground">
  <h2 class="text-lg font-semibold">{title}</h2>
  {#if rows.length}
    <dl class="flex flex-col gap-2">
      {#each rows as row (row.label)}
        <div class="flex items-baseline gap-4">
          <dt class="w-40 shrink-0 truncate text-muted-foreground" title={row.label}>{row.label}</dt>
          <dd class={['min-w-0 break-all select-text', row.mono && 'font-mono text-sm']}>{row.value || '—'}</dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-muted-foreground">{empty}</p>
  {/if}
</section>
