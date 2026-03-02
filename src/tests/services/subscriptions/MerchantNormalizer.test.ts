import { describe, it, expect } from 'vitest'
import { MerchantNormalizer } from '@/services/subscriptions/MerchantNormalizer'

describe('MerchantNormalizer', () => {
  const normalizer = new MerchantNormalizer()

  describe('normalize', () => {
    it('converts to lowercase', () => {
      expect(normalizer.normalize('NETFLIX')).toBe('netflix')
      expect(normalizer.normalize('Netflix')).toBe('netflix')
    })

    it('removes payment processor suffixes', () => {
      expect(normalizer.normalize('Netflix Payment')).toBe('netflix')
      expect(normalizer.normalize('Spotify Payments')).toBe('spotify')
      expect(normalizer.normalize('Amazon Pay')).toBe('amazon')
      expect(normalizer.normalize('Disney Subscription')).toBe('disney')
    })

    it('removes location indicators', () => {
      expect(normalizer.normalize('Netflix London')).toBe('netflix')
      expect(normalizer.normalize('Spotify UK')).toBe('spotify')
      expect(normalizer.normalize('Amazon US')).toBe('amazon')
      expect(normalizer.normalize('Disney Ltd')).toBe('disney')
      expect(normalizer.normalize('Apple Inc')).toBe('apple')
      expect(normalizer.normalize('Microsoft Corp')).toBe('microsoft')
    })

    it('removes trial and promo indicators', () => {
      expect(normalizer.normalize('Netflix *Trial')).toBe('netflix')
      expect(normalizer.normalize('Spotify Trial')).toBe('spotify')
      expect(normalizer.normalize('Amazon *Promo')).toBe('amazon')
      expect(normalizer.normalize('Disney Free')).toBe('disney')
    })

    it('removes special characters', () => {
      expect(normalizer.normalize('Net-flix')).toBe('netflix')
      expect(normalizer.normalize('Spo.ti.fy')).toBe('spotify')
      expect(normalizer.normalize('Ama_zon')).toBe('amazon')
    })

    it('removes web prefixes', () => {
      expect(normalizer.normalize('www.netflix.com')).toBe('netflixcom')
      // Web prefixes are removed as complete words before special char removal
      expect(normalizer.normalize('https://spotify.com')).toBe('spotifycom')
      expect(normalizer.normalize('http://amazon.com')).toBe('amazoncom')
    })

    it('truncates to 15 characters', () => {
      const longName = 'verylongmerchantname123456789'
      expect(normalizer.normalize(longName)).toHaveLength(15)
      expect(normalizer.normalize(longName)).toBe('verylongmerchan')
    })

    it('handles complex real-world merchant names', () => {
      expect(normalizer.normalize('NETFLIX.COM *TRIAL UK')).toBe('netflixcom')
      expect(normalizer.normalize('Spotify Premium Payment Ltd')).toBe('spotifypremium')
      expect(normalizer.normalize('Amazon Prime Subscription US')).toBe('amazonprime')
    })

    it('handles empty and whitespace strings', () => {
      expect(normalizer.normalize('')).toBe('')
      expect(normalizer.normalize('   ')).toBe('')
    })
  })

  describe('calculateSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(normalizer.calculateSimilarity('netflix', 'netflix')).toBe(1.0)
      expect(normalizer.calculateSimilarity('spotify', 'spotify')).toBe(1.0)
    })

    it('returns high similarity for substring matches', () => {
      const similarity = normalizer.calculateSimilarity('netflix', 'netflixcom')
      expect(similarity).toBeGreaterThan(0.85)
      expect(similarity).toBeLessThanOrEqual(1.0)
    })

    it('returns lower similarity for different strings', () => {
      const similarity = normalizer.calculateSimilarity('netflix', 'spotify')
      expect(similarity).toBeLessThan(0.5)
    })

    it('considers common prefix length', () => {
      const sim1 = normalizer.calculateSimilarity('netflix', 'netscape')
      const sim2 = normalizer.calculateSimilarity('netflix', 'amazon')
      expect(sim1).toBeGreaterThan(sim2)
    })

    it('handles character overlap', () => {
      const similarity = normalizer.calculateSimilarity('abc', 'bcd')
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1.0)
    })

    it('handles completely different strings', () => {
      const similarity = normalizer.calculateSimilarity('xyz', 'abc')
      expect(similarity).toBeLessThan(0.3)
    })

    it('is symmetric', () => {
      const sim1 = normalizer.calculateSimilarity('netflix', 'netflixcom')
      const sim2 = normalizer.calculateSimilarity('netflixcom', 'netflix')
      expect(sim1).toBe(sim2)
    })

    it('handles empty strings', () => {
      expect(normalizer.calculateSimilarity('', '')).toBe(1.0)
    })
  })

  describe('edge cases', () => {
    it('handles merchant names with only special characters', () => {
      expect(normalizer.normalize('***')).toBe('')
      expect(normalizer.normalize('---')).toBe('')
    })

    it('handles merchant names with numbers', () => {
      expect(normalizer.normalize('Netflix 123')).toBe('netflix123')
      expect(normalizer.normalize('Spotify 2023')).toBe('spotify2023')
    })

    it('handles mixed case with special characters', () => {
      expect(normalizer.normalize('NeTfLiX-UK-*TrIaL')).toBe('netflix')
    })
  })
})
