<template>
  <div 
    ref="cardRef"
    class="category-card swipeable touch-feedback"
    :class="{ 'category-card--swiping': isSwiping }"
    :style="{ transform: `translateX(${swipeOffset}px)` }"
  >
    <!-- Delete action revealed on swipe -->
    <div class="category-card__delete-action" :class="{ 'visible': showDeleteAction }">
      <button 
        class="touch-target interactive"
        style="min-height: var(--touch-target-min);"
        @click="handleDelete"
        aria-label="Delete category"
      >
        🗑️ Delete
      </button>
    </div>

    <div class="category-card__content">
      <div class="category-card__header">
        <div class="category-card__info">
          <div class="category-card__swatch" :style="{ backgroundColor: category.colour || '#CBD5F5' }" />
          <div>
            <h3 class="category-card__name">{{ category.name }}</h3>
          </div>
        </div>

        <button 
          class="category-card__edit touch-target-comfortable interactive" 
          style="min-height: var(--touch-target-comfortable); min-width: var(--touch-target-comfortable);"
          @click="$emit('edit', category)" 
          aria-label="Edit category"
        >
          ✎
        </button>
      </div>
    </div>

    <!-- Long press indicator -->
    <div v-if="showLongPressIndicator" class="category-card__long-press-indicator">
      <span>Release to edit</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Category } from '@/domain/models'
import { formatMoney } from '@/utils/formatters'
import { useAnimations } from '@/utils/useAnimations'

const props = defineProps<{ category: Category }>()
const emit = defineEmits<{ 
  (e: 'edit', category: Category): void
  (e: 'delete', category: Category): void
}>()

const { useSwipeGesture, useLongPress } = useAnimations()

// Swipe gesture state
const cardRef = ref<HTMLElement>()
const isSwiping = ref(false)
const swipeOffset = ref(0)
const showDeleteAction = ref(false)

// Long press state
const showLongPressIndicator = ref(false)

// Handle swipe to delete
const handleSwipeLeft = () => {
  showDeleteAction.value = true
  swipeOffset.value = -80 // Reveal delete button
}

const handleSwipeRight = () => {
  showDeleteAction.value = false
  swipeOffset.value = 0 // Reset position
}

const handleDelete = () => {
  emit('delete', props.category)
}

// Handle long press to edit
const handleLongPress = () => {
  showLongPressIndicator.value = true
  setTimeout(() => {
    showLongPressIndicator.value = false
    emit('edit', props.category)
  }, 100)
}

// Setup gestures
let cleanupSwipe: (() => void) | undefined
let cleanupLongPress: (() => void) | undefined

onMounted(() => {
  if (cardRef.value) {
    cleanupSwipe = useSwipeGesture(
      cardRef.value,
      handleSwipeLeft,
      handleSwipeRight,
      50
    )
    
    cleanupLongPress = useLongPress(
      cardRef.value,
      handleLongPress,
      500
    )
  }
})

onUnmounted(() => {
  if (cleanupSwipe) cleanupSwipe()
  if (cleanupLongPress) cleanupLongPress()
})
</script>

<style scoped>
.category-card {
  position: relative;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(15, 23, 42, 0.08);
  background-color: var(--color-surface);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  transition: transform var(--duration-base) var(--ease-out), 
              box-shadow var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
  overflow: hidden;
}

.category-card:hover {
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  border-color: rgba(15, 23, 42, 0.12);
}

.category-card--swiping {
  transition: none;
}

.category-card__content {
  padding: var(--space-6);
  background-color: var(--color-surface);
  position: relative;
  z-index: 1;
}

.category-card__delete-action {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, transparent, var(--color-danger));
  opacity: 0;
  transition: opacity var(--duration-base) ease;
  z-index: 0;
}

.category-card__delete-action.visible {
  opacity: 1;
}

.category-card__delete-action button {
  color: white;
  background: transparent;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.category-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.category-card__info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.category-card__swatch {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6), 0 6px 12px rgba(15, 23, 42, 0.12);
  flex-shrink: 0;
}

.category-card__name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.category-card__edit {
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  line-height: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-card__edit:hover {
  color: var(--color-primary);
  transform: scale(1.1);
}

.category-card__edit:active {
  transform: scale(0.95);
}

.category-card__long-press-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 600;
  z-index: 2;
  pointer-events: none;
  animation: pulse 0.3s ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
  }
}

/* Responsive touch targets */
@media (max-width: 768px) {
  .category-card__content {
    padding: var(--space-4);
  }
  
  .category-card__edit {
    min-height: var(--touch-target-min);
    min-width: var(--touch-target-min);
  }
}
</style>
