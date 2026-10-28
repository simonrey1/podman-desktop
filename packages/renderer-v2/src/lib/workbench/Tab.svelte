<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';
import XIcon from '@lucide/svelte/icons/x';
import type { Attachment } from 'svelte/attachments';
import type { HTMLAttributes } from 'svelte/elements';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: LucideIcon;
  title: string;
  tooltip?: string;
  active: boolean;
  /** a preview tab has an italic title */
  preview?: boolean;
  closable?: boolean;
  onSelect: () => void;
  onPin?: () => void;
  onClose?: () => void;
}

// one tab component for the editor and for the panel: 32px strip, 16px icon, 12px label, 2px accent bar
let {
  icon: Icon,
  title,
  tooltip,
  active,
  preview = false,
  closable = true,
  onSelect,
  onPin,
  onClose,
  ...restProps
}: Props = $props();

function onauxclick(event: MouseEvent): void {
  // middle click closes the tab
  if (event.button === 1 && closable) {
    onClose?.();
  }
}

// the strip scrolls when the tabs do not fit: the tab becoming active is scrolled into view
const reveal: Attachment<HTMLElement> = element => {
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

function onkeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect();
  } else if (event.key === 'Delete' && closable) {
    onClose?.();
  }
}
</script>

<div
  {...restProps}
  {@attach active ? reveal : undefined}
  role="tab"
  tabindex="0"
  aria-selected={active}
  title={tooltip ?? title}
  class={[
    'group/tab relative flex h-full max-w-50 shrink-0 cursor-pointer items-center gap-1.5 pr-1.5 pl-3 outline-none focus-visible:bg-muted',
    active ? 'text-tab-active-foreground' : 'text-tab-foreground hover:bg-muted hover:text-tab-active-foreground',
  ]}
  onclick={onSelect}
  ondblclick={onPin}
  {onauxclick}
  {onkeydown}>
  <Icon class="size-4 shrink-0" />
  <span class={['truncate', preview && 'italic']}>{title}</span>
  {#if closable}
    <button
      tabindex="-1"
      aria-label="Close {title}"
      class={[
        'flex size-4 shrink-0 items-center justify-center rounded-sm hover:bg-accent',
        active ? 'visible' : 'invisible group-hover/tab:visible',
      ]}
      onclick={(event): void => {
        event.stopPropagation();
        onClose?.();
      }}>
      <XIcon class="size-3" />
    </button>
  {:else}
    <span class="w-1"></span>
  {/if}
  {#if active}
    <span class="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-tab-highlight"></span>
  {/if}
</div>
