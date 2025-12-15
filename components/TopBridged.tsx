'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { TokenPriceBadge } from './TokenPrice'

interface TopBridgedToken {
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  decimals: number
  solanaMintAddress: string | null
  totalBridged: bigint
  totalBridgedFormatted: string
  bridgeCount: number
  lastBridgeTime: number
  direction: 'solana-to-base' | 'base-to-solana'
}

interface TopBridgedProps {
  direction?: 'solana-to-base' | 'base-to-solana'
  title: string
  limit?: number
}

export function TopBridged({ direction, title, limit = 10 }: TopBridgedProps) {
  const { data, isLoading } = useQuery<{ data: TopBridgedToken[] }>({
    queryKey: ['top-bridged', direction, limit],
    queryFn: async () => {
      const url = direction
        ? `/api/bridge/top?direction=${direction}&limit=${limit}`
        : `/api/bridge/top?limit=${limit}`
      const res = await fetch(url)
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg animate-pulse"
            >
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/3"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3">
        {data?.data?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No bridge data available
          </p>
        ) : (
          data?.data?.map((token, index) => {
            const isSolanaToBase = token.direction === 'solana-to-base'
            const directionLabel = isSolanaToBase
              ? 'Solana → Base'
              : 'Base → Solana'
            const directionColor = isSolanaToBase
              ? 'bg-green-500/10 text-green-400'
              : 'bg-blue-500/10 text-blue-400'

            return (
              <div
                key={token.tokenAddress + token.direction}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/token/${token.tokenAddress}`}
                        className="font-semibold text-white hover:text-base-blue transition-colors"
                      >
                        {token.tokenSymbol}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${directionColor}`}
                      >
                        {directionLabel}
                      </span>
                    </div>
                    <Link
                      href={`/token/${token.tokenAddress}`}
                      className="text-sm text-gray-400 hover:text-gray-300 transition-colors block"
                    >
                      {token.tokenName}
                    </Link>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <p className="font-bold text-white">
                      {parseFloat(token.totalBridgedFormatted).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </p>
                    <TokenPriceBadge 
                      tokenAddress={token.tokenAddress}
                      solanaMintAddress={token.solanaMintAddress}
                      direction={token.direction}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {token.bridgeCount} bridge{token.bridgeCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

