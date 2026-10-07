import type { BusProfileInput } from '../types/bus'

const indianRegistrationNumber = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/
const indianPhoneNumber = /^(?:\+?91)?[6-9]\d{9}$/

export function validateOwnerContact(ownerName: string, phoneNumber: string): string | null {
  if (!ownerName.trim()) return 'Enter the owner name.'
  const normalizedPhone = phoneNumber.trim().replace(/[\s()-]/g, '')
  if (!indianPhoneNumber.test(normalizedPhone)) return 'Enter a valid Indian phone number, including the 10-digit number and optional +91 code.'
  return null
}

export function normalizeBusProfile(input: BusProfileInput): BusProfileInput {
  return {
    registrationNumber: input.registrationNumber.trim().toUpperCase().replace(/[\s-]/g, ''),
    ownerName: input.ownerName.trim(),
    phoneNumber: input.phoneNumber.trim().replace(/[\s()-]/g, ''),
    name: input.name.trim(),
    route: input.route.trim(),
  }
}

export function validateBusProfile(input: BusProfileInput, requireContactDetails = false): string | null {
  if (requireContactDetails) {
    const contactError = validateOwnerContact(input.ownerName, input.phoneNumber)
    if (contactError) return contactError
  }
  if (!input.registrationNumber.trim()) return 'Enter the bus registration number.'
  if (!indianRegistrationNumber.test(normalizeBusProfile(input).registrationNumber)) {
    return 'Enter a valid registration number, for example KL10Q8081.'
  }
  return null
}
