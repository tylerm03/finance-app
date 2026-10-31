'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { EVENT_KINDS, newId, type Assumptions, type EventKind, type ForecastEvent } from '@/lib/forecast/model'
import { ICONS, Icon, EVENT_COLORS } from '@/lib/forecast/icons'

const INPUT =
  'h-11 w-full rounded-lg border border-[#e4e1dc] bg-white px-3 text-[15px] tabular-nums outline-none focus:border-[#1a9bb8] focus:ring-1 focus:ring-[#1a9bb8]'

function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1f1d1a]/35" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-8 pb-5 pt-6">
          <h2 className="text-[26px] font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="hover:text-[#77736d]">
            <X size={24} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-[#efedea] px-8 py-6">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-[#efedea] px-8 py-5">{footer}</div>
      </aside>
    </div>
  )
}

function Num({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  hint?: string
}) {
  const [text, setText] = useState(String(value))
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium">{label}</span>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[#77736d]">{prefix}</span>}
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const n = Number(e.target.value.replace(/[$,%\s]/g, ''))
            if (Number.isFinite(n)) onChange(n)
          }}
          className={INPUT + (prefix ? ' pl-7' : '') + (suffix ? ' pr-10' : '')}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[#77736d]">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[13px] text-[#77736d]">{hint}</span>}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p className="mb-3 text-[16px] font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

const BTN_SECONDARY = 'h-12 rounded-lg border border-[#e4e1dc] bg-white px-6 text-[16px] font-medium hover:bg-[#faf9f7]'
const BTN_PRIMARY = 'h-12 rounded-lg bg-orange-500 px-6 text-[16px] font-medium text-white hover:bg-orange-600 disabled:bg-orange-300'

export function AssumptionsDrawer({
  value,
  linkedNetWorth,
  onClose,
  onSave,
}: {
  value: Assumptions
  linkedNetWorth: number
  onClose: () => void
  onSave: (a: Assumptions) => void
}) {
  const [a, setA] = useState<Assumptions>(value)
  const set = (patch: Partial<Assumptions>) => setA({ ...a, ...patch })
  const age = new Date().getFullYear() - a.birthYear

  return (
    <Drawer
      title="Edit assumptions"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave({ ...a, confirmed: true })} className={BTN_PRIMARY}>
            Save
          </button>
        </>
      }
    >
      <Section title="You">
        <Num label="Current age" value={age} onChange={(v) => set({ birthYear: new Date().getFullYear() - Math.round(v) })} suffix="yrs" />
        <Num label="Retirement age" value={a.retirementAge} onChange={(v) => set({ retirementAge: Math.round(v) })} suffix="yrs" />
        <Num label="Plan until age" value={a.endAge} onChange={(v) => set({ endAge: Math.round(v) })} suffix="yrs" />
      </Section>

      <Section title="While working">
        <Num label="Take-home income per year" value={a.annualIncome} onChange={(v) => set({ annualIncome: v })} prefix="$" hint="Starts at your last 12 months" />
        <Num label="Raise per year" value={a.incomeGrowth} onChange={(v) => set({ incomeGrowth: v })} suffix="%" />
        <Num label="Spending per year" value={a.annualSpending} onChange={(v) => set({ annualSpending: v })} prefix="$" hint="Starts at your last 12 months" />
        <Num label="Investment return" value={a.returnBefore} onChange={(v) => set({ returnBefore: v })} suffix="%" />
      </Section>

      <Section title="In retirement">
        <Num label="Spending per year" value={a.retirementSpending} onChange={(v) => set({ retirementSpending: v })} prefix="$" hint="In today's dollars" />
        <Num label="Investment return" value={a.returnAfter} onChange={(v) => set({ returnAfter: v })} suffix="%" />
        <Num label="Social Security / pension per year" value={a.retirementIncome} onChange={(v) => set({ retirementIncome: v })} prefix="$" />
        <Num label="Starting at age" value={a.retirementIncomeAge} onChange={(v) => set({ retirementIncomeAge: Math.round(v) })} suffix="yrs" />
      </Section>

      <Section title="Economy">
        <Num label="Inflation" value={a.inflation} onChange={(v) => set({ inflation: v })} suffix="%" />
      </Section>

      <div className="mb-2">
        <p className="mb-3 text-[16px] font-semibold">Starting net worth</p>
        <div className="flex rounded-lg bg-[#f1efec] p-1 text-[14px]">
          <button
            type="button"
            onClick={() => set({ startingNetWorth: null })}
            className={'h-9 flex-1 rounded-md font-medium ' + (a.startingNetWorth === null ? 'bg-white shadow-sm' : 'text-[#77736d]')}
          >
            My accounts ({formatMoney(linkedNetWorth).replace(/\.\d\d$/, '')})
          </button>
          <button
            type="button"
            onClick={() => set({ startingNetWorth: Math.round(linkedNetWorth) })}
            className={'h-9 flex-1 rounded-md font-medium ' + (a.startingNetWorth !== null ? 'bg-white shadow-sm' : 'text-[#77736d]')}
          >
            Custom amount
          </button>
        </div>
        {a.startingNetWorth !== null && (
          <div className="mt-3">
            <Num label="Starting net worth" value={a.startingNetWorth} onChange={(v) => set({ startingNetWorth: v })} prefix="$" />
          </div>
        )}
      </div>
    </Drawer>
  )
}

