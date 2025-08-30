import { describe, it, expect } from 'vitest'
import testData from './data.json'

describe('Dashboard Component Tests', () => {
  it('validates dashboard title', () => {
    const title = testData.dashboard.title
    expect(title).toBe('Gemini Live Dashboard')
    expect(typeof title).toBe('string')
  })

  it('validates dashboard sections', () => {
    const sections = testData.dashboard.sections
    expect(Array.isArray(sections)).toBe(true)
    expect(sections).toHaveLength(3)
  })

  it('validates token usage section', () => {
    const sections = testData.dashboard.sections
    expect(sections).toContain('Token Usage')
  })

  it('validates session statistics section', () => {
    const sections = testData.dashboard.sections
    expect(sections).toContain('Session Statistics')
  })

  it('validates recent activities section', () => {
    const sections = testData.dashboard.sections
    expect(sections).toContain('Recent Activities')
  })

  it('validates refresh interval', () => {
    const interval = testData.dashboard.refreshInterval
    expect(typeof interval).toBe('number')
    expect(interval).toBeGreaterThan(0)
  })

  it('validates token data format', () => {
    const tokens = testData.mock_responses.tokens
    expect(tokens.totalTokens).toBeGreaterThan(0)
    expect(tokens.todayTokens).toBeLessThanOrEqual(tokens.totalTokens)
  })

  it('validates session data format', () => {
    const sessions = testData.mock_responses.sessions
    expect(sessions.totalSessions).toBeGreaterThan(0)
    expect(sessions.totalMessages).toBeGreaterThan(0)
  })

  it('validates activity timestamp format', () => {
    const activities = testData.mock_responses.activities
    expect(activities.length).toBeGreaterThan(0)
    if (activities[0]) {
      const timestamp = new Date(activities[0].timestamp)
      expect(timestamp instanceof Date).toBe(true)
      expect(!isNaN(timestamp.getTime())).toBe(true)
    }
  })

  it('validates component data structure', () => {
    expect(testData).toHaveProperty('dashboard')
    expect(testData).toHaveProperty('mock_responses')
    expect(testData).toHaveProperty('validation_rules')
  })
})
