import { createClient } from '@/lib/supabase/server'
import { loadSchwab } from '@/lib/schwab/server'
import SetPasswordForm from './set-password-form'
import SchwabCard from './schwab-card'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ schwab?: string }> }) {
  const { schwab: result } = await searchParams
  const supabase = await createClient()
  const [{ data: { user } }, schwab] = await Promise.all([supabase.auth.getUser(), loadSchwab(supabase)])

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="px-6 pb-3 pt-4">
        <h1 className="text-[22px] font-medium">Settings</h1>
      </header>
      <div className="space-y-4 px-4 pb-8">
        <SchwabCard status={schwab.status} result={result || null} accountCount={schwab.accounts.length} />
        <section className="max-w-lg rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
          <p className="mb-1 text-[17px] font-medium">Password</p>
          <p className="mb-5 text-[15px] text-[#77736d]">
            Logged in as {user?.email}. You only need this password once per browser — after that you
            stay logged in.
          </p>
          <SetPasswordForm />
        </section>
      </div>
    </div>
  )
}
