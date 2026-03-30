<style>
.pd-linear-progress::-webkit-progress-bar {
  background-color: var(--pd-linear-progress-track, transparent);
  border-radius: 9999px;
}

/* Determinate */
.pd-linear-progress::-webkit-progress-value {
  background-color: currentColor;
  transition: width 0.2s;
  border-radius: 9999px;
}

.pd-linear-progress::-ms-fill {
  border: none;
  background-color: currentColor;
  transition: width 0.2s;
}

/* Indeterminate */
.pd-linear-progress:indeterminate {
  background-size: 200% 100%;
  background-image: linear-gradient(
    to right,
    transparent 50%,
    currentColor 50%,
    currentColor 60%,
    transparent 60%,
    transparent 71.5%,
    currentColor 71.5%,
    currentColor 84%,
    transparent 84%
  );
  animation: pd-linear-progress-indeterminate 2s infinite linear;
}

.pd-linear-progress:indeterminate::-ms-fill {
  animation-name: none;
}

@keyframes pd-linear-progress-indeterminate {
  0% {
    background-size: 200% 100%;
    background-position: left -31.25% top 0%;
  }
  50% {
    background-size: 800% 100%;
    background-position: left -49% top 0%;
  }
  100% {
    background-size: 400% 100%;
    background-position: left -102% top 0%;
  }
}
</style>

<script lang="ts">
interface Props {
  value?: number;
  class?: string;
  style?: string;
}

let { value, class: className = 'w-full h-0.5 text-purple-500', style }: Props = $props();
</script>

<progress
  class="appearance-none border-none rounded-full pd-linear-progress {className}"
  {style}
  value={value}
  max={value !== undefined ? 100 : undefined}
></progress>
