import { NextResponse } from 'next/server'
import { formatUnits } from 'viem'
import {
  getAllBridgeTransactions,
  isEnvioEnabled,
} from '@/lib/envio'
import { BridgedToken } from '@/types/bridge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Convert Envio transaction to BridgedToken format
function convertEnvioTransaction(tx: any): BridgedToken {
  return {
    id: tx.id,
    tokenAddress: tx.tokenAddress,
    tokenName: tx.tokenName || 'Unknown',
    tokenSymbol: tx.tokenSymbol || 'UNK',
    decimals: tx.decimals || 18,
    direction:
      tx.direction === 'SOLANA_TO_BASE'
        ? 'solana-to-base'
        : 'base-to-solana',
    amount: tx.amount,
    amountFormatted: tx.amountFormatted || formatUnits(BigInt(tx.amount), tx.decimals || 18),
    timestamp: parseInt(tx.blockTimestamp) * 1000,
    transactionHash: tx.transactionHash,
    fromAddress: tx.fromAddress,
    toAddress: tx.toAddress,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'timestamp' // 'timestamp' or 'marketCap'
    const order = searchParams.get('order') || 'desc' // 'asc' or 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Require Envio - RPC fallback removed due to inefficiency and wrong event names
    if (!isEnvioEnabled()) {
      return NextResponse.json(
        { error: 'Envio indexer is required. Please set NEXT_PUBLIC_ENVIO_API_URL' },
        { status: 503 }
      )
    }

    const result = await getAllBridgeTransactions(
      sortBy as 'timestamp' | 'marketCap',
      order as 'asc' | 'desc',
      page,
      limit
    )
    const converted = result.data.map(convertEnvioTransaction)
    return NextResponse.json({
      data: converted,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Error fetching all bridge events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bridge events from Envio indexer' },
      { status: 500 }
    )
  }
}
