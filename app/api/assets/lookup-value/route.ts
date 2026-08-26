import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { assetId, year, make, model, trim, mileage } = await request.json()

  const description = [year, make, model, trim].filter(Boolean).join(' ')
  const mileageText = mileage ? ' with approximately ' + mileage + ' miles' : ''

  const prompt =
    'Search for the current private-party or trade-in market value of a ' +
    description + mileageText + '. ' +
    'Respond with ONLY a JSON object, no other text, no markdown fences, in this exact format: ' +
    '{"estimated_value": <number>, "value_range_low": <number>, "value_range_high": <number>, "source_note": "<one short sentence on where this estimate came from>"}'

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
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
      console.error('Gemini API error:', errText)
      return NextResponse.json({ error: 'Gemini API error: ' + response.status }, { status: 500 })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Gemini response:', cleaned)
      return NextResponse.json(
        { error: 'Could not parse value estimate from response' },
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
