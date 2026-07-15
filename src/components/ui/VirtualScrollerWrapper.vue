<template>
  <!-- 
    Virtual Scrolling Wrapper - 100% backward compatible
    Falls back to normal rendering if virtual scrolling disabled
  -->
  <div v-if="!enableVirtual || items.length < threshold">
    <!-- Normal rendering (existing behavior) -->
    <slot :items="items" :virtual="false" />
  </div>
  
  <div v-else class="virtual-scroller-container">
    <!-- Virtual rendering (new behavior) -->
    <RecycleScroller
      class="scroller"
      :items="items"
      :item-size="itemSize"
      key-field="id"
      v-bind="$attrs"
    >
      <template #default="{ item }">
        <slot :items="[item]" :virtual="true" />
      </template>
    </RecycleScroller>
  </div>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

interface Props {
  items: any[]
  itemSize?: number
  threshold?: number
  enableVirtual?: boolean
}

withDefaults(defineProps<Props>(), {
  itemSize: 80, // Default height for transaction items
  threshold: 50, // Only virtualize if more than 50 items
  enableVirtual: true // Feature flag
})
</script>

<style scoped>
.virtual-scroller-container {
  height: 600px; /* Fixed height for virtual container */
  overflow: auto;
}

.scroller {
  height: 100%;
}

/* Fallback styling */
.scroller :deep(.vue-recycle-scroller__item-view) {
  padding: 0;
}
</style>
