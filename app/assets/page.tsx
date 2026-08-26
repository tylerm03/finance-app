import { createClient } from '@/lib/supabase/server'
import AddVehicleForm from './add-vehicle-form'
import RefreshValueButton from './refresh-value-button'

export default async function AssetsPage() {
  const supabase = await createClient()

  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading assets: {error.message}
        </p>
      </div>
    )
  }

  const total = (assets || []).reduce((sum, a) => sum + Number(a.current_value || 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <p className="mb-1 text-sm text-gray-400">Total assets</p>
      <p className="mb-8 text-6xl font-semibold tabular-nums">${total.toFixed(2)}</p>

      <div className="mb-6">
        <AddVehicleForm />
      </div>

      {(!assets || assets.length === 0) && (
        <p className="text-gray-400">No assets yet — add a vehicle above.</p>
      )}

      {assets && assets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-100">{asset.name}</p>
                  {asset.trim && <p className="text-xs text-gray-400">{asset.trim}</p>}
                  {asset.mileage && (
                    <p className="text-xs text-gray-400">{asset.mileage.toLocaleString()} miles</p>
                  )}
                </div>
                <RefreshValueButton
                  assetId={asset.id}
                  vin={asset.vin}
                  year={asset.year}
                  make={asset.make}
                  model={asset.model}
                  trim={asset.trim}
                  mileage={asset.mileage}
                />
              </div>
              <p className="text-3xl font-semibold tabular-nums text-gray-100">
                {asset.current_value ? '$' + Number(asset.current_value).toFixed(2) : '—'}
              </p>
              {asset.value_updated_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Updated {new Date(asset.value_updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
