import type { BusProfileInput } from '../types/bus'

const indianRegistrationNumber = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/

export function normalizeBusProfile(input: BusProfileInput): BusProfileInput {
  return {
    registrationNumber: input.registrationNumber.trim().toUpperCase().replace(/[\s-]/g, ''),
    name: input.name.trim(),
    route: input.route.trim(),
  }
}

export function validateBusProfile(input: BusProfileInput): string | null {
  if (!input.registrationNumber.trim()) return 'Enter the bus registration number.'
  if (!indianRegistrationNumber.test(normalizeBusProfile(input).registrationNumber)) {
    return 'Enter a valid registration number, for example KL10Q8081.'
  }
  return null
}
