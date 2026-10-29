<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';

import InputBox from './InputBox.svelte';
import QuickPick from './QuickPick.svelte';

// the quick picks and the input boxes asked by the extensions, under the title bar: Escape cancels
const app = getApp();
const pickers = app.pickers;

let picker = $derived(pickers.current);
</script>

<Dialog.Root
  open={!!picker}
  onOpenChange={(open): void => {
    if (!open) {
      pickers.cancel();
    }
  }}>
  <Dialog.Content
    placement="top"
    showCloseButton={false}
    interactOutsideBehavior={picker?.request.ignoreFocusOut ? 'ignore' : 'close'}
    aria-label={picker?.request.title ?? (picker?.kind === 'quick-pick' ? 'Pick an item' : 'Enter a value')}>
    <!-- a new component for each request: its state starts over -->
    {#key picker?.request.id}
      {#if picker?.kind === 'quick-pick'}
        <QuickPick
          request={picker.request}
          onPick={(indexes): void => pickers.pick(indexes)}
          onHighlight={(index): void => pickers.highlight(index)} />
      {:else if picker?.kind === 'input-box'}
        <InputBox
          request={picker.request}
          onEnter={(value): void => pickers.enter(value)}
          onValidate={(value): Promise<string | undefined> => pickers.validate(value)} />
      {/if}
    {/key}
  </Dialog.Content>
</Dialog.Root>
