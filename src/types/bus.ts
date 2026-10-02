export type BusProfile = {
  owner_id: string
  registration_number: string
  name: string | null
  route: string | null
  created_at: string
  updated_at: string
}

export type BusProfileInput = {
  registrationNumber: string
  name: string
  route: string
}
