import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ja } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy年M月d日', { locale: ja })
}

export function formatShortDate(date: string | Date): string {
  return format(new Date(date), 'M/d', { locale: ja })
}

export function getCurrentYearMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function getYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}年${parseInt(month)}月`
}

export type PeriodType = 'week' | 'month' | 'year'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

export function getDateRange(period: PeriodType, offset = 0): DateRange {
  const now = new Date()

  if (period === 'week') {
    const base = new Date(now)
    base.setDate(base.getDate() + offset * 7)
    return {
      start: startOfWeek(base, { weekStartsOn: 1 }),
      end: endOfWeek(base, { weekStartsOn: 1 }),
      label: offset === 0 ? '今週' : `${Math.abs(offset)}週${offset < 0 ? '前' : '後'}`,
    }
  }

  if (period === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return {
      start: startOfMonth(base),
      end: endOfMonth(base),
      label: format(base, 'yyyy年M月', { locale: ja }),
    }
  }

  const base = new Date(now.getFullYear() + offset, 0, 1)
  return {
    start: startOfYear(base),
    end: endOfYear(base),
    label: `${base.getFullYear()}年`,
  }
}

export function calcSavingsRate(savings: number, income: number): number {
  if (income === 0) return 0
  return Math.round((savings / income) * 100)
}
