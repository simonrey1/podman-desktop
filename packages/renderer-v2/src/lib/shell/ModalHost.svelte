<script lang="ts">
import { getApp } from '#lib/app.svelte.js';

// the modal opened by an action: a new one replaces it
const app = getApp();

let modal = $derived(app.modals.current);
</script>

{#if modal}
  {@const Modal = modal.component}
  <Modal {...modal.props} onClose={(): void => app.modals.close()} />
{/if}
