import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createEmptyDraft, normalizeSheetDate } from '../lib/sheetDraft'
import type { CollectionSheetDraft } from '../types/sheet'

const maxImageBytes = 25 * 1024 * 1024
const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)

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
  try {
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
  if (!blob) throw new Error('Your browser could not compress this image.')
  return blob
  } finally { URL.revokeObjectURL(previewUrl) }
}

export function ScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('This photo format is not supported. Choose a JPEG, PNG, or HEIC image.'); setSelectedFile(null); return }
    if (file.size > maxImageBytes) { setError('Choose an image smaller than 25 MB.'); setSelectedFile(null); return }
    setSelectedPreview(URL.createObjectURL(file))
    setSelectedFile(file)
  }

  useEffect(() => () => { if (selectedPreview) URL.revokeObjectURL(selectedPreview) }, [selectedPreview])

  function retakePhoto() {
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

      let draft: CollectionSheetDraft = createEmptyDraft(id, photoPath)
      setProgress('Reading the sheet…')
      const { data, error: extractionError } = await supabase.functions.invoke('extract-collection-sheet', { body: { photoPath } })
      if (!extractionError && data?.draft) draft = { ...draft, ...data.draft, sheetDate: normalizeSheetDate(data.draft.sheetDate ?? '', draft.sheetDate), id, photoPath }
      if (extractionError || !data?.draft) draft.needsReview = ['OCR could not read this photo. Enter the values manually, then save the verified sheet.']
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
      <p className="settings-help">You will check every value before anything is saved.</p>
      <div className="scan-picker" aria-live="polite">
        {selectedPreview ? <img alt="Selected collection sheet" className="scan-picker__preview" src={selectedPreview} /> : <span aria-hidden="true">▣</span>}
        <strong>{progress ?? (selectedPreview ? 'Check this photo before continuing' : 'Choose a collection-sheet photo')}</strong><small>{progress ? 'Please keep this page open while the photo is processed.' : selectedPreview ? 'Make sure all writing is clear and the entire sheet is visible.' : 'Use the button below to open Camera or Photo Library.'}</small>
        {error && <p className="scan-picker__error" role="alert">{error}</p>}
      </div>
      <label className="native-picker-label">{selectedPreview ? 'Choose a different photo' : 'Choose photo'}<input accept="image/*,.heic" aria-label="Choose a collection sheet photo" className="native-picker-input" disabled={Boolean(progress)} onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = '' }} type="file" /></label>
      {selectedFile && <div className="photo-confirmation"><button className="secondary-action" onClick={retakePhoto} type="button">Retake photo</button><button className="primary-action" disabled={Boolean(progress)} onClick={() => void processSelectedPhoto()} type="button">{progress ?? 'Use this photo'}</button></div>}
    </section>
  )
}
