import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    const { priceHistory, currentMonth } = await req.json()

    const prompt = `以下は家族の購入履歴データです。各商品について最安値の店舗と節約提案をJSON形式で返してください。

購入履歴:
${JSON.stringify(priceHistory, null, 2)}

以下のJSON配列形式で返してください：
[
  {
    "product_name": "商品名",
    "best_store": "最安値の店舗",
    "best_price": 最安値（整数）,
    "avg_price": 平均価格（整数）,
    "potential_savings": 平均との差額（整数）,
    "suggestion": "具体的な提案（1文、日本語）"
  }
]

JSONのみ返すこと。`

    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      })
    })

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('JSON not found')

    const suggestions = JSON.parse(jsonMatch[0])
    return NextResponse.json(suggestions)
  } catch (e) {
    console.error('Suggest error:', e)
    return NextResponse.json([], { status: 200 })
  }
}
