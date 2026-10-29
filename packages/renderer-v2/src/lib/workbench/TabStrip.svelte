<script lang="ts">
import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

import { getApp } from '#lib/app.svelte.js';
import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
import { describeView } from '#lib/views/index.js';

import Tab from './Tab.svelte';
import type { TabGroup } from './tab-group.svelte.js';

let { group, label }: { group: TabGroup; label: string } = $props();

const app = getApp();

// a notch of the wheel (about 100px) scrolls the strip by about 40px, a part of a tab
const WHEEL_SPEED = 0.4;

// the strip has no scrollbar: the wheel of a mouse (vertical) scrolls it horizontally, a touchpad already can
const wheelScroll: Attachment<HTMLElement> = element =>
  on(
    element,
    'wheel',
    event => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && element.scrollWidth > element.clientWidth) {
        event.preventDefault();
        element.scrollLeft += event.deltaY * WHEEL_SPEED;
      }
    },
    // not passive: the page must not scroll too
    { passive: false },
  );
</script>

<div role="tablist" aria-label={label} class="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-none"
  {@attach wheelScroll}>
  {#each group.tabs as tab, index (tab.key)}
    {@const view = describeView(tab.ref, app)}
    <!-- the instances of a view opened several times are numbered from the second one -->
    {@const title = tab.instance > 1 ? `${view.title} (${tab.instance})` : view.title}
    {@const closable = group.isClosable(tab.key)}
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {#snippet child({ props })}
          <Tab
            {...props}
            icon={view.icon}
            {title}
            tooltip={view.context ? `${title} · ${view.context}` : title}
            active={tab.key === group.activeKey}
            preview={tab.preview}
            {closable}
            onSelect={(): void => group.activate(tab.key)}
            onPin={(): void => group.pin(tab.key)}
            onClose={(): void => group.close(tab.key)} />
        {/snippet}
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item disabled={!closable} onSelect={(): void => group.close(tab.key)}>Close</ContextMenu.Item>
        <ContextMenu.Item onSelect={(): void => group.closeOthers(tab.key)}>Close Others</ContextMenu.Item>
        <ContextMenu.Item
          disabled={index === group.tabs.length - 1}
          onSelect={(): void => group.closeToTheRight(tab.key)}>Close to the Right</ContextMenu.Item>
        <ContextMenu.Item onSelect={(): void => group.closeAll()}>Close All</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item disabled={!tab.preview} onSelect={(): void => group.pin(tab.key)}>Keep Open</ContextMenu.Item>
        {#if app.workbench.allowsInstances(tab)}
          <ContextMenu.Item onSelect={(): void => app.workbench.openInstance(tab)}>Open Another</ContextMenu.Item>
        {/if}
      </ContextMenu.Content>
    </ContextMenu.Root>
  {/each}
</div>
