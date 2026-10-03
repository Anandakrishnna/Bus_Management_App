import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatRupees } from '../lib/money'
import { getExpenseLabel, normalizeSheetDate, totalDraftExpenses, validateDraft } from '../lib/sheetDraft'
import { supabase } from '../lib/supabase'
import type { CollectionSheetDraft, DraftExpense } from '../types/sheet'

const steps = ['details', 'expenses', 'save'] as const

function asWholeRupees(value: string, allowNegative = false): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && (allowNegative || parsed >= 0) ? parsed : null
}

export function ReviewPage() {
  const { step = 'details' } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<CollectionSheetDraft | null>(() => {
    const saved = sessionStorage.getItem('busledger-sheet-draft')
    return saved ? JSON.parse(saved) as CollectionSheetDraft : null
  })
  const [error, setError] = useState<string | null>(null)
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
  const updateExpense = (index: number, patch: Partial<DraftExpense>) => setDraft((current) => current ? { ...current, expenses: current.expenses.map((expense, itemIndex) => itemIndex === index ? { ...expense, ...patch } : expense) } : current)
  async function saveSheet() {
    // Browser date controls display dates in the user's local format (for
    // example, 15/07/2026). Keep the database payload unambiguously ISO.
    const payload = {
      ...reviewedDraft,
      sheetDate: normalizeSheetDate(reviewedDraft.sheetDate, new Date().toISOString().slice(0, 10)),
    }
    const validation = validateDraft(payload); if (validation) { setError(validation); return }
    if (!supabase) { setError('Supabase is not configured.'); return }
    setSaving(true); setError(null)
    const { error: saveError } = await supabase.rpc('save_daily_sheet', {
      p_sheet: { id: payload.id, sheet_date: payload.sheetDate, driver_name: payload.driverName, conductor_name: payload.conductorName, checker_name: payload.checkerName, cleaner_name: payload.cleanerName, collection: payload.collection, written_total: payload.writtenTotal, written_balance: payload.writtenBalance, notes: payload.notes, photo_path: payload.photoPath },
      p_expenses: payload.expenses.filter((expense) => (expense.amount ?? 0) > 0).map((expense) => ({ category: expense.category, amount: expense.amount, note: expense.note })),
    })
    setSaving(false)
    if (saveError) { setError(saveError.message); return }
    sessionStorage.removeItem('busledger-sheet-draft'); sessionStorage.removeItem('busledger-sheet-photo-preview'); navigate('/')
  }
  return (
    <section className="review-page" aria-labelledby="review-title">
      <p className="eyebrow">Review before saving</p><h1 id="review-title">{currentStep === 'details' ? 'Sheet details' : currentStep === 'expenses' ? 'Expenses' : 'Review & save'}</h1>
      <div className="review-steps">{steps.map((item, index) => <Link aria-current={item === currentStep ? 'step' : undefined} className={item === currentStep ? 'review-step review-step--active' : 'review-step'} key={item} to={`/review/${item}`}>{index + 1}. {item === 'save' ? 'Save' : item}</Link>)}</div>
      {draft.needsReview.length > 0 && <p className="review-notice">Needs review: {draft.needsReview.join(', ')}</p>}
      {photoUrl && <a className="sheet-photo" href={photoUrl} rel="noreferrer" target="_blank"><img alt="Original collection sheet — tap to expand" src={photoUrl} /><span>Original sheet photo · Tap to expand</span></a>}
      {currentStep === 'details' && <div className="review-form"><label>Date<input max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, sheetDate: normalizeSheetDate(event.target.value, draft.sheetDate) })} type="date" value={normalizeSheetDate(draft.sheetDate, new Date().toISOString().slice(0, 10))} /></label>{(['driverName', 'conductorName', 'checkerName', 'cleanerName'] as const).map((field) => <label key={field}>{field.replace('Name', '')}<input onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} value={draft[field]} /></label>)}<Link className="primary-action" to="/review/expenses">Continue to expenses</Link></div>}
      {currentStep === 'expenses' && <div className="review-form">{draft.expenses.map((expense, index) => <label className="expense-row" key={`${expense.category}-${index}`}><span>{getExpenseLabel(expense.category)}</span><input inputMode="numeric" onChange={(event) => updateExpense(index, { amount: asWholeRupees(event.target.value) })} placeholder="0" value={expense.amount ?? ''} />{expense.category === 'others' && <input onChange={(event) => updateExpense(index, { note: event.target.value })} placeholder="Note" value={expense.note} />}</label>)}<button className="text-button" onClick={() => setDraft({ ...draft, expenses: [...draft.expenses, { category: 'others', amount: null, note: '' }] })} type="button">+ Add another other expense</button><Link className="primary-action" to="/review/save">Continue to review</Link></div>}
      {currentStep === 'save' && <div className="review-form"><label>Collection<input inputMode="numeric" onChange={(event) => setDraft({ ...draft, collection: asWholeRupees(event.target.value) })} placeholder="Required" value={draft.collection ?? ''} /></label><label>Paper total <em>Optional</em><input inputMode="numeric" onChange={(event) => setDraft({ ...draft, writtenTotal: asWholeRupees(event.target.value) })} value={draft.writtenTotal ?? ''} /></label><label>Paper balance <em>Optional</em><input inputMode="numeric" onChange={(event) => setDraft({ ...draft, writtenBalance: asWholeRupees(event.target.value, true) })} value={draft.writtenBalance ?? ''} /></label><label>Owner note <em>Optional</em><textarea onChange={(event) => setDraft({ ...draft, notes: event.target.value })} value={draft.notes} /></label><div className="review-summary"><span>Total operating expense <strong>{formatRupees(total)}</strong></span><span>Daily balance <strong>{formatRupees((draft.collection ?? 0) - total)}</strong></span></div>{draft.writtenTotal !== null && draft.writtenTotal !== total && <p className="review-notice">Possible mismatch: paper says {formatRupees(draft.writtenTotal)}, calculated {formatRupees(total)}.</p>}<button className="primary-action" disabled={saving} onClick={() => void saveSheet()} type="button">{saving ? 'Saving sheet…' : 'Save sheet'}</button></div>}
      {error && <p className="form-feedback form-feedback--error" role="alert">{error}</p>}
    </section>
  )
}
