import { describe, it, expect } from 'vitest'
import testData from './data.json'

describe('API Endpoint Tests', () => {
  it('validates gemini stats endpoint', () => {
    const endpoint = '/api/gemini/stats'
    expect(testData.api_endpoints).toContain(endpoint)
  })

  it('validates token response structure', () => {
    const tokens = testData.mock_responses.tokens
    expect(tokens).toHaveProperty('totalTokens')
    expect(tokens.totalTokens).toBeGreaterThan(0)
  })

  it('validates session response structure', () => {
    const sessions = testData.mock_responses.sessions
    expect(sessions).toHaveProperty('totalSessions')
    expect(sessions.averageSessionDuration).toBeGreaterThan(0)
  })

  it('validates activities array', () => {
    const activities = testData.mock_responses.activities
    expect(Array.isArray(activities)).toBe(true)
    expect(activities.length).toBeGreaterThan(0)
  })

  it('validates token limits', () => {
    const rules = testData.validation_rules.tokens
    const tokens = testData.mock_responses.tokens
    expect(tokens.totalTokens).toBeGreaterThanOrEqual(rules.min)
    expect(tokens.totalTokens).toBeLessThanOrEqual(rules.max)
  })

  it('validates required token fields', () => {
    const tokens = testData.mock_responses.tokens
    const required = testData.validation_rules.tokens.required_fields
    required.forEach(field => {
      expect(tokens).toHaveProperty(field)
    })
  })

  it('validates session duration limits', () => {
    const rules = testData.validation_rules.sessions
    const sessions = testData.mock_responses.sessions
    expect(sessions.averageSessionDuration).toBeGreaterThanOrEqual(rules.min_duration)
    expect(sessions.averageSessionDuration).toBeLessThanOrEqual(rules.max_duration)
  })

  it('validates required session fields', () => {
    const sessions = testData.mock_responses.sessions
    const required = testData.validation_rules.sessions.required_fields
    required.forEach(field => {
      expect(sessions).toHaveProperty(field)
    })
  })

  it('validates activity structure', () => {
    const activity = testData.mock_responses.activities[0]
    expect(activity).toHaveProperty('type')
    expect(activity).toHaveProperty('tokens_used')
    expect(activity).toHaveProperty('timestamp')
  })

  it('validates endpoint format', () => {
    testData.api_endpoints.forEach(endpoint => {
      expect(endpoint).toMatch(/^\/api\//)
      expect(typeof endpoint).toBe('string')
    })
  })
})
