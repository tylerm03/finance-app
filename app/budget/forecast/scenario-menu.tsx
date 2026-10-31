'use client'

import { useState } from 'react'
import { MoreHorizontal, X, XCircle } from 'lucide-react'
import type { Scenario } from '@/lib/forecast/model'
import { ICONS, Icon, SCENARIO_COLORS, colorPair } from '@/lib/forecast/icons'
import { useOutside } from './scenario-bar'

// Scenario name + icon at the top of the card, with the ... menu and the inline editor
export default function ScenarioTitle({
  scenario,
  canDelete,
  onChange,
  onDuplicate,
  onDelete,
}: {
  scenario: Scenario
  canDelete: boolean
  onChange: (patch: Partial<Scenario>) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [name, setName] = useState(scenario.name)
  const menuRef = useOutside<HTMLDivElement>(menu, () => setMenu(false))
  const editRef = useOutside<HTMLDivElement>(editing, () => finish())
  const [bg, fg] = colorPair(scenario.color)

  function finish() {
    setEditing(false)
    setPicker(false)
    const n = name.trim()
    if (n && n !== scenario.name) onChange({ name: n })
    else setName(scenario.name)
  }

  return (
    <div className="relative flex items-center gap-3">
      {editing ? (
        <div
          ref={editRef}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setName(scenario.name)
              setEditing(false)
              setPicker(false)
            }
          }}
          className="relative z-30 -my-1 flex items-center gap-2 rounded-xl border border-[#e4e1dc] bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            onClick={() => setPicker(!picker)}
            className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-[#e4e1dc] hover:ring-[#b9b5af]"
            style={{ backgroundColor: bg, color: fg }}
            aria-label="Change icon and color"
          >
            <Icon name={scenario.icon} size={17} />
          </button>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finish()
            }}
            className="h-9 w-64 rounded-lg border border-[#1a9bb8] px-3 text-[16px] outline-none ring-1 ring-[#1a9bb8]"
          />
          {picker && (
            <div className="absolute left-0 top-[calc(100%+6px)] w-[300px] rounded-xl border border-[#e4e1dc] bg-white p-4 shadow-xl">
              <div className="mb-4 grid grid-cols-6 gap-2.5">
                {SCENARIO_COLORS.map(([b, f]) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChange({ color: b })}
                    className={'h-7 w-7 rounded-full ' + (b === scenario.color ? 'ring-2 ring-[#1a9bb8] ring-offset-2' : '')}
                    style={{ backgroundColor: b, boxShadow: 'inset 0 0 0 1px ' + f + '33' }}
                    aria-label="Color"
                  />
                ))}
              </div>
              <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto border-t border-[#efedea] pt-3">
                {Object.keys(ICONS).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChange({ icon: k })}
                    className={
                      'flex h-9 w-9 items-center justify-center rounded-lg text-[#3b3834] hover:bg-[#f1efec] ' +
                      (k === scenario.icon ? 'bg-[#f1efec] ring-1 ring-[#1a9bb8]' : '')
                    }
                    aria-label={k}
                  >
                    <Icon name={k} size={17} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color: fg }}>
            <Icon name={scenario.icon} size={17} />
          </span>
          <h2 className="text-[22px] font-medium">{scenario.name}</h2>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Scenario options"
              onClick={() => setMenu(!menu)}
              className={'flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f1efec] ' + (menu ? 'bg-[#f1efec]' : '')}
            >
              <MoreHorizontal size={19} />
            </button>
            {menu && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-56 rounded-xl border border-[#e4e1dc] bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    setName(scenario.name)
                    setEditing(true)
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-[#f6f5f3]"
                >
                  Edit name and icon
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    onDuplicate()
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-[#f6f5f3]"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={!canDelete}
                  title={canDelete ? undefined : "You can't delete your only scenario"}
                  onClick={() => {
                    setMenu(false)
                    setConfirming(true)
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] text-[#c8321e] hover:bg-[#fdecea] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Delete scenario
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1f1d1a]/45" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-[520px] rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h3 className="text-[20px] font-semibold">Are you sure you want to delete this scenario?</h3>
              <button type="button" onClick={() => setConfirming(false)} className="hover:text-[#77736d]">
                <X size={22} />
              </button>
            </div>
            <div className="mb-6 rounded-xl bg-[#f6f5f3] p-5">
              <p className="mb-3 text-[15px] font-medium">What will change:</p>
              <ul className="space-y-2.5 text-[15px] text-[#3b3834]">
                {['All events will be deleted', 'All assumptions will be deleted', 'Scenario will no longer appear in the list'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <XCircle size={17} className="text-[#5f5b55]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-11 rounded-lg border border-[#e4e1dc] bg-white px-5 text-[15px] font-medium hover:bg-[#faf9f7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  onDelete()
                }}
                className="h-11 rounded-lg border border-[#e4e1dc] bg-white px-5 text-[15px] font-medium text-[#c8321e] hover:bg-[#fdecea]"
              >
                Delete scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
