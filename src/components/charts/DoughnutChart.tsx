'use client'

import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { CATEGORY_COLORS } from '@/types'
import { formatCurrency } from '@/lib/utils'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DoughnutChart({ data }: { data: Record<string, number> }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1])
  const labels = sorted.map(([k]) => k)
  const values = sorted.map(([, v]) => v)
  const colors = labels.map(l => CATEGORY_COLORS[l] ?? '#9ca3af')

  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-48 h-48">
        <Doughnut
          data={{
            labels,
            datasets: [{
              data: values,
              backgroundColor: colors.map(c => c + '99'),
              borderColor: colors,
              borderWidth: 2,
            }]
          }}
          options={{
            responsive: true,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => ` ${formatCurrency(ctx.parsed)} (${Math.round(ctx.parsed / total * 100)}%)`
                }
              }
            }
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xs text-slate-400">合計</span>
          <span className="text-sm font-bold text-white">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map(([cat, amt]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#9ca3af' }} />
            <span className="text-xs text-slate-400 truncate">{cat}</span>
            <span className="text-xs text-slate-300 ml-auto">{Math.round(amt / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
