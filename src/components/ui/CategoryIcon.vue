<template>
  <div 
    class="category-icon-wrapper"
    :class="sizeClass"
    :style="{ backgroundColor: fallbackColor || '#CBD5F5' }"
  >
    <component 
      v-if="icon && showIcon && iconComponent" 
      :is="iconComponent" 
      :size="iconSize" 
      class="category-icon__svg"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getIconComponent } from '@/utils/categoryIcons'

interface Props {
  icon?: string
  color?: string
  fallbackColor?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showIcon: true
})

// Use centralized icon mapping instead of local duplicate
const iconComponent = computed(() => {
  return getIconComponent(props.icon)
})

const sizeClass = computed(() => {
  const sizeMap = {
    xs: 'category-icon--xs',
    sm: 'category-icon--sm', 
    md: 'category-icon--md',
    lg: 'category-icon--lg',
    xl: 'category-icon--xl'
  }
  return sizeMap[props.size]
})

const iconSize = computed(() => {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  }
  return sizeMap[props.size]
})
</script>

<style scoped>
.category-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-icon__svg {
  color: white;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
}

/* Size variants */
.category-icon--xs {
  width: 16px;
  height: 16px;
}

.category-icon--sm {
  width: 20px;
  height: 20px;
}

.category-icon--md {
  width: 24px;
  height: 24px;
}

.category-icon--lg {
  width: 32px;
  height: 32px;
}

.category-icon--xl {
  width: 40px;
  height: 40px;
}
</style>
