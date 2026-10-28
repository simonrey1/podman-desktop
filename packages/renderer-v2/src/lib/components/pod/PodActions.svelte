<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import ResourceActions from '#lib/components/ResourceActions.svelte';
import { type ActionTarget, type ResourceAction, resourceKey } from '#lib/stores/actions.svelte.js';

interface Props {
  pod: PodInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { pod, placement = 'row' }: Props = $props();

let target: ActionTarget = $derived({ key: resourceKey('pod', pod.engineId, pod.Id), name: pod.Name });

let actions: ResourceAction[] = $derived.by((): ResourceAction[] => {
  const { engineId, Id: podId } = pod;
  const running = pod.Status.toLowerCase() === 'running';
  return [
    running
      ? {
          label: 'Stop',
          progress: 'stopping',
          icon: SquareIcon,
          filled: true,
          run: (): Promise<void> => window.stopPod(engineId, podId),
        }
      : {
          label: 'Start',
          progress: 'starting',
          icon: PlayIcon,
          filled: true,
          run: (): Promise<void> => window.startPod(engineId, podId),
        },
    {
      label: 'Delete',
      progress: 'deleting',
      icon: Trash2Icon,
      destructive: true,
      run: (): Promise<void> => window.removePod(engineId, podId),
    },
    {
      label: 'Restart',
      progress: 'restarting',
      icon: RotateCwIcon,
      disabled: !running,
      run: (): Promise<void> => window.restartPod(engineId, podId),
    },
  ];
});
</script>

<ResourceActions {target} {actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
