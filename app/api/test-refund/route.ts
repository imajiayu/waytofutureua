import { processWayForPayRefund } from '@/lib/payment/wayforpay/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { orderReference, amount, currency } = await request.json()

    if (!orderReference || !amount) {
      return NextResponse.json(
        { error: 'orderReference and amount are required' },
        { status: 400 }
      )
    }

    const result = await processWayForPayRefund({
      orderReference,
      amount,
      currency: currency || 'USD',
      comment: 'Test refund',
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
