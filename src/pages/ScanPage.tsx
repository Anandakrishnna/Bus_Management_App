import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBusProfile } from '../contexts/BusProfileContext'
import { supabase } from '../lib/supabase'
import { createEmptyDraft, normalizeSheetDate } from '../lib/sheetDraft'
import { standardExpenseCategories, type CollectionSheetDraft, type DraftExpense } from '../types/sheet'

const maxImageBytes = 25 * 1024 * 1024
const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)

function normalizeReviewKey(value: string, validKeys: ReadonlySet<string>): string | null {
  if (validKeys.has(value)) return value
  const normalized = value.toLowerCase().replace(/[_-]+/g, ' ').trim()
  if (/bus|vehicle|registration/.test(normalized)) return 'busRegistrationNumber'
  if (/date/.test(normalized)) return 'sheetDate'
  if (/collection/.test(normalized)) return 'collection'
  const wage = /betta|batha|wage|expense/.test(normalized)
  if (/driver/.test(normalized)) return wage ? 'expense:batha_driver' : 'driverName'
  if (/conductor/.test(normalized)) return wage ? 'expense:batha_conductor' : 'conductorName'
  if (/cleaner/.test(normalized)) return wage ? 'expense:batha_cleaner' : 'cleanerName'
  if (/diesel/.test(normalized)) return 'expense:diesel'
  if (/oil|grease/.test(normalized)) return 'expense:oil_grease'
  if (/tyre|tire/.test(normalized)) return 'expense:tyre'
  if (/spare|parts/.test(normalized)) return 'expense:spare_parts'
  if (/workshop/.test(normalized)) return 'expense:workshop'
  if (/scan/.test(normalized)) return 'expense:scan_fee'
  if (/washing/.test(normalized)) return 'expense:washing'
  if (/other/.test(normalized)) return 'expense:others'
  return null
}

function createSheetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16)
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

function withTimeout<T>(request: PromiseLike<T>, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(request),
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), 45_000)),
  ])
}

async function compressImage(file: File): Promise<Blob> {
  const previewUrl = URL.createObjectURL(file)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Your phone could not read this image.'))
    element.src = previewUrl
  })
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not prepare this image.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
  URL.revokeObjectURL(previewUrl)
  if (!blob) throw new Error('Your browser could not compress this image.')
  return blob
}

