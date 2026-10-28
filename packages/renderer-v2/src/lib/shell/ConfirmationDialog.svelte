<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
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
  <AlertDialog.Content size="sm">
    {#if request}
      <AlertDialog.Header>
        <AlertDialog.Title>{request.title}</AlertDialog.Title>
        <AlertDialog.Description>{request.message}</AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={(): void => confirmations.answer(false)}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          variant={request.destructive ? 'destructive' : 'default'}
          onclick={(): void => confirmations.answer(true)}>{request.confirmLabel}</AlertDialog.Action>
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
