import { describe, expect, it } from 'vitest'
import { normalizeBusProfile, validateBusProfile } from './profile'

describe('bus profile helpers', () => {
  it('normalizes the editable bus-profile fields', () => {
    expect(normalizeBusProfile({ registrationNumber: ' kl 07 ab 1234 ', name: ' City Rider ', route: ' Town – Stand ' })).toEqual({
      registrationNumber: 'KL 07 AB 1234',
      name: 'City Rider',
      route: 'Town – Stand',
    })
  })

  it('requires a registration number', () => {
    expect(validateBusProfile({ registrationNumber: '  ', name: '', route: '' })).toBe('Enter the bus registration number.')
    expect(validateBusProfile({ registrationNumber: 'KL 07 AB 1234', name: '', route: '' })).toBeNull()
  })
})
