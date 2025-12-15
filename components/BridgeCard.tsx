'use client'

import { BridgedToken } from '@/types/bridge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { TokenPrice } from './TokenPrice'

interface BridgeCardProps {
  token: BridgedToken
}

export function BridgeCard({ token }: BridgeCardProps) {
  const isSolanaToBase = token.direction === 'solana-to-base'
  const directionLabel = isSolanaToBase ? 'Solana → Base' : 'Base → Solana'
  const directionColor = isSolanaToBase
    ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/token/${token.tokenAddress}`}
              className="text-lg font-semibold text-white hover:text-base-blue transition-colors"
            >
              {token.tokenSymbol}
            </Link>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${directionColor}`}
            >
              {directionLabel}
            </span>
          </div>
          <Link
            href={`/token/${token.tokenAddress}`}
            className="text-sm text-gray-400 mb-1 hover:text-gray-300 transition-colors block"
          >
            {token.tokenName}
          </Link>
          <div className="mb-2">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-xl font-bold text-white">
                {parseFloat(token.amountFormatted).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}{' '}
                {token.tokenSymbol}
              </p>
            </div>
            <TokenPrice
              tokenAddress={token.tokenAddress}
              amount={token.amountFormatted}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {formatDistanceToNow(new Date(token.timestamp), {
                addSuffix: true,
              })}
            </span>
            <Link
              href={`https://basescan.org/tx/${token.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-blue transition-colors"
            >
              View on Basescan
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

