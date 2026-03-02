import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryBreakdownCard from '@/components/dashboard/CategoryBreakdownCard.vue'

describe('CategoryBreakdownCard.vue - Critical Math & Data Logic', () => {
  // ============================================================================
  // CRITICAL TEST 1: Conic Gradient Math
  // ============================================================================
  describe('Conic Gradient Math', () => {
    it('calculates conic gradient correctly for 50/50 split', () => {
      const mockData = [
        { 
          label: 'Food', 
          amount: 50, 
          percentage: 50, 
          formattedAmount: '£50.00', 
          color: '#FF5733' 
        },
        { 
          label: 'Bills', 
          amount: 50, 
          percentage: 50, 
          formattedAmount: '£50.00', 
          color: '#3366FF' 
        }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')

      // Critical: Check if 50% correctly translates to 180 degrees
      expect(backgroundStyle).toContain('conic-gradient(')
      expect(backgroundStyle).toContain('#FF5733 0deg 180deg')
      expect(backgroundStyle).toContain('#3366FF 180deg 360deg')
    })

    it('calculates conic gradient for three segments with different percentages', () => {
      const mockData = [
        { 
          label: 'Food', 
          amount: 25, 
          percentage: 25, 
          formattedAmount: '£25.00', 
          color: '#FF5733' 
        },
        { 
          label: 'Bills', 
          amount: 50, 
          percentage: 50, 
          formattedAmount: '£50.00', 
          color: '#3366FF' 
        },
        { 
          label: 'Entertainment', 
          amount: 25, 
          percentage: 25, 
          formattedAmount: '£25.00', 
          color: '#33FF57' 
        }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')

      // 25% = 90deg, 50% = 180deg, cumulative positioning
      expect(backgroundStyle).toContain('#FF5733 0deg 90deg')    // 0-90 degrees
      expect(backgroundStyle).toContain('#3366FF 90deg 270deg')  // 90-270 degrees  
      expect(backgroundStyle).toContain('#33FF57 270deg 360deg') // 270-360 degrees
    })

    it('handles small percentages correctly', () => {
      const mockData = [
        { 
          label: 'Tiny', 
          amount: 1, 
          percentage: 1, 
          formattedAmount: '£1.00', 
          color: '#FF0000' 
        },
        { 
          label: 'Large', 
          amount: 99, 
          percentage: 99, 
          formattedAmount: '£99.00', 
          color: '#0000FF' 
        }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')

      // 1% = 3.6 degrees (approximately)
      expect(backgroundStyle).toContain('#FF0000 0deg 3.6deg')
      expect(backgroundStyle).toContain('#0000FF 3.6deg 360deg')
    })

    it('returns fallback grey gradient when no data provided (Zero State)', () => {
      const wrapper = mount(CategoryBreakdownCard, {
        props: { 
          data: [], 
          formattedTotal: '£0.00' 
        }
      })
      
      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')
      
      // Critical: Prevents "empty white circle" bug
      expect(backgroundStyle).toContain('conic-gradient(var(--color-text-secondary) 0 360deg)')
    })

    it('handles single item (100%) correctly', () => {
      const mockData = [
        { 
          label: 'Everything', 
          amount: 100, 
          percentage: 100, 
          formattedAmount: '£100.00', 
          color: '#PURPLE' 
        }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      // Test the computed property directly
      const donutGradient = wrapper.vm.donutGradient as string
      expect(donutGradient).toContain('conic-gradient(')
      expect(donutGradient).toContain('#PURPLE 0deg 360deg')
    })
  })

  // ============================================================================
  // CRITICAL TEST 2: Data Mapping & Legend Accuracy
  // ============================================================================
  describe('Data Mapping & Legend Accuracy', () => {
    it('renders correct number of legend items matching data length', () => {
      const mockData = [
        { label: 'Food', amount: 50, percentage: 50, formattedAmount: '£50.00', color: 'red' },
        { label: 'Bills', amount: 30, percentage: 30, formattedAmount: '£30.00', color: 'blue' },
        { label: 'Entertainment', amount: 20, percentage: 20, formattedAmount: '£20.00', color: 'green' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const legendItems = wrapper.findAll('.legend-row')
      expect(legendItems).toHaveLength(3)
    })

    it('ensures legend dot colors match data item colors', () => {
      const mockData = [
        { label: 'Food', amount: 50, percentage: 50, formattedAmount: '£50.00', color: '#FF5733' },
        { label: 'Bills', amount: 50, percentage: 50, formattedAmount: '£50.00', color: '#3366FF' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const legendDots = wrapper.findAll('.legend-dot')
      // Note: Browser converts hex colors to RGB format
      expect(legendDots[0].attributes('style')).toContain('background-color: rgb(255, 87, 51)')
      expect(legendDots[1].attributes('style')).toContain('background-color: rgb(51, 102, 255)')
    })

    it('displays correct labels and amounts in legend', () => {
      const mockData = [
        { label: 'Food', amount: 50, percentage: 50, formattedAmount: '£50.00', color: 'red' },
        { label: 'Bills', amount: 50, percentage: 50, formattedAmount: '£50.00', color: 'blue' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const legendLabels = wrapper.findAll('.legend-label')
      const legendSubs = wrapper.findAll('.legend-sub')

      expect(legendLabels[0].text()).toBe('Food')
      expect(legendLabels[1].text()).toBe('Bills')
      expect(legendSubs[0].text()).toContain('£50.00')
      expect(legendSubs[0].text()).toContain('50%')
      expect(legendSubs[1].text()).toContain('£50.00')
      expect(legendSubs[1].text()).toContain('50%')
    })

    it('handles empty data with no legend items', () => {
      const wrapper = mount(CategoryBreakdownCard, {
        props: { 
          data: [], 
          formattedTotal: '£0.00' 
        }
      })

      const legendItems = wrapper.findAll('.legend-row')
      expect(legendItems).toHaveLength(0)
    })
  })

  // ============================================================================
  // CRITICAL TEST 3: Display Logic
  // ============================================================================
  describe('Display Logic', () => {
    it('shows correct total label based on data length', () => {
      // Test empty data
      const emptyWrapper = mount(CategoryBreakdownCard, {
        props: { 
          data: [], 
          formattedTotal: '£0.00' 
        }
      })
      expect(emptyWrapper.find('.breakdown-card__total').text()).toBe('0 categories')

      // Test with data
      const dataWrapper = mount(CategoryBreakdownCard, {
        props: { 
          data: [
            { label: 'Food', amount: 50, percentage: 50, formattedAmount: '£50.00', color: 'red' },
            { label: 'Bills', amount: 50, percentage: 50, formattedAmount: '£50.00', color: 'blue' },
            { label: 'Entertainment', amount: 25, percentage: 25, formattedAmount: '£25.00', color: 'green' }
          ], 
          formattedTotal: '£125.00' 
        }
      })
      expect(dataWrapper.find('.breakdown-card__total').text()).toBe('3 categories')
    })

    it('renders formatted total in donut hole center', () => {
      const wrapper = mount(CategoryBreakdownCard, {
        props: { 
          data: [
            { label: 'Food', amount: 100, percentage: 100, formattedAmount: '£100.00', color: 'red' }
          ], 
          formattedTotal: '£1,250.00' 
        }
      })

      const donutHoleValue = wrapper.find('.donut-hole__value')
      expect(donutHoleValue.text()).toBe('£1,250.00')
      
      const donutHoleLabel = wrapper.find('.donut-hole__label')
      expect(donutHoleLabel.text()).toBe('total')
    })

    it('displays percentage with correct decimal places', () => {
      const mockData = [
        { 
          label: 'Precise', 
          amount: 33.33, 
          percentage: 33.333, 
          formattedAmount: '£33.33', 
          color: 'blue' 
        }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£33.33'
        }
      })

      const legendSub = wrapper.find('.legend-sub')
      expect(legendSub.text()).toContain('33%') // Should be rounded to 0 decimal places
    })
  })

  // ============================================================================
  // EDGE CASES & BOUNDARY CONDITIONS
  // ============================================================================
  describe('Edge Cases & Boundary Conditions', () => {
    it('handles percentages that sum to exactly 100', () => {
      const mockData = [
        { label: 'A', amount: 33.33, percentage: 33.33, formattedAmount: '£33.33', color: 'red' },
        { label: 'B', amount: 33.33, percentage: 33.33, formattedAmount: '£33.33', color: 'blue' },
        { label: 'C', amount: 33.34, percentage: 33.34, formattedAmount: '£33.34', color: 'green' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')
      
      // Should handle floating point precision correctly
      expect(backgroundStyle).toContain('conic-gradient(')
      expect(backgroundStyle).toContain('red 0deg')
      expect(backgroundStyle).toContain('blue')
      expect(backgroundStyle).toContain('green')
    })

    it('handles very small percentages without breaking', () => {
      const mockData = [
        { label: 'Tiny', amount: 0.01, percentage: 0.01, formattedAmount: '£0.01', color: 'red' },
        { label: 'Rest', amount: 99.99, percentage: 99.99, formattedAmount: '£99.99', color: 'blue' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      const donut = wrapper.find('.breakdown-card__donut')
      expect(donut.exists()).toBe(true)
      
      const backgroundStyle = donut.attributes('style')
      expect(backgroundStyle).toContain('conic-gradient(')
    })

    it('maintains data synchronization between donut and legend', () => {
      const mockData = [
        { label: 'Food', amount: 40, percentage: 40, formattedAmount: '£40.00', color: '#FF0000' },
        { label: 'Bills', amount: 35, percentage: 35, formattedAmount: '£35.00', color: '#00FF00' },
        { label: 'Entertainment', amount: 25, percentage: 25, formattedAmount: '£25.00', color: '#0000FF' }
      ]
      
      const wrapper = mount(CategoryBreakdownCard, {
        props: {
          data: mockData,
          formattedTotal: '£100.00'
        }
      })

      // Verify donut contains all colors
      const donut = wrapper.find('.breakdown-card__donut')
      const backgroundStyle = donut.attributes('style')
      expect(backgroundStyle).toContain('conic-gradient(')
      expect(backgroundStyle).toContain('#FF0000')
      expect(backgroundStyle).toContain('#00FF00')
      expect(backgroundStyle).toContain('#0000FF')

      // Verify legend has matching items
      const legendDots = wrapper.findAll('.legend-dot')
      expect(legendDots).toHaveLength(3)
      // Note: Browser converts hex colors to RGB format
      expect(legendDots[0].attributes('style')).toContain('rgb(255, 0, 0)')
      expect(legendDots[1].attributes('style')).toContain('rgb(0, 255, 0)')
      expect(legendDots[2].attributes('style')).toContain('rgb(0, 0, 255)')
    })
  })
})
