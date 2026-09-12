'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddPaystubForm() {
  const [stage, setStage] = useState<'idle' | 'parsing' | 'review' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [payDate, setPayDate] = useState('')
  const [grossPay, setGrossPay] = useState('')
  const [netPay, setNetPay] = useState('')
  const [frequency, setFrequency] = useState('biweekly')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setStage('parsing')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setStage('idle')
      return
    }

    // Read the file as base64 for sending to Gemini
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // Upload the original PDF to storage, keyed under the user's folder
    const storagePath = user.id + '/' + Date.now() + '-' + file.name
    const { error: uploadError } = await supabase.storage
      .from('paystub-pdfs')
      .upload(storagePath, file)

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message)
      setStage('idle')
      return
    }

    setPdfPath(storagePath)

    // Ask Gemini to extract the numbers from the PDF
    const res = await fetch('/api/paystubs/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64 }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setStage('idle')
      return
    }

    setPayDate(data.pay_date || '')
    setGrossPay(data.gross_pay != null ? String(data.gross_pay) : '')
    setNetPay(data.net_pay != null ? String(data.net_pay) : '')
    setFrequency(data.pay_frequency || 'biweekly')
    setStage('review')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStage('saving')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStage('review')
      return
    }

    await supabase.from('paystubs').insert({
      user_id: user.id,
      pay_date: payDate,
      gross_pay: parseFloat(grossPay),
      net_pay: parseFloat(netPay),
      pay_frequency: frequency,
      pdf_path: pdfPath,
    })

    setStage('idle')
    setPayDate('')
    setGrossPay('')
    setNetPay('')
    setPdfPath(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  function handleCancel() {
    setStage('idle')
    setPdfPath(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (stage === 'idle') {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="paystub-upload"
        />
        <label
          htmlFor="paystub-upload"
          className="inline-block cursor-pointer rounded bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-400"
        >
          Upload a paystub (PDF)
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (stage === 'parsing') {
    return <p className="text-sm text-gray-500">Reading your paystub...</p>
  }

  return (
    <form onSubmit={handleSave} className="rounded border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm text-gray-500">
        Extracted from your PDF — double check these before saving:
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Pay date</label>
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            required
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Gross pay (pre-tax)</label>
          <input
            type="number"
            step="0.01"
            value={grossPay}
            onChange={(e) => setGrossPay(e.target.value)}
            required
            className="w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Net pay (take-home)</label>
          <input
            type="number"
            step="0.01"
            value={netPay}
            onChange={(e) => setNetPay(e.target.value)}
            required
            className="w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Pay frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semimonthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={stage === 'saving'}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50"
        >
          {stage === 'saving' ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
