<template>
  <div class="welcome-carousel min-h-screen flex flex-col bg-gradient-to-br from-primary to-primary-dark">
    <!-- Skip button -->
    <button
      class="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 text-white/70 text-sm font-medium z-10 touch-target"
      @click="handleSkip"
    >
      Skip
    </button>

    <!-- Slides -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 pb-8">
      <Transition :name="slideDirection" mode="out-in">
        <div :key="currentSlide" class="flex flex-col items-center text-center max-w-sm">
          <!-- Icon -->
          <div class="mb-8 flex items-center justify-center w-28 h-28 rounded-3xl bg-white/15 backdrop-blur-sm">
            <component :is="slides[currentSlide].icon" :size="56" class="text-white" />
          </div>

          <!-- Title -->
          <h2 class="text-2xl font-bold text-white mb-3">{{ slides[currentSlide].title }}</h2>

          <!-- Description -->
          <p class="text-white/80 text-base leading-relaxed">{{ slides[currentSlide].description }}</p>
        </div>
      </Transition>
    </div>

    <!-- Dots indicator -->
    <div class="flex items-center justify-center gap-2 pb-6">
      <button
        v-for="(_, i) in slides"
        :key="i"
        class="h-2 rounded-full transition-all duration-300"
        :class="i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'"
        :aria-label="`Go to slide ${i + 1}`"
        @click="currentSlide = i"
      />
    </div>

    <!-- Navigation buttons -->
    <div class="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3">
      <button
        v-if="currentSlide < slides.length - 1"
        class="w-full bg-white text-primary font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98]"
        @click="nextSlide"
      >
        Next
      </button>
      <button
        v-else
        class="w-full bg-white text-primary font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98]"
        @click="handleGetStarted"
      >
        Get Started
      </button>

      <button
        v-if="currentSlide > 0"
        class="w-full text-white/60 text-sm font-medium py-2"
        @click="prevSlide"
      >
        Back
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CreditCard, BellRing, Building2, Sparkles } from 'lucide-vue-next'
import { useOnboardingStore } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const { impact } = useHaptics()

const currentSlide = ref(0)
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left')

const slides = [
  {
    icon: CreditCard,
    title: 'Track Every Subscription',
    description: 'See all your subscriptions in one place. Know exactly what you\'re paying for and when.',
  },
  {
    icon: BellRing,
    title: 'Never Miss a Renewal',
    description: 'Get warned before subscriptions charge you. Cancel unwanted ones before it\'s too late.',
  },
  {
    icon: Building2,
    title: 'Auto-Detect from Your Bank',
    description: 'Connect your bank account and we\'ll automatically find subscriptions you forgot about.',
  },
  {
    icon: Sparkles,
    title: 'Save Money Effortlessly',
    description: 'Identify duplicate subscriptions, unused services, and hidden charges. Take control of your spending.',
  },
]

function nextSlide() {
  if (currentSlide.value < slides.length - 1) {
    slideDirection.value = 'slide-left'
    impact('light')
    currentSlide.value++
  }
}

function prevSlide() {
  if (currentSlide.value > 0) {
    slideDirection.value = 'slide-right'
    impact('light')
    currentSlide.value--
  }
}

function handleGetStarted() {
  impact('medium')
  onboardingStore.markCarouselSeen()
  router.push('/login')
}

function handleSkip() {
  impact('light')
  onboardingStore.markCarouselSeen()
  router.push('/login')
}
</script>

<style scoped>
.welcome-carousel {
  position: relative;
  --color-primary-dark: #4A2FB0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s var(--ease-out);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
