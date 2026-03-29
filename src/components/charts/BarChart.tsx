'use client'

import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { formatCurrency } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props {
  labels: string[]
  incomeData: number[]
  expenseData: number[]
}

export default function BarChart({ labels, incomeData, expenseData }: Props) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: '収入',
            data: incomeData,
            backgroundColor: 'rgba(52, 211, 153, 0.6)',
            borderColor: '#34d399',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: '支出',
            data: expenseData,
            backgroundColor: 'rgba(251, 113, 133, 0.6)',
            borderColor: '#fb7185',
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#9ca3af', font: { size: 11 } }
          },
          tooltip: {
            callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y ?? 0)}` }
          }
        },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#6b7280', font: { size: 10 }, callback: v => `¥${(v as number / 1000).toFixed(0)}k` }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }}
    />
  )
}
