import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// Animation utilities composable
export function useAnimations() {
  
  // Check if user prefers reduced motion
  const prefersReducedMotion = ref(false)
  
  onMounted(() => {
    // Check if we're in a test environment or if matchMedia is not available
    if (typeof window === 'undefined' || !window.matchMedia) {
      prefersReducedMotion.value = false // Default to false in test environment
      return
    }
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches
    
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  })
  
  // Stagger animation for lists
  const staggerAnimation = async (
    elements: HTMLElement[],
    animationClass: string,
    delay = 50
  ) => {
    if (prefersReducedMotion.value) return
    
    await nextTick()
    
    elements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add(animationClass)
      }, index * delay)
    })
  }
  
  // Animate element entrance
  const animateEntrance = (
    element: HTMLElement,
    animationClass: string,
    delay = 0
  ) => {
    if (prefersReducedMotion.value) return
    
    setTimeout(() => {
      element.classList.add(animationClass)
    }, delay)
  }
  
  // Animate element exit
  const animateExit = async (
    element: HTMLElement,
    animationClass: string
  ): Promise<void> => {
    if (prefersReducedMotion.value) {
      element.remove()
      return Promise.resolve()
    }
    
    element.classList.add(animationClass)
    
    return new Promise((resolve) => {
      const duration = getAnimationDuration(animationClass)
      setTimeout(() => {
        element.remove()
        resolve()
      }, duration)
    })
  }
  
  // Get animation duration from CSS
  const getAnimationDuration = (animationClass: string): number => {
    const durations: Record<string, number> = {
      'modal-enter': 250,
      'modal-leave': 150,
      'slide-up': 250,
      'slide-down': 250,
      'slide-in-right': 250,
      'slide-in-left': 250,
      'fade-in': 250,
      'fade-out': 150,
      'dropdown-enter': 150,
      'dropdown-leave': 150,
      'toast-enter': 250,
      'toast-leave': 150,
    }
    
    return durations[animationClass] || 250
  }
  
  // Smooth scroll to element
  const scrollToElement = (
    element: HTMLElement,
    offset = 0,
    behavior: ScrollBehavior = prefersReducedMotion.value ? 'auto' : 'smooth'
  ) => {
    // Check if we're in a test environment
    if (typeof window === 'undefined') return
    
    const elementPosition = element.offsetTop - offset
    window.scrollTo({
      top: elementPosition,
      behavior
    })
  }
  
  // Add hover effects with performance optimization
  const addHoverEffect = (
    element: HTMLElement,
    hoverClass: string,
    activeClass?: string
  ) => {
    if (prefersReducedMotion.value) return
    
    const handleMouseEnter = () => {
      element.classList.add(hoverClass)
    }
    
    const handleMouseLeave = () => {
      element.classList.remove(hoverClass)
    }
    
    const handleMouseDown = () => {
      if (activeClass) {
        element.classList.add(activeClass)
      }
    }
    
    const handleMouseUp = () => {
      if (activeClass) {
        element.classList.remove(activeClass)
      }
    }
    
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseup', handleMouseUp)
    
    // Cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mouseup', handleMouseUp)
    }
  }
  
  // Animate number counting
  const animateNumber = (
    element: HTMLElement,
    targetValue: number,
    duration = 1000,
    prefix = '',
    suffix = ''
  ) => {
    if (prefersReducedMotion.value) {
      element.textContent = `${prefix}${targetValue}${suffix}`
      return
    }
    
    const startTime = Date.now()
    const startValue = 0
    
    const updateNumber = () => {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut)
      
      element.textContent = `${prefix}${currentValue}${suffix}`
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber)
      }
    }
    
    requestAnimationFrame(updateNumber)
  }
  
  // Animate progress bar
  const animateProgress = (
    element: HTMLElement,
    targetPercent: number,
    duration = 1000
  ) => {
    if (prefersReducedMotion.value) {
      element.style.width = `${targetPercent}%`
      return
    }
    
    const startTime = Date.now()
    const startPercent = 0
    
    const updateProgress = () => {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentPercent = startPercent + (targetPercent - startPercent) * easeOut
      
      element.style.width = `${currentPercent}%`
      
      if (progress < 1) {
        requestAnimationFrame(updateProgress)
      }
    }
    
    requestAnimationFrame(updateProgress)
  }
  
  // Create ripple effect
  const createRipple = (
    event: MouseEvent,
    element: HTMLElement,
    color = 'rgba(255, 255, 255, 0.5)'
  ) => {
    if (prefersReducedMotion.value) return
    
    // Check if we're in a test environment
    if (typeof document === 'undefined') return
    
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    const ripple = document.createElement('span')
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.style.backgroundColor = color
    ripple.style.position = 'absolute'
    ripple.style.borderRadius = '50%'
    ripple.style.transform = 'scale(0)'
    ripple.style.animation = 'ripple 0.6s ease-out'
    ripple.style.pointerEvents = 'none'
    
    // Add ripple animation if not already defined
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style')
      style.id = 'ripple-styles'
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }
    
    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)
    
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }
  
  // Swipe gesture detection
  const useSwipeGesture = (
    element: HTMLElement,
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
    threshold = 50
  ) => {
    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      touchEndY = e.changedTouches[0].screenY
      handleSwipe()
    }
    
    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY
      
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > threshold && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    }
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    // Cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }
  
  // Long press gesture detection
  const useLongPress = (
    element: HTMLElement,
    onLongPress: () => void,
    duration = 500
  ) => {
    let pressTimer: number | null = null
    
    const handleStart = () => {
      pressTimer = window.setTimeout(() => {
        onLongPress()
        // Add haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }, duration)
    }
    
    const handleEnd = () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    }
    
    element.addEventListener('touchstart', handleStart, { passive: true })
    element.addEventListener('touchend', handleEnd, { passive: true })
    element.addEventListener('touchcancel', handleEnd, { passive: true })
    element.addEventListener('mousedown', handleStart)
    element.addEventListener('mouseup', handleEnd)
    element.addEventListener('mouseleave', handleEnd)
    
    // Cleanup function
    return () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
      }
      element.removeEventListener('touchstart', handleStart)
      element.removeEventListener('touchend', handleEnd)
      element.removeEventListener('touchcancel', handleEnd)
      element.removeEventListener('mousedown', handleStart)
      element.removeEventListener('mouseup', handleEnd)
      element.removeEventListener('mouseleave', handleEnd)
    }
  }
  
  return {
    prefersReducedMotion,
    staggerAnimation,
    animateEntrance,
    animateExit,
    scrollToElement,
    addHoverEffect,
    animateNumber,
    animateProgress,
    createRipple,
    getAnimationDuration,
    useSwipeGesture,
    useLongPress
  }
}

