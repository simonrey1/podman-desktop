<script lang="ts">
import CheckIcon from '@lucide/svelte/icons/check';
import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import StatusDot from '#lib/components/StatusDot.svelte';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '#lib/components/ui/sidebar/index.js';

const app = getApp();

let engine = $derived(app.engines.selected);
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton {...props} size="lg">
            <span class="flex size-8 items-center justify-center rounded-md bg-muted">
              <ServerIcon />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-medium">{engine?.name ?? 'No engine'}</span>
              {#if engine}
                <!-- one line, truncated when the explorer is narrow -->
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <StatusDot size="sm" decorative status={engine.status} />
                  <span class="truncate">{engine.providerName} · {engine.status}</span>
                </span>
              {/if}
            </span>
            <ChevronsUpDownIcon class="ms-auto text-muted-foreground" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        <DropdownMenu.Label>Container engines</DropdownMenu.Label>
        {#each app.engines.all as item (item.id)}
          <DropdownMenu.Item onSelect={(): void => app.engines.select(item.id)}>
            <StatusDot decorative status={item.status} />
            <span class="truncate">{item.name}</span>
            <span class="text-muted-foreground">{item.providerName}</span>
            {#if item.id === engine?.id}
              <CheckIcon class="ms-auto" />
            {/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
