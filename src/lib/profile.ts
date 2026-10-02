import type { BusProfileInput } from '../types/bus'

export function normalizeBusProfile(input: BusProfileInput): BusProfileInput {
  return {
    registrationNumber: input.registrationNumber.trim().toUpperCase(),
    name: input.name.trim(),
    route: input.route.trim(),
  }
}

export function validateBusProfile(input: BusProfileInput): string | null {
  if (!input.registrationNumber.trim()) return 'Enter the bus registration number.'
  return null
}
