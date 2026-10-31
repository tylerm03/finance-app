import { Landmark } from 'lucide-react'

const COLORS = ['#1f5fbf', '#0e7c86', '#6d3fc4', '#b4282e', '#0b6aa2', '#1d7a3a', '#c2501a', '#3b4a5c']

// Colored circle with a bank's initials (we don't have bank logos)
export default function InstitutionAvatar({
  name,
  size = 24,
  className = '',
}: {
  name: string | null | undefined
  size?: number
  className?: string
}) {
  if (!name) {
    return (
      <span
        className={'flex shrink-0 items-center justify-center rounded-full bg-[#efedea] text-[#5f5b55] ' + className}
        style={{ width: size, height: size }}
      >
        <Landmark size={size * 0.5} strokeWidth={1.75} />
      </span>
    )
  }
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <span
      title={name}
      className={'flex shrink-0 items-center justify-center rounded-full font-semibold text-white ' + className}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundColor: COLORS[hash % COLORS.length],
      }}
    >
      {initials || '$'}
    </span>
  )
}
