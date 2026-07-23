import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WelcomeCarousel from '@/views/WelcomeCarousel.vue'
import { useOnboardingStore } from '@/stores/onboarding'

vi.mock('@/composables/useHaptics', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}))

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mountOptions = {
  global: {
    stubs: {
      Transition: {
        template: '<div><slot /></div>',
      },
    },
  },
}

describe('WelcomeCarousel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Rendering', () => {
    test('renders the carousel container', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      expect(wrapper.find('.welcome-carousel').exists()).toBe(true)
    })

    test('renders Skip button', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const skipBtn = wrapper.findAll('button').find(b => b.text() === 'Skip')
      expect(skipBtn).toBeTruthy()
    })

    test('renders Next button on non-last slides', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      expect(nextBtn).toBeTruthy()
    })

    test('renders Get Started button on last slide', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      // Navigate to last slide
      const slides = 4
      for (let i = 0; i < slides - 1; i++) {
        const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
        await nextBtn?.trigger('click')
      }
      const getStartedBtn = wrapper.findAll('button').find(b => b.text() === 'Get Started')
      expect(getStartedBtn).toBeTruthy()
    })

    test('renders dot indicators for each slide', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const dots = wrapper.findAll('button[aria-label^="Go to slide"]')
      expect(dots).toHaveLength(4)
    })

    test('shows first slide content on mount', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      expect(wrapper.text()).toContain('Track Every Subscription')
    })

    test('does not show Back button on first slide', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
      expect(backBtn).toBeUndefined()
    })

    test('shows Back button after navigating forward', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
      expect(backBtn).toBeTruthy()
    })
  })

  describe('Slide content', () => {
    test('first slide shows Track Every Subscription', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      expect(wrapper.text()).toContain('Track Every Subscription')
    })

    test('second slide shows Never Miss a Renewal', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      expect(wrapper.text()).toContain('Never Miss a Renewal')
    })

    test('third slide shows Auto-Detect from Your Bank', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      await nextBtn?.trigger('click')
      expect(wrapper.text()).toContain('Auto-Detect from Your Bank')
    })

    test('fourth slide shows Save Money Effortlessly', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      for (let i = 0; i < 3; i++) {
        const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
        await nextBtn?.trigger('click')
      }
      expect(wrapper.text()).toContain('Save Money Effortlessly')
    })
  })

  describe('Navigation', () => {
    test('Next button advances to next slide', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      expect(wrapper.text()).toContain('Never Miss a Renewal')
    })

    test('Back button returns to previous slide', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      // Go forward
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      // Go back
      const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
      await backBtn?.trigger('click')
      expect(wrapper.text()).toContain('Track Every Subscription')
    })

    test('dot indicator click jumps to slide', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const dots = wrapper.findAll('button[aria-label^="Go to slide"]')
      await dots[2]?.trigger('click')
      expect(wrapper.text()).toContain('Auto-Detect from Your Bank')
    })
  })

  describe('Skip button', () => {
    test('marks carousel as seen in store', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const skipBtn = wrapper.findAll('button').find(b => b.text() === 'Skip')
      await skipBtn?.trigger('click')
      expect(store.carouselSeen).toBe(true)
    })

    test('navigates to /login on skip', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const skipBtn = wrapper.findAll('button').find(b => b.text() === 'Skip')
      await skipBtn?.trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith('/login')
    })

    test('persists carousel seen to localStorage', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const skipBtn = wrapper.findAll('button').find(b => b.text() === 'Skip')
      await skipBtn?.trigger('click')
      expect(localStorage.getItem('2sub_welcome_carousel_seen')).toBe('true')
    })
  })

  describe('Get Started button', () => {
    test('marks carousel as seen in store', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(WelcomeCarousel, mountOptions)
      // Navigate to last slide
      for (let i = 0; i < 3; i++) {
        const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
        await nextBtn?.trigger('click')
      }
      const getStartedBtn = wrapper.findAll('button').find(b => b.text() === 'Get Started')
      await getStartedBtn?.trigger('click')
      expect(store.carouselSeen).toBe(true)
    })

    test('navigates to /login on get started', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      // Navigate to last slide
      for (let i = 0; i < 3; i++) {
        const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
        await nextBtn?.trigger('click')
      }
      const getStartedBtn = wrapper.findAll('button').find(b => b.text() === 'Get Started')
      await getStartedBtn?.trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith('/login?mode=signup')
    })
  })

  describe('Dot indicators', () => {
    test('first dot is active (w-8) on mount', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const dots = wrapper.findAll('button[aria-label^="Go to slide"]')
      expect(dots[0].classes()).toContain('w-8')
      expect(dots[0].classes()).toContain('bg-white')
    })

    test('inactive dots have w-2 class', () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const dots = wrapper.findAll('button[aria-label^="Go to slide"]')
      expect(dots[1].classes()).toContain('w-2')
      expect(dots[1].classes()).toContain('bg-white/40')
    })

    test('active dot changes on navigation', async () => {
      const wrapper = mount(WelcomeCarousel, mountOptions)
      const nextBtn = wrapper.findAll('button').find(b => b.text() === 'Next')
      await nextBtn?.trigger('click')
      const dots = wrapper.findAll('button[aria-label^="Go to slide"]')
      expect(dots[1].classes()).toContain('w-8')
      expect(dots[0].classes()).toContain('w-2')
    })
  })
})