const EVENT_ICONS = ['home', 'car', 'graduation-cap', 'baby', 'plane', 'palmtree', 'gift', 'briefcase', 'heart-pulse', 'gem', 'hammer', 'building-2', 'shield', 'umbrella', 'coins', 'star']

export function EventDrawer({
  value,
  onClose,
  onSave,
  onDelete,
}: {
  value: ForecastEvent | null
  onClose: () => void
  onSave: (e: ForecastEvent) => void
  onDelete?: () => void
}) {
  const year = new Date().getFullYear()
  const [e, setE] = useState<ForecastEvent>(
    value || { id: newId(), name: '', kind: 'one_time_expense', year: year + 5, endYear: null, amount: 0, icon: 'home' }
  )
  const kind = EVENT_KINDS.find((k) => k.key === e.kind)!
  const valid = e.name.trim() !== '' && e.amount > 0 && e.year >= year && (!kind.recurring || (e.endYear ?? e.year) >= e.year)
  const [bg, fg] = EVENT_COLORS[e.kind]

  return (
    <Drawer
      title={value ? 'Edit event' : 'Add event'}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <button type="button" onClick={onDelete} className={BTN_SECONDARY + ' mr-auto text-[#c8321e] hover:bg-[#fdecea]'}>
              Delete event
            </button>
          )}
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onSave({ ...e, name: e.name.trim(), endYear: kind.recurring ? e.endYear ?? e.year : null })}
            className={BTN_PRIMARY}
          >
            {value ? 'Save' : 'Add event'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2">
          {EVENT_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setE({ ...e, kind: k.key as EventKind })}
              className={
                'h-11 rounded-lg border text-[15px] font-medium ' +
                (e.kind === k.key ? 'border-[#1a9bb8] ring-1 ring-[#1a9bb8]' : 'border-[#e4e1dc] hover:bg-[#faf9f7]')
              }
            >
              {k.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Name</span>
          <input
            value={e.name}
            onChange={(ev) => setE({ ...e, name: ev.target.value })}
            placeholder={kind.sign < 0 ? 'e.g. Buy a house' : 'e.g. Inheritance'}
            className={INPUT}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Num
            label={kind.recurring ? 'Amount per year' : 'Amount'}
            value={e.amount}
            onChange={(v) => setE({ ...e, amount: Math.max(0, v) })}
            prefix="$"
            hint="In today's dollars"
          />
          <Num label={kind.recurring ? 'Start year' : 'Year'} value={e.year} onChange={(v) => setE({ ...e, year: Math.round(v) })} />
          {kind.recurring && (
            <Num label="End year" value={e.endYear ?? e.year} onChange={(v) => setE({ ...e, endYear: Math.round(v) })} />
          )}
        </div>

        <div>
          <span className="mb-2 block text-[14px] font-medium">Icon</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_ICONS.filter((k) => ICONS[k]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setE({ ...e, icon: k })}
                className={'flex h-10 w-10 items-center justify-center rounded-lg ' + (e.icon === k ? 'ring-2 ring-[#1a9bb8]' : 'hover:ring-1 hover:ring-[#d9d6d1]')}
                style={{ backgroundColor: bg, color: fg }}
                aria-label={k}
              >
                <Icon name={k} size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
