// Bank logos from Plaid, fetched once per connected bank and saved on plaid_items
// (columns logo + brand_color, added by the setup SQL).
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments } from 'plaid'
import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET': process.env.PLAID_SECRET!,
      },
    },
  })
)

export type Brand = { logo: string | null; color: string | null }

// item id -> logo (as a data: URL) and brand color. Looks up any bank we haven't
// asked Plaid about yet; an empty string is saved when Plaid has no logo so we
// don't ask again.
export async function loadBankBrands(supabase: Supabase): Promise<Map<string, Brand>> {
  const out = new Map<string, Brand>()
  const { data, error } = await supabase.from('plaid_items').select('id, plaid_item_id, access_token, logo, brand_color')
  // Columns not added yet (setup SQL not run): just no logos
  if (error || !data) return out

  await Promise.all(
    data.map(async (item) => {
      let logo: string | null = item.logo
      let color: string | null = item.brand_color
      if (logo === null && item.access_token) {
        try {
          const it = await plaid.itemGet({ access_token: item.access_token })
          const institutionId = it.data.item.institution_id
          if (institutionId) {
            const inst = await plaid.institutionsGetById({
              institution_id: institutionId,
              country_codes: [CountryCode.Us],
              options: { include_optional_metadata: true },
            })
            logo = inst.data.institution.logo || ''
            color = inst.data.institution.primary_color || null
          } else {
            logo = ''
          }
          await supabase.from('plaid_items').update({ logo, brand_color: color }).eq('id', item.id)
        } catch (e) {
          console.error('Bank logo lookup failed for item ' + item.plaid_item_id + ':', e)
          return
        }
      }
      out.set(item.plaid_item_id, { logo: logo ? 'data:image/png;base64,' + logo : null, color })
    })
  )
  return out
}
