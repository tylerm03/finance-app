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
    .eq('api_name', 'paystub_parse')
    .eq('used_on', today)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if ((count || 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Daily limit of ' + DAILY_LIMIT + ' paystub uploads reached. Try again tomorrow.' },
      { status: 429 }
    )
  }

  const { fileBase64 } = await request.json()

  if (!fileBase64) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  }

  const prompt = [
    'This is a paystub. Extract the following fields:',
    '- pay_date: the pay date or period end date, in YYYY-MM-DD format',
    '- gross_pay: the gross pay (pre-tax) for THIS pay period, as a plain number',
    '- net_pay: the net pay (take-home) for THIS pay period, as a plain number',
    '- pay_frequency: one of "weekly", "biweekly", "semimonthly", or "monthly", inferred from the pay period dates or stated frequency',
    'Respond with ONLY a JSON object, no other text, no markdown fences, in this exact format:',
    '{"pay_date": "YYYY-MM-DD", "gross_pay": <number>, "net_pay": <number>, "pay_frequency": "<one of the four options>"}',
    'If any field cannot be determined, use null for that field.',
  ].join(' ')

  await supabase.from('api_usage_log').insert({
    user_id: user.id,
    api_name: 'paystub_parse',
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
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'application/pdf', data: fileBase64 } },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini paystub parse error:', response.status, errText)
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
      console.error('Failed to parse paystub extraction:', cleaned)
      return NextResponse.json(
        { error: 'Could not parse extracted data', rawText: cleaned },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Paystub parse error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
