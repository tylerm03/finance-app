'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Info, Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMoney } from '@/lib/format'
import { EVENT_KINDS, compact, project, type ForecastEvent, type Scenario } from '@/lib/forecast/model'
import { EVENT_COLORS, Icon } from '@/lib/forecast/icons'
import PageTabs from '../page-tabs'
import SetupCard from '../setup-card'
import ForecastChart from './forecast-chart'
import ScenarioBar from './scenario-bar'
import ScenarioTitle from './scenario-menu'
import { AssumptionsDrawer, EventDrawer } from './drawers'
import type { ForecastData } from './load'

const CARD = 'rounded-2xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'
const BTN = 'flex h-11 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[16px] font-medium hover:bg-[#faf9f7]'

type Row = { id: string; name: string; icon: string; color: string; assumptions: unknown; events: unknown; position: number }

function toDb(s: Scenario) {
  return { name: s.name, icon: s.icon, color: s.color, assumptions: s.assumptions, events: s.events, position: s.position }
}

function Kpi({ label, value, info }: { label: string; value: string; info?: string }) {
  return (
    <div className="px-6 py-5">
      <p className="mb-2 flex items-center gap-1.5 text-[14px] text-[#5f5b55]">
        {label}
        {info && (
          <span title={info}>
            <Info size={14} />
          </span>
        )}
      </p>
      <p className="text-[28px] font-semibold tabular-nums leading-none">{value}</p>
    </div>
  )
}

function money0(v: number) {
  return (v < 0 ? '-' : '') + formatMoney(Math.abs(v)).replace(/\.\d\d$/, '')
}

