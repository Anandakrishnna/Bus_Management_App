import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createEmptyDraft } from '../lib/sheetDraft'
import type { CollectionSheetDraft } from '../types/sheet'

const maxImageBytes = 10 * 1024 * 1024

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
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose a JPEG, PNG, or another image file.'); return }
    if (file.size > maxImageBytes) { setError('Choose an image smaller than 10 MB.'); return }
    if (!supabase || !user) { setError('Your session has ended. Please sign in again.'); return }

    const id = crypto.randomUUID()
    const photoPath = `${user.id}/${id}.jpg`
    let previewUrl: string | null = null
    try {
      const selectedUrl = URL.createObjectURL(file)
      setSelectedPreview(selectedUrl)
      setProgress('Preparing your private photo…')
      const image = await compressImage(file)
      previewUrl = URL.createObjectURL(image)
      sessionStorage.setItem('busledger-sheet-photo-preview', previewUrl)
      setProgress('Uploading your private photo…')
      const { error: uploadError } = await supabase.storage.from('sheet-photos').upload(photoPath, image, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError

      let draft: CollectionSheetDraft = createEmptyDraft(id, photoPath)
      setProgress('Reading the sheet…')
      const { data, error: extractionError } = await supabase.functions.invoke('extract-collection-sheet', { body: { photoPath } })
      if (!extractionError && data?.draft) draft = { ...draft, ...data.draft, id, photoPath }
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
      <input accept="image/*" className="visually-hidden" onChange={(event) => void handleFile(event.target.files?.[0])} ref={inputRef} type="file" />
      <button className="scan-picker" disabled={Boolean(progress)} onClick={() => inputRef.current?.click()} type="button">
        {selectedPreview ? <img alt="Selected collection sheet" className="scan-picker__preview" src={selectedPreview} /> : <span aria-hidden="true">▣</span>}
        <strong>{progress ?? (selectedPreview ? 'Photo selected' : 'Take photo or choose from gallery')}</strong><small>{selectedPreview ? 'Preparing your private photo…' : 'Choose Camera or Photo Library. JPEG is compressed privately before review.'}</small>
      </button>
      {error && <p className="form-feedback form-feedback--error" role="alert">{error}</p>}
    </section>
  )
}
