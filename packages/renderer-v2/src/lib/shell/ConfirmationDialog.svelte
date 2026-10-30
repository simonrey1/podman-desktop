<script lang="ts">
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import XIcon from '@lucide/svelte/icons/x';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';

// the confirmation asked by an action (e.g. Delete), answered no when the dialog is dismissed
const app = getApp();
const confirmations = app.confirmations;

let request = $derived(confirmations.current);
</script>

<AlertDialog.Root
  open={!!request}
  onOpenChange={(open): void => {
    if (!open) {
      confirmations.answer(false);
    }
  }}>
  <AlertDialog.Content>
    {#if request}
      <AlertDialog.Header>
        {#if request.destructive}
          <AlertDialog.Media>
            <TriangleAlertIcon class="text-state-error" />
          </AlertDialog.Media>
        {/if}
        <AlertDialog.Title>{request.title}</AlertDialog.Title>
        <ActionButton icon={XIcon} label="Close" size="icon-sm" onclick={(): void => confirmations.answer(false)} />
      </AlertDialog.Header>
      <AlertDialog.Description>{request.message}</AlertDialog.Description>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={(): void => confirmations.answer(false)}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          variant={request.destructive ? 'destructive' : 'default'}
          onclick={(): void => confirmations.answer(true)}>{request.confirmLabel}</AlertDialog.Action>
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
