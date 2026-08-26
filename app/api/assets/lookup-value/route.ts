import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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

  const prompt =
    'Find the current market value of ' + subject + mileageText + '. ' +
    'Search for comparable listings and pricing data from sources like Cars.com, ' +
    'AutoTrader, CarGurus, CarMax, Edmunds, and KBB. Look for actual asking prices ' +
    'or sold prices for similar vehicles (same year/make/model/trim, similar mileage), ' +
    'not just generic pricing guides. If this is an uncommon vehicle with limited ' +
    'listings, say so in source_note and give your best estimate based on whatever ' +
    'comparable data you can find, being clear about the uncertainty. ' +
    'Respond with ONLY a JSON object, no other text, no markdown fences, in this exact format: ' +
    '{"estimated_value": <number>, "value_range_low": <number>, "value_range_high": <number>, "source_note": "<one or two sentences on what you found and how confident you are>"}'

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  }

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
