import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DAILY_LIMIT = 10

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const { count, error: countError } = await supabase
    .from('api_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('api_name', 'gemini_grounding')
    .eq('used_on', today)

  if (countError) {
    console.error('Error checking usage:', countError)
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if ((count || 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Daily limit of ' + DAILY_LIMIT + ' value lookups reached. Try again tomorrow.' },
      { status: 429 }
    )
  }

  const { assetId, vin, year, make, model, trim, mileage } = await request.json()

  const description = [year, make, model, trim].filter(Boolean).join(' ')
  const mileageText = mileage ? ' with approximately ' + mileage + ' miles' : ''

  const subject = vin
    ? 'the vehicle with VIN ' + vin + (description ? ' (' + description + ')' : '')
    : description

  if (!subject) {
    return NextResponse.json({ error: 'No VIN or make/model/year provided' }, { status: 400 })
  }

  const promptParts = [
    'Find the current CarMax value of ' + subject + mileageText + '.',
    'Search specifically on carmax.com for this vehicle or comparable listings.',
    'Only use CarMax as a source, not other sites.',
    'If CarMax has no relevant listings or data for this vehicle, say so clearly',
    'in source_note rather than substituting a different source.',
    'Respond with ONLY a JSON object, no other text, no markdown fences, in this exact format:',
    '{"estimated_value": <number>, "value_range_low": <number>, "value_range_high": <number>, "source_note": "<one or two sentences on what you found, mentioning CarMax specifically>"}',
  ]
  const prompt = promptParts.join(' ')

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  }

  await supabase.from('api_usage_log').insert({
    user_id: user.id,
    api_name: 'gemini_grounding',
    used_on: today,
  })

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' +
        process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error:', response.status, errText)
      return NextResponse.json(
        { error: 'Gemini API error: ' + response.status, detail: errText },
        { status: 500 }
      )
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    if (!cleaned) {
      console.error('Empty response from Gemini. Full payload:', JSON.stringify(data))
      return NextResponse.json(
        { error: 'Gemini returned no text', rawResponse: data },
        { status: 500 }
      )
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Gemini response:', cleaned)
      return NextResponse.json(
        { error: 'Could not parse value estimate from response', rawText: cleaned },
        { status: 500 }
      )
    }

    if (assetId) {
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          current_value: parsed.estimated_value,
          value_source: 'gemini_search',
          value_updated_at: new Date().toISOString(),
          vin: vin || undefined,
        })
        .eq('id', assetId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error saving value:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Value lookup error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
