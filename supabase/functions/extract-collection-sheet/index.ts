import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const categories = ['batha_driver', 'batha_conductor', 'batha_cleaner', 'diesel', 'oil_grease', 'tyre', 'spare_parts', 'workshop', 'stand_fee', 'washing', 'others']

const schema = {
  type: 'object', additionalProperties: false, required: ['sheetDate', 'driverName', 'conductorName', 'cleanerName', 'expenses', 'collection', 'writtenTotal', 'writtenBalance', 'notes', 'needsReview'],
  properties: {
    sheetDate: { type: ['string', 'null'] }, driverName: { type: 'string' }, conductorName: { type: 'string' }, cleanerName: { type: 'string' },
    expenses: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['category', 'amount', 'note'], properties: { category: { type: 'string', enum: categories }, amount: { type: ['integer', 'null'] }, note: { type: 'string' } } }, },
    collection: { type: ['integer', 'null'] }, writtenTotal: { type: ['integer', 'null'] }, writtenBalance: { type: ['integer', 'null'] }, notes: { type: 'string' }, needsReview: { type: 'array', items: { type: 'string' } },
  },
}

function asBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return Response.json({ error: 'Sign in before extracting a sheet.' }, { status: 401, headers: corsHeaders })
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return Response.json({ error: 'Your session is no longer valid.' }, { status: 401, headers: corsHeaders })
    const { photoPath } = await request.json()
    if (typeof photoPath !== 'string' || !new RegExp(`^${user.id}/[0-9a-f-]{36}\\.jpg$`, 'i').test(photoPath)) return Response.json({ error: 'That photo does not belong to your account.' }, { status: 403, headers: corsHeaders })
    const { data: image, error: imageError } = await supabase.storage.from('sheet-photos').download(photoPath)
    if (imageError || !image) return Response.json({ error: 'We could not read the private sheet photo.' }, { status: 400, headers: corsHeaders })
    if (image.size > 5 * 1024 * 1024) return Response.json({ error: 'The prepared image is too large to read.' }, { status: 400, headers: corsHeaders })
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return Response.json({ error: 'OCR is not configured yet. You can still enter values manually.' }, { status: 503, headers: corsHeaders })
    const prompt = 'Read this Indian bus collection sheet. Map only printed values to the known fields. This bus has a driver, conductor, and cleaner; do not extract a checker. The Bette rows are staff wages: assign each only to the driver, conductor, or cleaner Bette category. Amounts must be whole rupees or null; never invent a value. Put uncertain or missing field names in needsReview. Preserve an Others explanation as its note. This is read-only extraction, not financial approval.'
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini', input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_image', image_url: `data:image/jpeg;base64,${asBase64(new Uint8Array(await image.arrayBuffer()))}`, detail: 'high' }] }], text: { format: { type: 'json_schema', name: 'collection_sheet_draft', strict: true, schema } } }) })
    if (!response.ok) return Response.json({ error: 'The sheet reader is temporarily unavailable. Enter the values manually.' }, { status: 502, headers: corsHeaders })
    const result = await response.json()
    const text = result.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).find((content: { type: string }) => content.type === 'output_text')?.text
    if (!text) throw new Error('No extraction result was returned.')
    return Response.json({ draft: JSON.parse(text) }, { headers: corsHeaders })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'We could not extract this sheet. Enter the values manually.' }, { status: 500, headers: corsHeaders })
  }
})
