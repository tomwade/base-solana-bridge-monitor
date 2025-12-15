import { NextResponse } from 'next/server'
import { formatUnits } from 'viem'
import { getTopBridgedTokens, isEnvioEnabled } from '@/lib/envio'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const tokens = await getTopBridgedTokens(
      limit,
      direction as 'solana-to-base' | 'base-to-solana' | undefined
    )

    const converted = tokens.map((token) => {
      const isSolanaToBase = direction === 'solana-to-base' || !direction
      const totalBridged = isSolanaToBase
        ? BigInt(token.totalBridgedFromSolana)
        : BigInt(token.totalBridgedToSolana)
      const bridgeCount = isSolanaToBase
        ? token.bridgeCountFromSolana
        : token.bridgeCountToSolana

      return {
        tokenAddress: token.address,
        tokenName: token.name || 'Unknown',
        tokenSymbol: token.symbol || 'UNK',
        decimals: token.decimals || 18,
        solanaMintAddress: token.solanaMintAddress || null,
        totalBridged: totalBridged.toString(), // Convert BigInt to string for JSON serialization
        totalBridgedFormatted: formatUnits(
          totalBridged,
          token.decimals || 18
        ),
        bridgeCount,
        lastBridgeTime: parseInt(token.lastBridgeTime) * 1000,
        direction: isSolanaToBase
          ? ('solana-to-base' as const)
          : ('base-to-solana' as const),
      }
    })

    return NextResponse.json({ data: converted })
  } catch (error) {
    console.error('Error fetching top bridged tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top bridged tokens from Envio indexer' },
      { status: 500 }
    )
  }
}
