<script lang="ts">
import { getApp } from '#lib/app.svelte.js';

interface Props {
  /** an image (a data URI, a URL), or one for each theme: the icon of a registry, of an extension... */
  icon: string | { light: string; dark: string };
  /** the accessible name; decorative when not given */
  label?: string;
  class?: string;
}

// an icon given as an image by an extension, the one of the theme when there are two
let { icon, label, class: className = 'size-5' }: Props = $props();

const app = getApp();

let src = $derived(typeof icon === 'string' ? icon : app.theme.isDark ? icon.dark : icon.light);
</script>

<img {src} alt={label ?? ''} aria-hidden={label ? undefined : true} class={['shrink-0 object-contain', className]} />
