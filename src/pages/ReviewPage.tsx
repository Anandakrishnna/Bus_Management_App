import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusProfile } from '../contexts/BusProfileContext'
import { formatRupees } from '../lib/money'
import { getExpenseLabel, localDateString, normalizeSheetDate, totalDraftExpenses, validateDraft } from '../lib/sheetDraft'
import { supabase } from '../lib/supabase'
import type { CollectionSheetDraft, DraftExpense } from '../types/sheet'

const steps = ['details', 'expenses', 'save'] as const

function asWholeRupees(value: string, allowNegative = false): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && (allowNegative ? parsed >= -2_147_483_648 && parsed <= 2_147_483_647 : parsed >= 0 && parsed <= 2_147_483_647) ? parsed : null
}

export function ReviewPage() {
  const { step = 'details' } = useParams()
  const navigate = useNavigate()
  const { profile } = useBusProfile()
  const [draft, setDraft] = useState<CollectionSheetDraft | null>(() => {
    const saved = sessionStorage.getItem('busledger-sheet-draft')
    if (!saved) return null
    const parsed = JSON.parse(saved) as CollectionSheetDraft
    return { ...parsed, busRegistrationNumber: profile?.registration_number ?? parsed.busRegistrationNumber ?? '', scannedBusRegistrationNumber: parsed.scannedBusRegistrationNumber ?? '', needsReview: parsed.needsReview ?? [] }
  })
  const [error, setError] = useState<string | null>(null)
  const [existingSheetId, setExistingSheetId] = useState<string | null>(null)
  const [invalidInputs, setInvalidInputs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => sessionStorage.getItem('busledger-sheet-photo-preview'))
  useEffect(() => { if (draft) sessionStorage.setItem('busledger-sheet-draft', JSON.stringify(draft)) }, [draft])
  useEffect(() => {
    let active = true
    if (!draft || !supabase) return () => { active = false }
    void supabase.storage.from('sheet-photos').createSignedUrl(draft.photoPath, 300).then(({ data }) => {
      if (active && data?.signedUrl) {
        setPhotoUrl(data.signedUrl)
        sessionStorage.setItem('busledger-sheet-photo-preview', data.signedUrl)
      }
    })
    return () => { active = false }
  }, [draft])
  const total = useMemo(() => totalDraftExpenses(draft?.expenses ?? []), [draft])
  if (!draft) return <section className="review-page"><h1>No sheet draft found</h1><Link className="primary-action" to="/scan">Choose a sheet photo</Link></section>
  const reviewedDraft: CollectionSheetDraft = draft
  const currentStep = steps.includes(step as typeof steps[number]) ? step as typeof steps[number] : 'details'
  const isFlagged = (key: string) => reviewedDraft.needsReview.includes(key)
  const clearFlag = (key: string) => setDraft((current) => current ? { ...current, needsReview: current.needsReview.filter((item) => item !== key) } : current)
  const updateExpense = (index: number, patch: Partial<DraftExpense>, confirmed = false, invalid = false) => setDraft((current) => {
    if (!current) return current
    const expense = current.expenses[index]
    const key = expense.category === 'others' ? `expense:others:${current.expenses.slice(0, index).filter((item) => item.category === 'others').length}` : `expense:${expense.category}`
    const needsReview = confirmed ? current.needsReview.filter((item) => item !== key) : invalid && !current.needsReview.includes(key) ? [...current.needsReview, key] : current.needsReview
    return { ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item), needsReview }
  })
  function readAmount(key: string, value: string, allowNegative = false): number | null {
    const amount = asWholeRupees(value, allowNegative)
    setInvalidInputs((current) => value.trim() !== '' && amount === null ? current.includes(key) ? current : [...current, key] : current.filter((item) => item !== key))
    return amount
  }
  async function saveSheet() {
    // Browser date controls display dates in the user's local format (for
    // example, 15/07/2026). Keep the database payload unambiguously ISO.
    const payload = {
      ...reviewedDraft,
      busRegistrationNumber: profile?.registration_number ?? '',
      sheetDate: normalizeSheetDate(reviewedDraft.sheetDate, ''),
    }
    if (invalidInputs.length > 0) { setError('Use whole rupees within the supported amount range.'); return }
    if (payload.needsReview.length > 0) { setError('Check every field marked “Needs review” against the original photo before saving. Enter 0 when the sheet shows no expense.'); return }
    const validation = validateDraft(payload); if (validation) { setError(validation); return }
    if (!profile?.registration_number) { setError('Bus number is not defined. Add the registration number in Settings before saving this sheet.'); return }
    if (!supabase) { setError('Supabase is not configured.'); return }
    setSaving(true); setError(null); setExistingSheetId(null)
    try {
      const { error: saveError } = await supabase.rpc('save_daily_sheet', {
        p_sheet: { id: payload.id, bus_registration_number: payload.busRegistrationNumber, sheet_date: payload.sheetDate, driver_name: payload.driverName, conductor_name: payload.conductorName, cleaner_name: payload.cleanerName, collection: payload.collection, written_total: payload.writtenTotal, written_balance: payload.writtenBalance, notes: payload.notes, photo_path: payload.photoPath },
        p_expenses: payload.expenses.filter((expense) => (expense.amount ?? 0) > 0).map((expense) => ({ category: expense.category, amount: expense.amount, note: expense.note })),
      })
      if (saveError) {
        if (saveError.code === '23505') {
          setError('A sheet already exists for this date. Open the saved sheet to review it.')
          setExistingSheetId(saveError.details?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? null)
        } else setError(saveError.message)
        return
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The sheet could not be saved. Check your connection and try again.')
      return
    } finally {
      setSaving(false)
    }
    sessionStorage.removeItem('busledger-sheet-draft'); sessionStorage.removeItem('busledger-sheet-photo-preview'); navigate(`/sheets/${payload.id}`)
  }
  return (
    <section className="review-page" aria-labelledby="review-title">
      <p className="eyebrow">Review before saving</p><h1 id="review-title">{currentStep === 'details' ? 'Sheet details' : currentStep === 'expenses' ? 'Expenses' : 'Review & save'}</h1>
      <div className="review-steps">{steps.map((item, index) => <Link aria-current={item === currentStep ? 'step' : undefined} className={item === currentStep ? 'review-step review-step--active' : 'review-step'} key={item} to={`/review/${item}`}>{index + 1}. {item === 'save' ? 'Save' : item}</Link>)}</div>
      {draft.needsReview.length > 0 && <p className="review-notice">Check the fields marked “Needs review” against the original photo. Type 0 for an expense that is blank on the sheet.</p>}
      {isFlagged('ocr:unmapped') && <p className="review-notice">The scanner flagged a field it could not identify. Check all remaining values against the photo, then <button className="text-button" onClick={() => clearFlag('ocr:unmapped')} type="button">Confirm review</button>.</p>}
      {photoUrl && <a className="sheet-photo" href={photoUrl} rel="noreferrer" target="_blank"><img alt="Original collection sheet — tap to expand" src={photoUrl} /><span>Original sheet photo · Tap to expand</span></a>}
      {currentStep === 'details' && <div className="review-form"><label>Bus number <input readOnly value={profile?.registration_number ?? 'Not defined in bus settings'} /></label>{reviewedDraft.scannedBusRegistrationNumber && <p className="settings-help">Number read from photo: {reviewedDraft.scannedBusRegistrationNumber}{reviewedDraft.scannedBusRegistrationNumber.replace(/[^a-z0-9]/gi, '').toUpperCase() !== reviewedDraft.busRegistrationNumber.replace(/[^a-z0-9]/gi, '').toUpperCase() && ' · Check that this photo belongs to the configured bus.'}</p>}{isFlagged('busRegistrationNumber') && <div className="review-notice">Bus number was unclear or did not match Settings. Confirm the photo belongs to {profile?.registration_number ?? 'your configured bus'} after checking the original. <button className="text-button" onClick={() => clearFlag('busRegistrationNumber')} type="button">Confirm bus</button></div>}<label>Date {isFlagged('sheetDate') && <em>Needs review</em>}<input max={localDateString()} onChange={(event) => setDraft({ ...draft, sheetDate: event.target.value, needsReview: draft.needsReview.filter((item) => item !== 'sheetDate') })} type="date" value={normalizeSheetDate(draft.sheetDate, '')} /></label>{(['driverName', 'conductorName', 'cleanerName'] as const).map((field) => <label key={field}>{field.replace('Name', '')} {isFlagged(field) && <em>Needs review</em>}<input onChange={(event) => setDraft({ ...draft, [field]: event.target.value, needsReview: draft.needsReview.filter((item) => item !== field) })} value={draft[field]} /></label>)}<Link className="primary-action" to="/review/expenses">Continue to expenses</Link></div>}
      {currentStep === 'expenses' && <div className="review-form">{draft.expenses.map((expense, index) => { const key = expense.category === 'others' ? `expense:others:${draft.expenses.slice(0, index).filter((item) => item.category === 'others').length}` : `expense:${expense.category}`; return <label className="expense-row" key={`${expense.category}-${index}`}><span>{getExpenseLabel(expense.category)} {isFlagged(key) && <em>Needs review</em>}</span><input inputMode="numeric" onChange={(event) => { const amount = readAmount(key, event.target.value); updateExpense(index, { amount }, amount !== null, event.target.value.trim() !== '' && amount === null) }} placeholder={isFlagged(key) ? 'Enter amount or 0' : '0'} value={expense.amount ?? ''} />{expense.category === 'others' && <input onChange={(event) => updateExpense(index, { note: event.target.value })} placeholder="Note" value={expense.note} />}</label>})}<button className="text-button" onClick={() => setDraft({ ...draft, expenses: [...draft.expenses, { category: 'others', amount: null, note: '' }], needsReview: [...draft.needsReview, `expense:others:${draft.expenses.filter((item) => item.category === 'others').length}`] })} type="button">+ Add another other expense</button><Link className="primary-action" to="/review/save">Continue to review</Link></div>}
      {currentStep === 'save' && <div className="review-form"><label>Collection {isFlagged('collection') && <em>Needs review</em>}<input inputMode="numeric" onChange={(event) => { const collection = readAmount('collection', event.target.value); setDraft({ ...draft, collection, needsReview: collection !== null ? draft.needsReview.filter((item) => item !== 'collection') : draft.needsReview }) }} placeholder="Required" value={draft.collection ?? ''} /></label><label>Paper total <em>Optional</em><input inputMode="numeric" onChange={(event) => setDraft({ ...draft, writtenTotal: readAmount('writtenTotal', event.target.value) })} value={draft.writtenTotal ?? ''} /></label><label>Paper balance <em>Optional</em><input inputMode="numeric" onChange={(event) => setDraft({ ...draft, writtenBalance: readAmount('writtenBalance', event.target.value, true) })} value={draft.writtenBalance ?? ''} /></label><label>Owner note <em>Optional</em><textarea onChange={(event) => setDraft({ ...draft, notes: event.target.value })} value={draft.notes} /></label><div className="review-summary"><span>Total operating expense <strong>{formatRupees(total)}</strong></span><span>Daily balance <strong>{formatRupees((draft.collection ?? 0) - total)}</strong></span><small>Balance = collection − Betta (driver, conductor, cleaner) − all other expenses</small></div>{draft.writtenTotal !== null && draft.writtenTotal !== total && <p className="review-notice">Possible mismatch: paper says {formatRupees(draft.writtenTotal)}, calculated {formatRupees(total)}.</p>}<button className="primary-action" disabled={saving} onClick={() => void saveSheet()} type="button">{saving ? 'Saving sheet…' : 'Save sheet'}</button></div>}
      {error && <p className="form-feedback form-feedback--error" role="alert">{error}{existingSheetId && <> <Link to={`/sheets/${existingSheetId}`}>Open saved sheet</Link></>}</p>}
    </section>
  )
}
