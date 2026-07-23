<template>
  <div class="welcome-carousel min-h-screen flex flex-col">
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
import { Wallet, Building2, Tags, TrendingUp } from 'lucide-vue-next'
import { useOnboardingStore } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const { impact } = useHaptics()

const currentSlide = ref(0)
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left')

const slides = [
  {
    icon: Wallet,
    title: 'Give Yourself a Pay Rise',
    description: 'Stop letting forgotten subscription renewals quietly drain your bank account. Reclaim your income and keep more of what you earn.',
  },
  {
    icon: Building2,
    title: 'Sync Your Bank in Seconds',
    description: 'Securely connect your UK bank account via FCA-authorised Open Banking. Read-only access — we can never move your money.',
  },
  {
    icon: Tags,
    title: 'Identify & Categorise',
    description: 'Swipe through transactions to mark subscriptions. Organise them into categories and build your perfect budget breakdown.',
  },
  {
    icon: TrendingUp,
    title: 'Optimise Your Spending',
    description: 'Our Pattern Detector flags price hikes and duplicate charges automatically — so you can cancel what you don\'t use and effectively increase your take-home pay.',
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
  router.push('/login?mode=signup')
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
  background: linear-gradient(135deg, var(--color-primary) 0%, #4A2FB0 100%);
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
