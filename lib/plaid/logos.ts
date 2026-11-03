// Bank logos, fetched once per connected bank and saved on plaid_items
// (columns logo + brand_color, added by the setup SQL).
//
// 1. Plaid's own logo for the bank, when it has one.
// 2. Otherwise the icon from the bank's website (Plaid doesn't have logos for
//    every bank, e.g. Chase).
// The saved value is a data: URL, or 'none' once both have been tried.
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

// Websites for big banks, in case Plaid doesn't list one
const KNOWN_SITES: [RegExp, string][] = [
  [/chase/i, 'chase.com'],
  [/bank of america/i, 'bankofamerica.com'],
  [/wells fargo/i, 'wellsfargo.com'],
  [/citi/i, 'citi.com'],
  [/capital one/i, 'capitalone.com'],
  [/american express|amex/i, 'americanexpress.com'],
  [/discover/i, 'discover.com'],
  [/schwab/i, 'schwab.com'],
  [/fidelity/i, 'fidelity.com'],
  [/vanguard/i, 'vanguard.com'],
  [/u\.?s\.? bank/i, 'usbank.com'],
  [/pnc/i, 'pnc.com'],
  [/truist/i, 'truist.com'],
  [/ally/i, 'ally.com'],
  [/sofi/i, 'sofi.com'],
  [/robinhood/i, 'robinhood.com'],
]

function siteFor(name: string, url: string | null | undefined) {
  if (url) {
    try {
      return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, '')
    } catch {}
  }
  return KNOWN_SITES.find(([re]) => re.test(name))?.[1] || null
}

// The bank website's icon as a data: URL (null if it can't be fetched)
async function websiteIcon(domain: string) {
  try {
    const res = await fetch('https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(domain), { cache: 'no-store' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/png'
    const buf = Buffer.from(await res.arrayBuffer())
    // Tiny responses are the generic "no icon" globe
    if (!type.startsWith('image/') || buf.length < 400) return null
    return 'data:' + type + ';base64,' + buf.toString('base64')
  } catch {
    return null
  }
}

function asDataUrl(saved: string | null) {
  if (!saved || saved === 'none' || saved === '') return null
  return saved.startsWith('data:') ? saved : 'data:image/png;base64,' + saved
}

// item id -> logo (data: URL) and brand color. Looks up any bank we haven't
// found a logo for yet, then remembers the answer.
export async function loadBankBrands(supabase: Supabase): Promise<Map<string, Brand>> {
  const out = new Map<string, Brand>()
  const { data, error } = await supabase
    .from('plaid_items')
    .select('id, plaid_item_id, access_token, institution_name, logo, brand_color')
  // Columns not added yet (setup SQL not run): just no logos
  if (error || !data) return out

  await Promise.all(
    data.map(async (item) => {
      let logo: string | null = item.logo
      let color: string | null = item.brand_color
      // null = never looked up; '' = looked up before website icons existed, so try once more
      if ((logo === null || logo === '') && item.access_token) {
        try {
          let url: string | null = null
          const it = await plaid.itemGet({ access_token: item.access_token })
          const institutionId = it.data.item.institution_id
          if (institutionId) {
            const inst = await plaid.institutionsGetById({
              institution_id: institutionId,
              country_codes: [CountryCode.Us],
              options: { include_optional_metadata: true },
            })
            logo = inst.data.institution.logo ? 'data:image/png;base64,' + inst.data.institution.logo : null
            color = inst.data.institution.primary_color || color
            url = inst.data.institution.url || null
          }
          if (!logo) {
            const site = siteFor(item.institution_name || '', url)
            logo = (site && (await websiteIcon(site))) || 'none'
          }
          await supabase.from('plaid_items').update({ logo, brand_color: color }).eq('id', item.id)
        } catch (e) {
          console.error('Bank logo lookup failed for item ' + item.plaid_item_id + ':', e)
          return
        }
      }
      out.set(item.plaid_item_id, { logo: asDataUrl(logo), color })
    })
  )
  return out
}
