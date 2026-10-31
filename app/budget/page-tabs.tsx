import Link from 'next/link'

// Budget | Forecast tabs at the top of the Budget page
export default function PageTabs({ active }: { active: 'budget' | 'forecast' }) {
  const tab = (key: 'budget' | 'forecast', label: string, href: string) => (
    <Link
      href={href}
      className={
        'border-b-2 pb-1 pt-1.5 text-[17px] font-medium transition-colors ' +
        (active === key ? 'border-orange-500 text-orange-500' : 'border-transparent text-[#77736d] hover:text-[#1f1d1a]')
      }
    >
      {label}
    </Link>
  )
  return (
    <nav className="flex gap-6">
      {tab('budget', 'Budget', '/budget')}
      {tab('forecast', 'Forecast', '/budget?tab=forecast')}
    </nav>
  )
}
