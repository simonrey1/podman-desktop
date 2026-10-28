<script lang="ts">
import * as Empty from '#lib/components/ui/empty/index.js';

// the body of a details page whose resource is gone, e.g. deleted
let { noun }: { noun: string } = $props();
</script>

<Empty.Root>
  <Empty.Header>
    <Empty.Title>{noun} not found</Empty.Title>
    <Empty.Description>It may have been deleted.</Empty.Description>
  </Empty.Header>
</Empty.Root>
