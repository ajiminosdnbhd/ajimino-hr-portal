'use client'

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
