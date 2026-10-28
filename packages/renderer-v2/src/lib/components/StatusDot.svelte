<script lang="ts">
import * as Tooltip from '#lib/components/ui/tooltip/index.js';

import { STATUS_GLYPHS, UNKNOWN_GLYPH } from './status-glyphs.js';

interface Props {
  /** a state (container, pod, engine), or `used` / `unused` for the resources used by containers */
  status: string;
  /** the tooltip, by default the status */
  label?: string;
  /** md: 12px (tables, headers), sm: 10px (inline with captions) */
  size?: 'sm' | 'md';
  /** next to a visible status text (e.g. in a menu): no tooltip, hidden from the screen readers */
  decorative?: boolean;
}

let { status, label, size = 'md', decorative = false }: Props = $props();

// the size is important: the containers of the dot (e.g. the sidebar buttons) size their icons
// the states of the engines and of the resources, mapped to the glyphs and the colors of Podman Desktop
const ALIASES: Record<string, string> = {
  started: 'running',
  healthy: 'running',
  used: 'running',
  unhealthy: 'degraded',
  unused: 'stopped',
  error: 'dead',
};

let glyph = $derived(ALIASES[status.toLowerCase()] ?? status.toLowerCase());
let path = $derived(STATUS_GLYPHS[glyph] ?? UNKNOWN_GLYPH);
let color = $derived(glyph in STATUS_GLYPHS ? `var(--pd-status-${glyph})` : 'var(--pd-status-unknown)');
let text = $derived(label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase());
</script>

{#snippet dot(props: Record<string, unknown>)}
  <svg
    {...props}
    class={['shrink-0', size === 'sm' ? 'size-2.5!' : 'size-3!']}
    viewBox="0 0 12 12"
    role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : text}
    aria-hidden={decorative ? true : undefined}>
    <path fill={color} d={path} />
  </svg>
{/snippet}

{#if decorative}
  {@render dot({})}
{:else}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        {@render dot(props)}
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>{text}</Tooltip.Content>
  </Tooltip.Root>
{/if}
