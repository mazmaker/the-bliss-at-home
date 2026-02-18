import { describe, it, expect } from 'vitest'
import {
  getHotelSlugFromIdStatic,
  STATIC_HOTEL_ID_TO_SLUG,
  clearHotelCache,
} from '../hotelUtils'

describe('STATIC_HOTEL_ID_TO_SLUG', () => {
  it('has 3 hotel entries', () => {
    expect(Object.keys(STATIC_HOTEL_ID_TO_SLUG)).toHaveLength(3)
  })

  it('maps grand-palace-bangkok correctly', () => {
    expect(STATIC_HOTEL_ID_TO_SLUG['550e8400-e29b-41d4-a716-446655440001']).toBe('grand-palace-bangkok')
  })

  it('maps resort-chiang-mai correctly', () => {
    expect(STATIC_HOTEL_ID_TO_SLUG['550e8400-e29b-41d4-a716-446655440002']).toBe('resort-chiang-mai')
  })

  it('maps dusit-thani-bangkok correctly', () => {
    expect(STATIC_HOTEL_ID_TO_SLUG['550e8400-e29b-41d4-a716-446655440003']).toBe('dusit-thani-bangkok')
  })
})

describe('getHotelSlugFromIdStatic', () => {
  it('returns slug for known hotel ID 001', () => {
    expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440001')).toBe('grand-palace-bangkok')
  })

  it('returns slug for known hotel ID 002', () => {
    expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440002')).toBe('resort-chiang-mai')
  })

  it('returns slug for known hotel ID 003', () => {
    expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440003')).toBe('dusit-thani-bangkok')
  })

  it('returns fallback "resort-chiang-mai" for unknown ID', () => {
    expect(getHotelSlugFromIdStatic('unknown-id')).toBe('resort-chiang-mai')
  })

  it('returns fallback for empty string', () => {
    expect(getHotelSlugFromIdStatic('')).toBe('resort-chiang-mai')
  })
})

describe('clearHotelCache', () => {
  it('executes without error', () => {
    expect(() => clearHotelCache()).not.toThrow()
  })
})
