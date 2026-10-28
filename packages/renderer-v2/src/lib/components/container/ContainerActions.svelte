<script lang="ts">
import type { ContainerInfo } from '@desktop-framework/api';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import TextAlignStartIcon from '@lucide/svelte/icons/text-align-start';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import { getApp } from '#lib/app.svelte.js';
import type { ResourceAction } from '#lib/components/actions.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import { viewRef } from '#lib/views/index.js';

interface Props {
  container: ContainerInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { container, placement = 'row' }: Props = $props();

const app = getApp();

let actions: ResourceAction[] = $derived.by((): ResourceAction[] => {
  const { engineId, Id: containerId } = container;
  const running = container.State === 'running';
  return [
    running
      ? {
          label: 'Stop',
          icon: SquareIcon,
          filled: true,
          run: (): Promise<void> => window.stopContainer(engineId, containerId),
        }
      : {
          label: 'Start',
          icon: PlayIcon,
          filled: true,
          run: (): Promise<void> => window.startContainer(engineId, containerId),
        },
    {
      label: 'Delete',
      icon: Trash2Icon,
      destructive: true,
      disabled: running,
      run: (): Promise<void> => window.deleteContainer(engineId, containerId),
    },
    {
      label: 'Restart',
      icon: RotateCwIcon,
      disabled: !running,
      run: (): Promise<void> => window.restartContainer(engineId, containerId),
    },
    {
      label: 'Logs',
      icon: TextAlignStartIcon,
      run: (): void => app.workbench.open(viewRef('container-logs', { engineId, containerId })),
    },
    {
      label: 'Terminal',
      icon: TerminalIcon,
      disabled: !running,
      run: (): void => app.workbench.open(viewRef('container-terminal', { engineId, containerId })),
    },
  ];
});
</script>

<ResourceActions {actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
