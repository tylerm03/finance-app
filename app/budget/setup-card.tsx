'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { BUDGET_SETUP_SQL } from '@/lib/budget/setup-sql'

const CARD = 'overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'

export default function SetupCard({ what = 'Budgets' }: { what?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <section className={CARD + ' border border-[#f3d9b8] p-6'}>
      <p className="mb-1 text-[17px] font-semibold">One-time setup needed</p>
      <p className="mb-4 text-[15px] text-[#5f5b55]">
        {what} need new tables in your database. Copy the setup below, then in Supabase open{' '}
        <b>SQL Editor → New query</b>, paste it and click <b>Run</b>. Then refresh this page.
      </p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(BUDGET_SETUP_SQL)
          setCopied(true)
        }}
        className="flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-[15px] font-medium text-white hover:bg-orange-600"
      >
        <Copy size={16} />
        {copied ? 'Copied' : 'Copy setup SQL'}
      </button>
    </section>
  )
}