// Transition utilities for Vue components
export function useTransitions() {
  const { prefersReducedMotion } = useAnimations()
  
  // Modal transition
  const modalTransition = {
    enterActiveClass: 'modal-enter',
    leaveActiveClass: 'modal-leave',
    duration: prefersReducedMotion.value ? 0 : 250
  }
  
  // Slide transition
  const slideTransition = (direction: 'up' | 'down' | 'left' | 'right' = 'up') => {
    const classes = {
      up: { enter: 'slide-up', leave: 'slide-down' },
      down: { enter: 'slide-down', leave: 'slide-up' },
      left: { enter: 'slide-in-left', leave: 'slide-in-right' },
      right: { enter: 'slide-in-right', leave: 'slide-in-left' }
    }
    
    return {
      enterActiveClass: classes[direction].enter,
      leaveActiveClass: classes[direction].leave,
      duration: prefersReducedMotion.value ? 0 : 250
    }
  }
  
  // Fade transition
  const fadeTransition = {
    enterActiveClass: 'fade-in',
    leaveActiveClass: 'fade-out',
    duration: prefersReducedMotion.value ? 0 : 250
  }
  
  // Dropdown transition
  const dropdownTransition = {
    enterActiveClass: 'dropdown-enter',
    leaveActiveClass: 'dropdown-leave',
    duration: prefersReducedMotion.value ? 0 : 150
  }
  
  return {
    modalTransition,
    slideTransition,
    fadeTransition,
    dropdownTransition
  }
}