export function ScanPage() {
  const { user } = useAuth()
  const { profile } = useBusProfile()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    const selectedUrl = URL.createObjectURL(file)
    setSelectedPreview(selectedUrl)
    if (!file.type.startsWith('image/')) { setError('This photo format is not supported. Choose a JPEG, PNG, or HEIC image.'); setSelectedFile(null); return }
    if (file.size > maxImageBytes) { setError('Choose an image smaller than 25 MB.'); setSelectedFile(null); return }
    setSelectedFile(file)
  }

  function retakePhoto() {
    if (selectedPreview) URL.revokeObjectURL(selectedPreview)
    setSelectedFile(null)
    setSelectedPreview(null)
    setError(null)
  }

  async function processSelectedPhoto() {
    const file = selectedFile
    if (!file) return
    if (!supabase || !user) { setError('Your session has ended. Please sign in again.'); return }

    let previewUrl: string | null = null
    try {
      const id = createSheetId()
      const photoPath = `${user.id}/${id}.jpg`
      setProgress('Preparing your private photo…')
      // iPhone Safari can stall while drawing a captured JPEG to canvas. The
      // original JPEG is already compatible with private Storage and OCR.
      const image = isAppleMobile && file.type === 'image/jpeg' ? file : await compressImage(file)
      previewUrl = URL.createObjectURL(image)
      sessionStorage.setItem('busledger-sheet-photo-preview', previewUrl)
      setProgress('Uploading your private photo…')
      const { error: uploadError } = await withTimeout(supabase.storage.from('sheet-photos').upload(photoPath, image, { contentType: 'image/jpeg', upsert: false }), 'The photo upload took too long. Check your connection and try again.')
      if (uploadError) throw uploadError

      let draft: CollectionSheetDraft = { ...createEmptyDraft(id, photoPath), busRegistrationNumber: profile?.registration_number ?? '' }
      setProgress('Reading the sheet…')
      const { data, error: extractionError } = await supabase.functions.invoke('extract-collection-sheet', { body: { photoPath } })
      if (!extractionError && data?.draft) {
        const extracted = data.draft
        const extractedExpenses = Array.isArray(extracted.expenses) ? extracted.expenses as DraftExpense[] : []
        const validReviewKeys = new Set(['busRegistrationNumber', 'sheetDate', 'driverName', 'conductorName', 'cleanerName', 'collection', ...standardExpenseCategories.map((category) => `expense:${category}`), 'expense:others'])
        const rawReviewKeys: unknown[] = Array.isArray(extracted.needsReview) ? extracted.needsReview : []
        const requestedReviewKeys = rawReviewKeys.flatMap((key) => typeof key === 'string' ? [normalizeReviewKey(key, validReviewKeys)] : []).filter((key): key is string => key !== null)
        const hasUnmappedReview = requestedReviewKeys.length < rawReviewKeys.length
        const expenses: DraftExpense[] = standardExpenseCategories.map((category) => {
          const matches = extractedExpenses.filter((expense) => expense.category === category)
          return matches.length === 1 ? { ...matches[0], amount: Number.isInteger(matches[0].amount) && (matches[0].amount ?? -1) >= 0 && (matches[0].amount ?? 2_147_483_648) <= 2_147_483_647 ? matches[0].amount : null } : { category, amount: null, note: '' }
        })
        expenses.push(...extractedExpenses.filter((expense) => expense.category === 'others'))
        if (requestedReviewKeys.includes('expense:others') && !expenses.some((expense) => expense.category === 'others')) expenses.push({ category: 'others', amount: null, note: '' })
        const modelReviewKeys = requestedReviewKeys.map((key) => key === 'expense:others' ? 'expense:others:0' : key)
        const sheetDate = normalizeSheetDate(typeof extracted.sheetDate === 'string' ? extracted.sheetDate : '', '')
        draft = {
          ...draft,
          busRegistrationNumber: profile?.registration_number ?? '',
          scannedBusRegistrationNumber: typeof extracted.busRegistrationNumber === 'string' ? extracted.busRegistrationNumber.trim().toUpperCase() : '',
          sheetDate,
          driverName: typeof extracted.driverName === 'string' ? extracted.driverName.trim() : '',
          conductorName: typeof extracted.conductorName === 'string' ? extracted.conductorName.trim() : '',
          cleanerName: typeof extracted.cleanerName === 'string' ? extracted.cleanerName.trim() : '',
          expenses,
          collection: Number.isInteger(extracted.collection) && extracted.collection >= 0 && extracted.collection <= 2_147_483_647 ? extracted.collection : null,
          writtenTotal: Number.isInteger(extracted.writtenTotal) && extracted.writtenTotal >= 0 && extracted.writtenTotal <= 2_147_483_647 ? extracted.writtenTotal : null,
          writtenBalance: Number.isInteger(extracted.writtenBalance) && extracted.writtenBalance >= -2_147_483_648 && extracted.writtenBalance <= 2_147_483_647 ? extracted.writtenBalance : null,
          notes: typeof extracted.notes === 'string' ? extracted.notes : '',
          needsReview: [
            ...modelReviewKeys,
            ...(hasUnmappedReview ? ['ocr:unmapped'] : []),
            ...(!sheetDate ? ['sheetDate'] : []),
            ...(!extracted.driverName?.trim() ? ['driverName'] : []),
            ...(!extracted.conductorName?.trim() ? ['conductorName'] : []),
            ...(!extracted.cleanerName?.trim() ? ['cleanerName'] : []),
            ...(expenses.filter((expense) => expense.category !== 'others' && expense.amount === null).map((expense) => `expense:${expense.category}`)),
            ...(expenses.filter((expense) => expense.category === 'others' && expense.amount === null).map((_, index) => `expense:others:${index}`)),
            ...(!Number.isInteger(extracted.collection) || extracted.collection < 0 || extracted.collection > 2_147_483_647 ? ['collection'] : []),
            ...(!extracted.busRegistrationNumber?.trim() || (profile && extracted.busRegistrationNumber.replace(/[^a-z0-9]/gi, '').toUpperCase() !== profile.registration_number.replace(/[^a-z0-9]/gi, '').toUpperCase()) ? ['busRegistrationNumber'] : []),
          ],
        }
      } else {
        draft.needsReview = ['sheetDate', 'driverName', 'conductorName', 'cleanerName', 'collection', 'busRegistrationNumber', ...standardExpenseCategories.map((category) => `expense:${category}`)]
      }
      sessionStorage.setItem('busledger-sheet-draft', JSON.stringify(draft))
      navigate('/review/details')
    } catch (reason) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      sessionStorage.removeItem('busledger-sheet-photo-preview')
      setError(reason instanceof Error ? reason.message : 'We could not prepare this sheet. Please try again.')
    } finally { setProgress(null) }
  }

  return (
    <section className="scan-page" aria-labelledby="scan-title">
      <p className="eyebrow">New daily sheet</p>
      <h1 id="scan-title">Scan collection sheet</h1>
      <p className="settings-help">Bus number: {profile?.registration_number || 'Not defined in bus settings.'} · You will check every value before anything is saved.</p>
      <div className="scan-picker" aria-live="polite">
        {selectedPreview ? <img alt="Selected collection sheet" className="scan-picker__preview" src={selectedPreview} /> : <span aria-hidden="true">▣</span>}
        <strong>{progress ?? (selectedPreview ? 'Check this photo before continuing' : 'Choose a collection-sheet photo')}</strong><small>{progress ? 'Please keep this page open while the photo is processed.' : selectedPreview ? 'Make sure all writing is clear and the entire sheet is visible.' : 'Use the button below to open Camera or Photo Library.'}</small>
        {error && <p className="scan-picker__error" role="alert">{error}</p>}
      </div>
      <label className="native-picker-label">{selectedPreview ? 'Choose a different photo' : 'Choose photo'}<input accept="image/*,.heic" aria-label="Choose a collection sheet photo" className="native-picker-input" disabled={Boolean(progress)} onChange={(event) => handleFile(event.target.files?.[0])} type="file" /></label>
      {selectedFile && <div className="photo-confirmation"><button className="secondary-action" onClick={retakePhoto} type="button">Retake photo</button><button className="primary-action" disabled={Boolean(progress)} onClick={() => void processSelectedPhoto()} type="button">{progress ?? 'Use this photo'}</button></div>}
    </section>
  )
}
