import { describe, expect, it } from 'vitest'
import { normalizeBusProfile, validateBusProfile, validateOwnerContact } from './profile'

describe('bus profile helpers', () => {
  it('normalizes the editable bus-profile fields', () => {
    expect(normalizeBusProfile({ registrationNumber: ' kl-07 ab 1234 ', ownerName: ' Owner A ', phoneNumber: '+91 98765-43210', name: ' City Rider ', route: ' Town – Stand ' })).toEqual({
      registrationNumber: 'KL07AB1234',
      ownerName: 'Owner A',
      phoneNumber: '+919876543210',
      name: 'City Rider',
      route: 'Town – Stand',
    })
  })

  it('requires a valid Indian vehicle registration number', () => {
    expect(validateBusProfile({ registrationNumber: '  ', ownerName: '', phoneNumber: '', name: '', route: '' })).toBe('Enter the bus registration number.')
    expect(validateBusProfile({ registrationNumber: 'KL 07 AB 1234', ownerName: '', phoneNumber: '', name: '', route: '' })).toBeNull()
    expect(validateBusProfile({ registrationNumber: 'kl10q8081', ownerName: '', phoneNumber: '', name: '', route: '' })).toBeNull()
    expect(validateBusProfile({ registrationNumber: 'KL10Q808', ownerName: '', phoneNumber: '', name: '', route: '' })).toBe('Enter a valid registration number, for example KL10Q8081.')
    expect(validateBusProfile({ registrationNumber: 'not a plate', ownerName: '', phoneNumber: '', name: '', route: '' })).toBe('Enter a valid registration number, for example KL10Q8081.')
  })

  it('requires owner name and a valid Indian phone during initial setup', () => {
    const profile = { registrationNumber: 'KL10Q8081', ownerName: 'Anand', phoneNumber: '9876543210', name: 'City Rider', route: '' }
    expect(validateOwnerContact('', profile.phoneNumber)).toBe('Enter the owner name.')
    expect(validateOwnerContact(profile.ownerName, '12345')).toContain('valid Indian phone number')
    expect(validateBusProfile(profile, true)).toBeNull()
    expect(validateBusProfile({ ...profile, phoneNumber: '12345' }, true)).toContain('valid Indian phone number')
  })
})
