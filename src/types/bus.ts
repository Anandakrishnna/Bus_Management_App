export type BusProfile = {
  owner_id: string
  registration_number: string
  name: string | null
  owner_name: string | null
  phone_number: string | null
  route: string | null
  created_at: string
  updated_at: string
}

export type BusProfileInput = {
  registrationNumber: string
  ownerName: string
  phoneNumber: string
  name: string
  route: string
}
