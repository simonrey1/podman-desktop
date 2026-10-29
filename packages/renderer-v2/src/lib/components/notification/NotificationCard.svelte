<script lang="ts">
import type { NotificationCard } from '@desktop-framework/api';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import InfoIcon from '@lucide/svelte/icons/info';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import XIcon from '@lucide/svelte/icons/x';

import ActionButton from '#lib/components/ActionButton.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';

interface Props {
  notification: NotificationCard;
  onDismiss: () => void;
}

// a notification of the main process or an extension: its type, title, body and actions (markdown)
let { notification, onDismiss }: Props = $props();

const TYPES = {
  info: { icon: InfoIcon, class: 'text-primary', border: 'border-t-primary' },
  warn: { icon: TriangleAlertIcon, class: 'text-state-warning', border: 'border-t-state-warning' },
  error: { icon: CircleAlertIcon, class: 'text-destructive', border: 'border-t-destructive' },
};

let type = $derived(TYPES[notification.type] ?? TYPES.info);
</script>

<article class={['flex gap-3 rounded-lg border-t-2 bg-card p-4 text-card-foreground', type.border]} aria-label={notification.title}>
  <type.icon class={['size-5 shrink-0', type.class]} />
  <div class="flex min-w-0 flex-1 flex-col gap-2">
    <div class="flex items-start gap-2">
      <h3 class="flex-1 font-medium">{notification.title}</h3>
      <ActionButton icon={XIcon} label="Dismiss" size="icon-xs" onclick={onDismiss} />
    </div>
    {#if notification.body}
      <div class="text-muted-foreground">
        <Markdown markdown={notification.body} />
      </div>
    {/if}
    {#if notification.markdownActions}
      <Markdown markdown={notification.markdownActions} />
    {/if}
  </div>
</article>
