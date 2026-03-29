import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()

    const prompt = `このレシート画像を解析して、以下のJSON形式で返してください。数字は半角数字で返してください。
{
  "store_name": "店舗名（不明な場合は空文字）",
  "date": "購入日（YYYY-MM-DD形式、不明な場合は今日の日付）",
  "items": [
    {
      "product_name": "商品名",
      "unit_price": 単価（税込、整数）,
      "quantity": 数量（整数）,
      "category": "カテゴリ（食費/日用品/外食費/交通費/医療費/衣類/娯楽/教育費/その他のいずれか）"
    }
  ],
  "total_amount": 合計金額（税込、整数）
}

注意：
- 商品名は日本語で
- 単価は税込金額
- 合計は全商品の合計（税込）
- JSONのみ返すこと（説明文不要）`

    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in response')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e) {
    console.error('OCR error:', e)
    return NextResponse.json({ error: 'OCR処理に失敗しました' }, { status: 500 })
  }
}
