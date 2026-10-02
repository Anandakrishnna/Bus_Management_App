import { describe, expect, it } from 'vitest'
import { normalizeBusProfile, validateBusProfile } from './profile'

describe('bus profile helpers', () => {
  it('normalizes the editable bus-profile fields', () => {
    expect(normalizeBusProfile({ registrationNumber: ' kl-07 ab 1234 ', name: ' City Rider ', route: ' Town – Stand ' })).toEqual({
      registrationNumber: 'KL07AB1234',
      name: 'City Rider',
      route: 'Town – Stand',
    })
  })

  it('requires a valid Indian vehicle registration number', () => {
    expect(validateBusProfile({ registrationNumber: '  ', name: '', route: '' })).toBe('Enter the bus registration number.')
    expect(validateBusProfile({ registrationNumber: 'KL 07 AB 1234', name: '', route: '' })).toBeNull()
    expect(validateBusProfile({ registrationNumber: 'kl10q8081', name: '', route: '' })).toBeNull()
    expect(validateBusProfile({ registrationNumber: 'KL10Q808', name: '', route: '' })).toBe('Enter a valid registration number, for example KL10Q8081.')
    expect(validateBusProfile({ registrationNumber: 'not a plate', name: '', route: '' })).toBe('Enter a valid registration number, for example KL10Q8081.')
  })
})
