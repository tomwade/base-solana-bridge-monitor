import { NextResponse } from 'next/server'
import { formatUnits } from 'viem'
import {
  getLatestBridgeTransactions,
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
    const limit = parseInt(searchParams.get('limit') || '10')
    const direction = searchParams.get('direction') // 'solana-to-base' or 'base-to-solana'

    // Require Envio - RPC fallback removed due to inefficiency and wrong event names
    if (!isEnvioEnabled()) {
      return NextResponse.json(
        { error: 'Envio indexer is required. Please set NEXT_PUBLIC_ENVIO_API_URL' },
        { status: 503 }
      )
    }

    const transactions = await getLatestBridgeTransactions(
      limit,
      direction as 'solana-to-base' | 'base-to-solana' | undefined
    )
    const converted = transactions.map(convertEnvioTransaction)
    return NextResponse.json({ data: converted })
  } catch (error) {
    console.error('Error fetching latest bridge events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bridge events from Envio indexer' },
      { status: 500 }
    )
  }
}
