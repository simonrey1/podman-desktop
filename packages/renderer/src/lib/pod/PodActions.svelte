<script lang="ts">
import {
  faArrowsRotate,
  faExternalLinkSquareAlt,
  faFileCode,
  faPlay,
  faRocket,
  faStop,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { DropdownMenu } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import { router } from 'tinro';

import ContributionActions from '/@/lib/actions/ContributionActions.svelte';
import { withConfirmation } from '/@/lib/dialogs/messagebox-utils';
import {
  type PodInfoOverride,
  podsInfoUiOverrides,
  type TransientStatus,
} from '/@/state/pods-info-ui-overrides.svelte';
import type { Menu } from '/@api/menu.js';
import { MenuContext } from '/@api/menu-context.js';

import { ContainerUtils } from '../container/container-utils';
import FlatMenu from '../ui/FlatMenu.svelte';
import ListItemButtonIcon from '../ui/ListItemButtonIcon.svelte';
import type { PodInfoUI } from './PodInfoUI';

export let pod: PodInfoUI;
export let dropdownMenu = false;
export let detailed = false;

let contributions: Menu[] = [];
onMount(async () => {
  contributions = await window.getContributedMenus(MenuContext.DASHBOARD_POD);
});

let urls: Array<string> = [];
$: openingUrls = urls;

const portRegexp = RegExp(/:(\d+)/);

function extractPort(urlString: string): number | undefined {
  const match = portRegexp.exec(urlString);
  return match ? parseInt(match[1], 10) : undefined;
}

onMount(async () => {
  const containerUtils = new ContainerUtils();

  const containerIds = pod.containers.map(podContainer => podContainer.Id);
  const podContainers = (await window.listContainers()).filter(
    container => containerIds.findIndex(containerInfo => containerInfo === container.Id) >= 0,
  );

  podContainers.forEach(container => {
    const openingUrls = containerUtils.getOpeningUrls(container);
    urls = [...new Set([...urls, ...openingUrls])];
  });
});

function inProgress(state: TransientStatus): void {
  const overrides: PodInfoOverride = {
    actionInProgress: true,
    // reset error when starting task
    actionError: '',
  };

  if (state) {
    overrides.status = state;
  }

  podsInfoUiOverrides.value[pod.id] = overrides;
}

function handleError(errorMessage: string): void {
  podsInfoUiOverrides.value[pod.id] = { status: 'ERROR', actionError: errorMessage };
}

async function startPod(): Promise<void> {
  inProgress('STARTING');
  try {
    await window.startPod(pod.engineId, pod.id);
  } catch (error) {
    handleError(String(error));
  }
}

async function restartPod(): Promise<void> {
  inProgress('RESTARTING');
  try {
    await window.restartPod(pod.engineId, pod.id);
  } catch (error) {
    handleError(String(error));
  }
}

async function stopPod(): Promise<void> {
  inProgress('STOPPING');
  try {
    await window.stopPod(pod.engineId, pod.id);
  } catch (error) {
    handleError(String(error));
  }
}

async function deletePod(): Promise<void> {
  inProgress('DELETING');
  try {
    await window.removePod(pod.engineId, pod.id);
  } catch (error) {
    handleError(String(error));
  }
}

function openGenerateKube(): void {
  router.goto(`/pods/podman/${encodeURI(pod.name)}/${encodeURIComponent(pod.engineId)}/kube`);
}

function deployToKubernetes(): void {
  router.goto(`/deploy-to-kube/${pod.id}/${pod.engineId}`);
}
// If dropdownMenu = true, we'll change style to the imported dropdownMenu style
// otherwise, leave blank.
let actionsStyle: typeof DropdownMenu | typeof FlatMenu;
if (dropdownMenu) {
  actionsStyle = DropdownMenu;
} else {
  actionsStyle = FlatMenu;
}
</script>

<ListItemButtonIcon
  title="Start Pod"
  onClick={startPod}
  hidden={pod.status === 'RUNNING' || pod.status === 'STOPPING'}
  detailed={detailed}
  inProgress={pod.actionInProgress && pod.status === 'STARTING'}
  icon={faPlay} />
<ListItemButtonIcon
  title="Stop Pod"
  onClick={stopPod}
  hidden={!(pod.status === 'RUNNING' || pod.status === 'STOPPING')}
  detailed={detailed}
  inProgress={pod.actionInProgress && pod.status === 'STOPPING'}
  icon={faStop} />
<ListItemButtonIcon
  title="Delete Pod"
  onClick={(): void => withConfirmation(deletePod, `delete pod ${pod.name}`)}
  icon={faTrash}
  detailed={detailed}
  inProgress={pod.actionInProgress && pod.status === 'DELETING'} />

<!-- If dropdownMenu is true, use it, otherwise just show the regular buttons -->
<svelte:component this={actionsStyle}>
  {#if !detailed}
    <ListItemButtonIcon
      title="Generate Kube"
      onClick={openGenerateKube}
      menu={dropdownMenu}
      detailed={detailed}
      icon={faFileCode} />
  {/if}
  <ListItemButtonIcon
    title="Deploy to Kubernetes"
    onClick={deployToKubernetes}
    menu={dropdownMenu}
    detailed={detailed}
    icon={faRocket} />
  {#if openingUrls.length === 0}
    <ListItemButtonIcon
      title="Open Exposed Port"
      menu={dropdownMenu}
      enabled={false}
      hidden={dropdownMenu}
      detailed={detailed}
      icon={faExternalLinkSquareAlt} />
  {:else if openingUrls.length === 1}
    <ListItemButtonIcon
      title="Open {extractPort(openingUrls[0])}"
      onClick={(): Promise<void> => window.openExternal(openingUrls[0])}
      menu={dropdownMenu}
      enabled={pod.status === 'RUNNING'}
      hidden={dropdownMenu}
      detailed={detailed}
      icon={faExternalLinkSquareAlt} />
  {:else if openingUrls.length > 1}
    <DropdownMenu icon={faExternalLinkSquareAlt} hidden={dropdownMenu} shownAsMenuActionItem={true}>
      {#each openingUrls as url, index (index)}
        <ListItemButtonIcon
          title="Open {extractPort(url)}"
          onClick={(): Promise<void> => window.openExternal(url)}
          menu={!dropdownMenu}
          enabled={pod.status === 'RUNNING'}
          hidden={dropdownMenu}
          detailed={detailed}
          icon={faExternalLinkSquareAlt} />
      {/each}
    </DropdownMenu>
  {/if}
  <ListItemButtonIcon
    title="Restart Pod"
    onClick={restartPod}
    menu={dropdownMenu}
    detailed={detailed}
    icon={faArrowsRotate} />
  <ContributionActions
    args={[pod]}
    contextPrefix="podItem"
    dropdownMenu={dropdownMenu}
    contributions={contributions}
    detailed={detailed}
    onError={handleError} />
</svelte:component>
