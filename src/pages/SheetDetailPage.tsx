import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'

type SheetDetail = { id: string; sheet_date: string; collection: number; total_operating_expense: number; daily_balance: number; written_total: number | null; written_balance: number | null; total_mismatch: boolean; balance_mismatch: boolean; photo_path: string; driver_name: string | null; conductor_name: string | null; checker_name: string | null; cleaner_name: string | null; notes: string | null }

export function SheetDetailPage() {
  const { id } = useParams()
  const [sheet, setSheet] = useState<SheetDetail | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase || !id) return
      const { data, error: requestError } = await supabase.from('sheet_summary').select('id, sheet_date, collection, total_operating_expense, daily_balance, written_total, written_balance, total_mismatch, balance_mismatch, photo_path, driver_name, conductor_name, checker_name, cleaner_name, notes').eq('id', id).maybeSingle()
      if (requestError || !data) { if (active) setError('We could not load this sheet.'); return }
      const record = data as SheetDetail
      const { data: signedPhoto } = await supabase.storage.from('sheet-photos').createSignedUrl(record.photo_path, 300)
      if (active) { setSheet(record); setPhotoUrl(signedPhoto?.signedUrl ?? null) }
    }
    void load()
    return () => { active = false }
  }, [id])
  if (error) return <section className="sheet-detail"><p className="form-feedback form-feedback--error" role="alert">{error}</p><Link className="secondary-action" to="/records">Back to records</Link></section>
  if (!sheet) return <section className="sheet-detail"><p className="settings-help">Loading sheet…</p></section>
  const people = [['Driver', sheet.driver_name], ['Conductor', sheet.conductor_name], ['Checker', sheet.checker_name], ['Cleaner', sheet.cleaner_name]].filter(([, value]) => value)
  return <section className="sheet-detail" aria-labelledby="sheet-detail-title"><Link className="quiet-link" to="/records">‹ Back to records</Link><p className="eyebrow">Verified collection sheet</p><h1 id="sheet-detail-title">{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${sheet.sheet_date}T00:00:00`))}</h1>{photoUrl && <a className="sheet-photo" href={photoUrl} rel="noreferrer" target="_blank"><img alt="Original collection sheet" src={photoUrl} /><span>Original sheet photo · Tap to expand</span></a>}<dl className="sheet-totals"><div><dt>Collection</dt><dd>{formatRupees(sheet.collection)}</dd></div><div><dt>Operating expense</dt><dd>{formatRupees(sheet.total_operating_expense)}</dd></div><div><dt>Daily balance</dt><dd>{formatRupees(sheet.daily_balance)}</dd></div></dl>{(sheet.total_mismatch || sheet.balance_mismatch) && <p className="review-notice">The paper totals differ from the calculated values. Review the original photo.</p>}{people.length > 0 && <section className="detail-section"><h2>Staff</h2>{people.map(([label, value]) => <p key={label}><strong>{label}: </strong>{value}</p>)}</section>}{sheet.notes && <section className="detail-section"><h2>Owner note</h2><p>{sheet.notes}</p></section>}</section>
}
