<script lang="ts">
import StatusDot from '#lib/components/StatusDot.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';

// the status of a resource, next to its name (page headers, session headers)
let { status }: { status: string } = $props();
</script>

<Badge variant="outline">
  <StatusDot decorative {status} />
  {status}
</Badge>
