export interface Family {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Profile {
  id: string
  family_id: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Transaction {
  id: string
  family_id: string
  user_id: string
  date: string
  store_name: string | null
  total_amount: number
  category: string
  memo: string | null
  receipt_url: string | null
  is_ocr: boolean
  created_at: string
  profiles?: Profile
  transaction_items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_name: string
  normalized_name: string | null
  unit_price: number
  quantity: number
  subtotal: number
  category: string | null
  created_at: string
}

export interface PriceHistory {
  id: string
  family_id: string
  product_name: string
  normalized_name: string
  store_name: string
  unit_price: number
  date: string
  created_at: string
}

export interface IncomeRecord {
  id: string
  family_id: string
  user_id: string
  date: string
  amount: number
  category: string
  memo: string | null
  created_at: string
  profiles?: Profile
}

export interface FixedExpense {
  id: string
  family_id: string
  name: string
  amount: number
  category: string
  billing_day: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MonthlyFixedRecord {
  id: string
  family_id: string
  fixed_expense_id: string
  year_month: string
  amount: number
  is_paid: boolean
  created_at: string
  fixed_expenses?: FixedExpense
}

export interface OcrResult {
  store_name: string
  date: string
  items: OcrItem[]
  total_amount: number
}

export interface OcrItem {
  product_name: string
  unit_price: number
  quantity: number
  category: string
}

export interface PriceSuggestion {
  product_name: string
  current_price: number
  current_store: string
  best_price: number
  best_store: string
  best_date: string
  savings: number
  savings_rate: number
}

export type Category =
  | '食費'
  | '日用品'
  | '交通費'
  | '医療費'
  | '外食費'
  | '衣類'
  | '娯楽'
  | '教育費'
  | '住居費'
  | '水道光熱費'
  | '通信費'
  | '保険'
  | '給与'
  | 'その他'

export const EXPENSE_CATEGORIES: Category[] = [
  '食費', '日用品', '外食費', '交通費', '医療費',
  '衣類', '娯楽', '教育費', '住居費', '水道光熱費', '通信費', '保険', 'その他'
]

export const INCOME_CATEGORIES: Category[] = ['給与', 'その他']

export const FIXED_EXPENSE_CATEGORIES: Category[] = [
  '住居費', '水道光熱費', '通信費', '保険', 'その他'
]

export const CATEGORY_COLORS: Record<string, string> = {
  '食費': '#38bdf8',
  '日用品': '#818cf8',
  '外食費': '#fb923c',
  '交通費': '#34d399',
  '医療費': '#f472b6',
  '衣類': '#a78bfa',
  '娯楽': '#fbbf24',
  '教育費': '#60a5fa',
  '住居費': '#4ade80',
  '水道光熱費': '#22d3ee',
  '通信費': '#f87171',
  '保険': '#c084fc',
  'その他': '#9ca3af',
  '給与': '#10b981',
}
