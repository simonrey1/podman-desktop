<script lang="ts">
import type { Attachment } from 'svelte/attachments';

import { tooltipState } from '#lib/components/tooltip/tooltip.svelte.js';

// the tooltip of the application (see `tooltip`): above its element, below when there is no room, kept in the window

/** the distance between the element and the tooltip, and the margin of the window */
const GAP = 6;
const MARGIN = 4;

const place: Attachment<HTMLElement> = element => {
  const anchor = tooltipState.anchor;
  if (!anchor) {
    return;
  }
  // read once the text is rendered: the size of the tooltip is known
  const target = anchor.getBoundingClientRect();
  const { width, height } = element.getBoundingClientRect();
  const below = target.top - GAP - height < MARGIN;
  const center = target.left + target.width / 2;
  const left = Math.min(Math.max(center - width / 2, MARGIN), window.innerWidth - width - MARGIN);
  const top = below ? target.bottom + GAP : target.top - GAP - height;
  element.style.setProperty('--tooltip-x', `${left}px`);
  element.style.setProperty('--tooltip-y', `${top}px`);
  // the arrow points at the center of the element, even when the tooltip is pushed aside
  element.style.setProperty('--tooltip-arrow-x', `${center - left}px`);
  element.dataset.side = below ? 'bottom' : 'top';
};
</script>

{#if tooltipState.anchor && tooltipState.text}
  {#key tooltipState.anchor}
    <div
      role="tooltip"
      class="group pointer-events-none fixed top-(--tooltip-y) left-(--tooltip-x) z-50 w-fit max-w-xs animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-background fade-in-0 zoom-in-95"
      {@attach place}>
      {tooltipState.text}
      <div
        class="absolute left-(--tooltip-arrow-x) size-2.5 -translate-x-1/2 rotate-45 rounded-xs bg-foreground group-data-[side=bottom]:-top-1 group-data-[side=top]:-bottom-1">
      </div>
    </div>
  {/key}
{/if}
