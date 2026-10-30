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
  info: { icon: InfoIcon, class: 'border-primary/30 bg-primary/5', iconClass: 'text-primary' },
  warn: {
    icon: TriangleAlertIcon,
    class: 'border-state-warning/30 bg-state-warning/5',
    iconClass: 'text-state-warning',
  },
  error: { icon: CircleAlertIcon, class: 'border-destructive/30 bg-destructive/5', iconClass: 'text-state-error' },
};

let type = $derived(TYPES[notification.type] ?? TYPES.info);
</script>

<!-- compact, like an alert: the text takes the room, the actions are on the right -->
<article class={['flex items-start gap-3 rounded-lg border px-4 py-3', type.class]} aria-label={notification.title}>
  <type.icon class={['mt-0.5 size-4 shrink-0', type.iconClass]} />
  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <h3 class="font-medium">{notification.title}</h3>
    {#if notification.body}
      <div class="text-muted-foreground">
        <Markdown markdown={notification.body} />
      </div>
    {/if}
  </div>
  {#if notification.markdownActions}
    <div class="shrink-0">
      <Markdown markdown={notification.markdownActions} />
    </div>
  {/if}
  <ActionButton icon={XIcon} label="Dismiss" size="icon-xs" onclick={onDismiss} />
</article>
