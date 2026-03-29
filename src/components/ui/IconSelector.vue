<template>
  <div class="icon-selector">
    <label class="icon-selector__label">Icon</label>
    
    <!-- Selected icon display -->
    <div class="icon-selector__selected" @click="showGrid = !showGrid">
      <div v-if="selectedIcon" class="icon-selector__selected-icon">
        <CategoryIcon 
          :icon="selectedIcon" 
          :fallback-color="fallbackColor"
          :show-icon="true"
          size="md"
        />
        <span class="icon-selector__selected-name">{{ selectedIcon }}</span>
      </div>
      <div v-else class="icon-selector__placeholder">
        <span>Choose Icon</span>
      </div>
      <div class="icon-selector__arrow">
        <component :is="showGrid ? 'ChevronUp' : 'ChevronDown'" :size="16" />
      </div>
    </div>
    
    <!-- Backdrop -->
    <div 
      v-if="showGrid" 
      class="icon-selector__backdrop"
      @click="showGrid = false"
    />
    
    <!-- Icon grid -->
    <div 
      v-if="showGrid" 
      class="icon-selector__grid"
    >
      <!-- Search -->
      <div class="icon-selector__search">
        <component :is="Search" :size="16" class="icon-selector__search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search icons..."
          class="icon-selector__search-input"
        />
      </div>
      
      <!-- Category tabs -->
      <div class="icon-selector__tabs">
        <button
          v-for="(_icons, category) in filteredIcons"
          :key="category"
          class="icon-selector__tab"
          :class="{ 'icon-selector__tab--active': activeCategory === category }"
          @click="activeCategory = category as keyof typeof ICON_CATEGORIES"
        >
          {{ formatCategoryName(category) }}
        </button>
      </div>
      
      <!-- Icons grid -->
      <div class="icon-selector__icons">
        <button
          v-for="icon in currentIcons"
          :key="icon"
          class="icon-selector__icon-btn"
          :class="{ 'icon-selector__icon-btn--selected': selectedIcon === icon }"
          @click="selectIcon(icon)"
        >
          <CategoryIcon 
            :icon="icon" 
            :fallback-color="fallbackColor"
            :show-icon="true"
            size="sm"
          />
        </button>
      </div>
      
      <!-- Clear button -->
      <button
        v-if="selectedIcon"
        class="icon-selector__clear"
        @click="clearIcon"
      >
        Clear Icon
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Search } from 'lucide-vue-next'
import { ICON_CATEGORIES } from '@/utils/categoryIcons'
import CategoryIcon from './CategoryIcon.vue'

interface Props {
  modelValue?: string
  fallbackColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallbackColor: '#6366f1'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

// State
const showGrid = ref(false)
const searchQuery = ref('')
const activeCategory = ref<keyof typeof ICON_CATEGORIES>('entertainment')

// Computed
const selectedIcon = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Memoization for filtered icons
const filterMemoKey = computed(() => 
  `${searchQuery.value.toLowerCase()}-${Object.keys(ICON_CATEGORIES).length}`
)

const filterCache = new Map<string, Record<string, string[]>>()

const filteredIcons = computed(() => {
  const key = filterMemoKey.value
  
  // Return cached result if available
  if (filterCache.has(key)) {
    return filterCache.get(key)!
  }
  
  const filtered: Record<string, string[]> = {}
  
  Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
    const matchingIcons = icons.filter(icon => 
      icon.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    if (matchingIcons.length > 0) {
      filtered[category] = matchingIcons
    }
  })
  
  // Cache the result
  filterCache.set(key, filtered)
  
  // LRU cleanup - keep last 20 entries
  if (filterCache.size > 20) {
    const oldest = filterCache.keys().next().value
    if (oldest !== undefined) {
      filterCache.delete(oldest)
    }
  }
  
  return filtered
})

const currentIcons = computed(() => {
  return filteredIcons.value[activeCategory.value] || []
})

// Methods
function selectIcon(icon: string) {
  selectedIcon.value = icon
  showGrid.value = false
}

function clearIcon() {
  selectedIcon.value = undefined
  showGrid.value = false
}

function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

// Reset active category if current category has no icons after search
watch(activeCategory, () => {
  if (currentIcons.value.length === 0) {
    const firstAvailableCategory = Object.keys(filteredIcons.value)[0]
    if (firstAvailableCategory) {
      activeCategory.value = firstAvailableCategory as keyof typeof ICON_CATEGORIES
    }
  }
})

// Close grid when clicking outside
const handleClickOutside = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target.closest('.icon-selector')) {
    showGrid.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.icon-selector {
  position: relative;
}

.icon-selector__label {
  display: none;
}

.icon-selector__selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
}

.icon-selector__selected:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.icon-selector__placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.icon-selector__selected-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.icon-selector__selected-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-selector__arrow {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.icon-selector__backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9998;
}

.icon-selector__grid {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-surface);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  width: min(400px, calc(100vw - 2rem));
  max-height: min(500px, 70vh);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.icon-selector__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.icon-selector__search-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.icon-selector__search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.icon-selector__search-input::placeholder {
  color: var(--color-text-muted);
}

.icon-selector__tabs {
  display: flex;
  flex-wrap: nowrap;
  border-bottom: 1px solid var(--color-border-light);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-shrink: 0;
  gap: 0;
}

.icon-selector__tabs::-webkit-scrollbar {
  display: none;
}

.icon-selector__tab {
  padding: 0.5rem 0.625rem;
  border: none;
  background: transparent;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.icon-selector__tab:hover {
  color: var(--color-text-primary);
  background: rgba(99, 102, 241, 0.05);
}

.icon-selector__tab--active {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
}

.icon-selector__icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 0.25rem;
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.icon-selector__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  aspect-ratio: 1;
  min-height: 36px;
  min-width: 36px;
}

.icon-selector__icon-btn:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.2);
}

.icon-selector__icon-btn--selected {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.icon-selector__clear {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-top: 1px solid var(--color-border-light);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}

.icon-selector__clear:hover {
  background: rgba(239, 68, 68, 0.05);
  color: var(--color-danger);
}
</style>
