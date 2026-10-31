import BudgetView from './budget-view'
import ForecastView from './forecast/forecast-view'
import { loadForecast } from './forecast/load'
import { loadBudget } from './load'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string; scenario?: string }>
}) {
  const { month: monthParam, tab, scenario } = await searchParams

  if (tab === 'forecast') {
    const data = await loadForecast()
    return <ForecastView data={data} initialScenario={scenario || null} />
  }

  const data = await loadBudget(monthParam)
  return <BudgetView key={data.month} data={data} />
}
