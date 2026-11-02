import AccountsView from './accounts-view'
import { loadAccounts } from './load'

export default async function AccountsPage() {
  const { data, error, schwab } = await loadAccounts()

  if (error) {
    return (
      <div className="min-h-full bg-[#f6f5f3] p-6 text-gray-900">
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">Error loading accounts: {error}</p>
      </div>
    )
  }

  return <AccountsView data={data} schwab={schwab.status} />
}
