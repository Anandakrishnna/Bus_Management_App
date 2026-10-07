import { useState, type FormEvent } from 'react'
import { validateBusProfile } from '../lib/profile'
import { strings } from '../strings'
import type { BusProfileInput } from '../types/bus'

type BusProfileFormProps = {
  initialValue?: BusProfileInput
  onSave: (input: BusProfileInput) => Promise<string | null>
  submitLabel: string
  requireContactDetails?: boolean
}

const blankProfile: BusProfileInput = { registrationNumber: '', ownerName: '', phoneNumber: '', name: '', route: '' }

export function BusProfileForm({ initialValue = blankProfile, onSave, submitLabel, requireContactDetails = false }: BusProfileFormProps) {
  const [form, setForm] = useState<BusProfileInput>(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof BusProfileInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    const validationError = validateBusProfile(form, requireContactDetails)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSubmitting(true)
    const saveError = await onSave(form)
    setIsSubmitting(false)
    if (saveError) setError(saveError)
    else setSuccess(strings.savedChanges)
  }

  return (
    <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
      <label>
        <span>Owner name{requireContactDetails && <em>Required</em>}</span>
        <input autoComplete="name" onChange={(event) => updateField('ownerName', event.target.value)} required={requireContactDetails} value={form.ownerName} />
      </label>
      <label>
        <span>Phone number{requireContactDetails && <em>Required</em>}</span>
        <input autoComplete="tel" inputMode="tel" onChange={(event) => updateField('phoneNumber', event.target.value)} required={requireContactDetails} type="tel" value={form.phoneNumber} />
      </label>
      <label>
        <span>{strings.registrationNumber}</span>
        <input autoCapitalize="characters" autoComplete="off" maxLength={13} onChange={(event) => updateField('registrationNumber', event.target.value)} placeholder="KL10Q8081" required value={form.registrationNumber} />
      </label>
      <label>
        <span>{strings.vehicleName} <em>{strings.optional}</em></span>
        <input autoComplete="off" onChange={(event) => updateField('name', event.target.value)} value={form.name} />
      </label>
      <label>
        <span>{strings.route} <em>{strings.optional}</em></span>
        <input autoComplete="off" onChange={(event) => updateField('route', event.target.value)} value={form.route} />
      </label>
      {error && <p className="form-feedback form-feedback--error" role="alert">{error}</p>}
      {success && <p className="form-feedback" role="status">{success}</p>}
      <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? strings.savingProgress : submitLabel}</button>
    </form>
  )
}
