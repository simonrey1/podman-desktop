<script lang="ts">
import type { TelemetryMessages } from '@desktop-framework/api';

import { whenExtensionsStarted } from '#lib/api/events.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Switch } from '#lib/components/ui/switch/index.js';

// the first run: telemetry is asked once (as v1 asks it), with the messages of the main process; the choice is saved
// when the dialog closes, whatever closes it
let messages: TelemetryMessages | undefined = $state.raw();
let open = $state(false);
let telemetry = $state(true);

whenExtensionsStarted()
  .then(() => window.getConfigurationValue<boolean>('telemetry.check'))
  .then(async prompted => {
    if (!prompted) {
      messages = await window.getTelemetryMessages();
      open = true;
    }
  })
  .catch((error: unknown) => console.error('Error reading the telemetry choice', error));

async function save(): Promise<void> {
  await window.updateConfigurationValue('telemetry.enabled', telemetry, 'DEFAULT');
  if (telemetry) {
    await window.telemetryConfigure();
  }
  // asked once
  await window.updateConfigurationValue('telemetry.check', true, 'DEFAULT');
}

function close(): void {
  open = false;
  save().catch((error: unknown) => console.error('Error saving the telemetry choice', error));
}
</script>

<Dialog.Root
  bind:open={(): boolean => open, (next: boolean): void => {
    if (!next) {
      close();
    }
  }}>
  <Dialog.Content size="sm">
    <Dialog.Header>
      <Dialog.Title>Welcome to Podman Desktop</Dialog.Title>
      <Dialog.Description>You can change this choice later in Settings › Preferences › Telemetry.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Body>
      <Field.Field orientation="horizontal">
        <Field.Content>
          <Field.Label for="welcome-telemetry">Telemetry</Field.Label>
          <Field.Description>
            {messages?.acceptMessage ?? 'Help us improve by allowing anonymous usage data to be collected.'}
            {#if messages?.info}
              {@const info = messages.info}
              <button
                type="button"
                class="text-primary hover:underline"
                onclick={(): void => {
                  window.openExternal(info.url).catch(console.error);
                }}>{info.link}</button>
            {/if}
          </Field.Description>
        </Field.Content>
        <Switch id="welcome-telemetry" bind:checked={telemetry} />
      </Field.Field>
    </Dialog.Body>
    <Dialog.Footer>
      <Button onclick={close}>Continue</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
