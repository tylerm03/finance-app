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
    .eq('api_name', 'tax_estimate')
    .eq('used_on', today)

  if (countError) {
    console.error('Error checking usage:', countError)
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if ((count || 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Daily limit of ' + DAILY_LIMIT + ' tax estimates reached. Try again tomorrow.' },
      { status: 429 }
    )
  }

  const { annualGrossIncome, state, zipCode } = await request.json()

  if (!annualGrossIncome || !state) {
    return NextResponse.json({ error: 'Annual gross income and state are required' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  }

  const prompt = [
    'Estimate the total tax burden for a single filer with annual gross income of $' + annualGrossIncome,
    'living in ' + state + (zipCode ? ', zip code ' + zipCode : '') + ', for the current tax year.',
    'Search for current federal income tax brackets and ' + state + ' state income tax rates.',
    'Include federal income tax, state income tax (0 if the state has no income tax), and',
    'FICA (Social Security 6.2% up to the wage base, and Medicare 1.45%).',
    'Assume standard deduction, single filer, no other adjustments.',
    'Respond with ONLY a JSON object, no other text, no markdown fences, in this exact format:',
    '{"federal_tax": <number>, "state_tax": <number>, "fica_tax": <number>, "total_tax": <number>, "effective_rate": <number>, "source_note": "<one short sentence on assumptions made>"}',
  ].join(' ')

  await supabase.from('api_usage_log').insert({
    user_id: user.id,
    api_name: 'tax_estimate',
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
      console.error('Gemini tax estimate error:', response.status, errText)
      return NextResponse.json(
        { error: 'Gemini API error: ' + response.status, detail: errText },
        { status: 500 }
      )
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    if (!cleaned) {
      return NextResponse.json({ error: 'Gemini returned no text' }, { status: 500 })
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse tax estimate response:', cleaned)
      return NextResponse.json(
        { error: 'Could not parse tax estimate', rawText: cleaned },
        { status: 500 }
      )
    }

    await supabase.from('user_tax_settings').upsert({
      user_id: user.id,
      state,
      zip_code: zipCode || null,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Tax estimate error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