export default function ForecastView({ data, initialScenario }: { data: ForecastData; initialScenario: string | null }) {
  const [scenarios, setScenarios] = useState<Scenario[]>(data.scenarios)
  const [activeId, setActiveId] = useState<string>(
    data.scenarios.find((s) => s.id === initialScenario)?.id || data.scenarios[0]?.id || ''
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(data.error)
  const [drawer, setDrawer] = useState<null | { type: 'assumptions' } | { type: 'event'; event: ForecastEvent | null }>(null)
  const [bottom, setBottom] = useState<'accounts' | 'cashflow' | 'events'>('accounts')
  const creating = useRef(false)

  const active = scenarios.find((s) => s.id === activeId) || scenarios[0]

  async function insertScenario(s: Omit<Scenario, 'id'>) {
    setStatus('saving')
    const { data: row, error } = await createClient()
      .from('forecast_scenarios')
      .insert(toDb(s as Scenario))
      .select('id, name, icon, color, assumptions, events, position')
      .single<Row>()
    if (error || !row) {
      setStatus('error')
      setError("Couldn't save: " + (error?.message || 'unknown error'))
      return null
    }
    const created: Scenario = { ...s, id: row.id }
    setScenarios((list) => [...list, created])
    setActiveId(row.id)
    setStatus('saved')
    return created
  }

  // First visit: create a Base Plan from your real numbers
  useEffect(() => {
    if (data.setupNeeded || data.scenarios.length > 0 || creating.current) return
    creating.current = true
    insertScenario({ name: 'Base Plan', icon: 'trending-up', color: '#ecebe8', assumptions: data.defaults, events: [], position: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function update(patch: Partial<Scenario>) {
    if (!active) return
    const next = { ...active, ...patch }
    setScenarios((list) => list.map((s) => (s.id === next.id ? next : s)))
    setStatus('saving')
    const { error } = await createClient()
      .from('forecast_scenarios')
      .update({ ...toDb(next), updated_at: new Date().toISOString() })
      .eq('id', next.id)
    if (error) {
      setStatus('error')
      setError("Couldn't save: " + error.message)
    } else setStatus('saved')
  }

  function nextPosition() {
    return scenarios.reduce((m, s) => Math.max(m, s.position), 0) + 1
  }

  function duplicate() {
    if (!active) return
    insertScenario({ ...active, name: active.name + ' (copy)', position: nextPosition(), events: active.events.map((e) => ({ ...e })) })
  }

  function startFresh() {
    insertScenario({ name: 'New scenario', icon: 'target', color: '#dbe6fb', assumptions: data.defaults, events: [], position: nextPosition() })
  }

  async function remove() {
    if (!active || scenarios.length < 2) return
    const id = active.id
    setScenarios((list) => list.filter((s) => s.id !== id))
    setActiveId(scenarios.find((s) => s.id !== id)!.id)
    setStatus('saving')
    const { error } = await createClient().from('forecast_scenarios').delete().eq('id', id)
    if (error) {
      setStatus('error')
      setError("Couldn't delete: " + error.message)
    } else setStatus('saved')
  }

  const projection = useMemo(
    () => (active ? project(active.assumptions, active.events, data.linkedNetWorth) : null),
    [active, data.linkedNetWorth]
  )

  const statusText =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved just now' : status === 'error' ? 'Not saved' : ''

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-7">
          <h1 className="text-[22px] font-medium">Forecasting</h1>
          <PageTabs active="forecast" />
          {scenarios.length > 0 && (
            <ScenarioBar
              scenarios={scenarios}
              activeId={active?.id || ''}
              linkedNetWorth={data.linkedNetWorth}
              onSelect={setActiveId}
              onNew={startFresh}
              onDuplicate={duplicate}
            />
          )}
        </div>
        <span className={'text-[14px] ' + (status === 'error' ? 'text-[#c8321e]' : 'text-[#77736d]')}>{statusText}</span>
      </header>

      <div className="space-y-4 px-4 pb-8">
        {data.setupNeeded && <SetupCard what="Budgets and forecasts" />}
        {error && <p className={CARD + ' p-5 text-[15px] text-[#d6402b]'}>{error}</p>}

        {active && projection && (
          <>
            <section className={CARD + ' px-6 pb-6 pt-5'}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <ScenarioTitle
                  key={active.id}
                  scenario={active}
                  canDelete={scenarios.length > 1}
                  onChange={update}
                  onDuplicate={duplicate}
                  onDelete={remove}
                />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setDrawer({ type: 'assumptions' })} className={BTN}>
                    <Pencil size={16} />
                    Edit assumptions
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawer({ type: 'event', event: null })}
                    className="flex h-11 items-center gap-2 rounded-lg bg-orange-500 px-5 text-[16px] font-medium text-white hover:bg-orange-600"
                  >
                    <Plus size={18} strokeWidth={2.25} />
                    Add event
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-[#efedea] rounded-xl border border-[#efedea] lg:grid-cols-4 lg:divide-x">
                <Kpi label="Net worth (EOY)" value={compact(projection.netWorthEOY)} info="Projected net worth at the end of this year" />
                <Kpi label="Net worth at retirement" value={compact(projection.netWorthAtRetirement)} info={'Projected net worth when you retire in ' + projection.retirementYear} />
                <Kpi label="Retirement age" value={String(active.assumptions.retirementAge)} />
                <Kpi label="Net worth at end" value={compact(projection.netWorthAtEnd)} info={'Projected net worth at age ' + active.assumptions.endAge} />
              </div>

              {!active.assumptions.confirmed && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#fbf3e4] px-4 py-3 text-[14px] text-[#7a5a1e]">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <span>
                    These start from your last 12 months of income and spending and an assumed age of 30.{' '}
                    <button type="button" onClick={() => setDrawer({ type: 'assumptions' })} className="font-medium underline">
                      Edit assumptions
                    </button>{' '}
                    to set your age and goals.
                  </span>
                </p>
              )}
              {projection.runsOutAge !== null && (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-[#fdecea] px-4 py-3 text-[14px] text-[#a52a1a]">
                  <AlertTriangle size={16} className="shrink-0" />
                  At this pace your money runs out around age {projection.runsOutAge}.
                </p>
              )}

              <div className="mt-6">
                <ForecastChart projection={projection} events={active.events} assumptions={active.assumptions} />
              </div>
            </section>

            <section className={CARD + ' overflow-hidden'}>
              <div className="flex gap-1 px-5 pt-5">
                {(
                  [
                    ['accounts', 'Accounts'],
                    ['cashflow', 'Cash Flow'],
                    ['events', 'Events'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setBottom(k)}
                    className={
                      'rounded-full px-5 py-2.5 text-[16px] font-medium ' +
                      (bottom === k ? 'bg-[#efedea] text-[#1f1d1a]' : 'text-[#5f5b55] hover:text-[#1f1d1a]')
                    }
                  >
                    {label}
                    {k === 'events' && active.events.length > 0 && <span className="ml-1.5 text-[#77736d]">{active.events.length}</span>}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {bottom === 'accounts' && (
                  <table className="w-full text-[15px]">
                    <thead className="bg-[#f4f3f1] text-[14px] text-[#77736d]">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Account</th>
                        <th className="px-6 py-3 text-left font-medium">Type</th>
                        <th className="px-6 py-3 text-right font-medium">Balance today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.accounts.map((a, i) => (
                        <tr key={i} className="border-t border-[#f1efec]">
                          <td className="px-6 py-3.5">{a.name}</td>
                          <td className="px-6 py-3.5 text-[#77736d]">{a.type}</td>
                          <td className={'px-6 py-3.5 text-right tabular-nums ' + (a.balance < 0 ? 'text-[#c8321e]' : '')}>{formatMoney(a.balance)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-[#e4e1dc] font-semibold">
                        <td className="px-6 py-4" colSpan={2}>
                          Net worth{active.assumptions.startingNetWorth !== null && ' (forecast uses a custom ' + money0(active.assumptions.startingNetWorth) + ')'}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatMoney(data.linkedNetWorth)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {bottom === 'cashflow' && (
                  <div className="max-h-[560px] overflow-y-auto">
                    <table className="w-full text-[15px]">
                      <thead className="sticky top-0 bg-[#f4f3f1] text-[14px] text-[#77736d]">
                        <tr>
                          {['Year', 'Age', 'Income', 'Spending', 'Events', 'Growth', 'Net worth'].map((h, i) => (
                            <th key={h} className={'px-5 py-3 font-medium ' + (i < 2 ? 'text-left' : 'text-right')}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {projection.rows.map((r) => (
                          <tr
                            key={r.year}
                            className={'border-t border-[#f1efec] tabular-nums ' + (r.year === projection.retirementYear ? 'bg-[#fdf3ec]' : '')}
                          >
                            <td className="px-5 py-3">{r.year}</td>
                            <td className="px-5 py-3 text-[#77736d]">
                              {r.age}
                              {r.year === projection.retirementYear && <span className="ml-2 text-[13px] text-[#c2501a]">Retire</span>}
                            </td>
                            <td className="px-5 py-3 text-right text-[#2e8f57]">{money0(r.income)}</td>
                            <td className="px-5 py-3 text-right">{money0(-r.spending)}</td>
                            <td className={'px-5 py-3 text-right ' + (r.events < 0 ? 'text-[#c8321e]' : r.events > 0 ? 'text-[#2e8f57]' : 'text-[#b3afa9]')}>
                              {r.events ? money0(r.events) : '—'}
                            </td>
                            <td className="px-5 py-3 text-right">{money0(r.growth)}</td>
                            <td className={'px-5 py-3 text-right font-medium ' + (r.netWorth < 0 ? 'text-[#c8321e]' : '')}>{money0(r.netWorth)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {bottom === 'events' && (
                  <div>
                    {active.events.length === 0 && (
                      <div className="px-6 pb-10 pt-6 text-center">
                        <p className="mb-4 text-[15px] text-[#77736d]">
                          Add big moments like buying a house, a new job or a sabbatical to see how they change your future.
                        </p>
                        <button type="button" onClick={() => setDrawer({ type: 'event', event: null })} className={BTN + ' mx-auto'}>
                          <Plus size={17} />
                          Add event
                        </button>
                      </div>
                    )}
                    {[...active.events]
                      .sort((a, b) => a.year - b.year)
                      .map((e) => {
                        const kind = EVENT_KINDS.find((k) => k.key === e.kind)!
                        const [bg, fg] = EVENT_COLORS[e.kind]
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setDrawer({ type: 'event', event: e })}
                            className="flex w-full items-center gap-4 border-t border-[#f1efec] px-6 py-4 text-left hover:bg-[#faf9f7]"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color: fg }}>
                              <Icon name={e.icon} size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[16px]">{e.name}</span>
                              <span className="block text-[14px] text-[#77736d]">
                                {kind.label} · {kind.recurring ? e.year + '–' + (e.endYear ?? e.year) : e.year} · age{' '}
                                {e.year - active.assumptions.birthYear}
                              </span>
                            </span>
                            <span className={'text-[16px] tabular-nums ' + (kind.sign > 0 ? 'text-[#2e8f57]' : '')}>
                              {kind.sign > 0 ? '+' : '-'}
                              {money0(e.amount)}
                              {kind.recurring && <span className="text-[14px] text-[#77736d]">/yr</span>}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {drawer?.type === 'assumptions' && active && (
        <AssumptionsDrawer
          value={active.assumptions}
          linkedNetWorth={data.linkedNetWorth}
          onClose={() => setDrawer(null)}
          onSave={(a) => {
            setDrawer(null)
            update({ assumptions: a })
          }}
        />
      )}
      {drawer?.type === 'event' && active && (
        <EventDrawer
          value={drawer.event}
          onClose={() => setDrawer(null)}
          onSave={(e) => {
            setDrawer(null)
            const exists = active.events.some((x) => x.id === e.id)
            update({ events: exists ? active.events.map((x) => (x.id === e.id ? e : x)) : [...active.events, e] })
          }}
          onDelete={
            drawer.event
              ? () => {
                  const id = drawer.event!.id
                  setDrawer(null)
                  update({ events: active.events.filter((x) => x.id !== id) })
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
