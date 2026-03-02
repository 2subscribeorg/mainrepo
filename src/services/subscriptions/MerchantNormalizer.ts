/**
 * Handles merchant name normalization and similarity calculations
 * Used to group similar merchant names together for pattern detection
 */
export class MerchantNormalizer {
  /**
   * Enhanced merchant name normalization
   * Removes location markers, trial indicators, payment processors, etc.
   */
  normalize(merchantName: string): string {
    return merchantName
      .toLowerCase()
      .trim()
      // Remove trial/promo indicators (with asterisks first)
      .replace(/\*trial|\*promo/gi, '')
      // Remove common payment processor suffixes (with word boundaries, before special char removal)
      .replace(/\b(payment|payments|pay|subscription|subs?)\b/gi, ' ')
      // Remove location indicators (with word boundaries, before special char removal)
      .replace(/\b(london|uk|us|usa|gb|ltd|limited|inc|llc|corp|plc)\b/gi, ' ')
      // Remove trial/promo indicators (with word boundaries, before special char removal)
      .replace(/\b(trial|promo|free)\b/gi, ' ')
      // Remove web prefixes (with word boundaries, before special char removal)
      .replace(/\b(www|http|https)\b/gi, ' ')
      // Remove common separators and special chars
      .replace(/[^a-z0-9\s]/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, '')
      // Take first 15 chars for better grouping
      .substring(0, 15)
  }

  /**
   * Calculate similarity between two merchant names (0-1 score)
   * Uses simple substring matching and character overlap
   */
  calculateSimilarity(merchant1: string, merchant2: string): number {
    if (merchant1 === merchant2) return 1.0
    
    const longer = merchant1.length > merchant2.length ? merchant1 : merchant2
    const shorter = merchant1.length > merchant2.length ? merchant2 : merchant1
    
    // If shorter is completely contained in longer, high similarity
    if (longer.includes(shorter)) {
      return 0.85 + (shorter.length / longer.length) * 0.15
    }
    
    // Calculate character overlap ratio
    const shorterChars = new Set(shorter.split(''))
    const overlapCount = Array.from(shorterChars).filter(char => longer.includes(char)).length
    const overlapRatio = overlapCount / shorterChars.size
    
    // Boost score if they start with the same characters
    const commonPrefixLength = this.getCommonPrefixLength(merchant1, merchant2)
    const prefixBoost = Math.min(commonPrefixLength / 5, 0.3)
    
    return Math.min(overlapRatio + prefixBoost, 1.0)
  }

  /**
   * Get length of common prefix between two strings
   */
  private getCommonPrefixLength(str1: string, str2: string): number {
    let i = 0
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++
    }
    return i
  }
}
