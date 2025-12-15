'use client'

import { useTokenPrice } from '@/hooks/useTokenPrice'

interface TokenPriceProps {
  tokenAddress: string
  amount?: string | number
  showMarketCap?: boolean
  className?: string
}

export function TokenPrice({
  tokenAddress,
  amount,
  showMarketCap = false,
  className = '',
}: TokenPriceProps) {
  const { priceUSD, marketCapUSD, isLoading } = useTokenPrice(tokenAddress)

  const formatUSD = (value: number | null) => {
    if (value === null) return 'N/A'
    if (value < 0.01) return `$${value.toFixed(6)}`
    if (value < 1) return `$${value.toFixed(4)}`
    if (value < 1000) return `$${value.toFixed(2)}`
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`
    return `$${(value / 1000000).toFixed(2)}M`
  }

  const calculateValue = () => {
    if (!priceUSD || !amount) return null
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return numAmount * priceUSD
  }

  const value = calculateValue()

  // Always show the component, even if price is loading or unavailable
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isLoading && (
        <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
      <span className="text-sm text-gray-400">
        {value !== null ? (
          <>
            <span className="font-medium text-gray-300">
              {formatUSD(value)}
            </span>
            {amount && priceUSD && (
              <span className="text-gray-500 ml-1">
                ({formatUSD(priceUSD)}/token)
              </span>
            )}
          </>
        ) : priceUSD ? (
          <>
            <span className="font-medium text-gray-300">
              {formatUSD(priceUSD)}/token
            </span>
            {isLoading && <span className="ml-1 text-xs text-gray-500">(updating...)</span>}
          </>
        ) : isLoading ? (
          <span className="text-gray-500">Loading price...</span>
        ) : (
          <span className="text-gray-500">Price unavailable</span>
        )}
      </span>
      {showMarketCap && marketCapUSD !== null && (
        <span className="text-xs text-gray-500">
          MCap: {formatUSD(marketCapUSD)}
        </span>
      )}
    </div>
  )
}

interface TokenPriceBadgeProps {
  tokenAddress: string
  solanaMintAddress?: string | null
  direction?: 'solana-to-base' | 'base-to-solana'
  marketCapUSD?: number | null
  isLoading?: boolean
}

export function TokenPriceBadge({
  tokenAddress,
  solanaMintAddress,
  direction,
  marketCapUSD,
  isLoading: externalLoading,
}: TokenPriceBadgeProps) {
  const { priceUSD, marketCapUSD: fetchedMarketCap, isLoading } =
    useTokenPrice(tokenAddress, solanaMintAddress, direction)

  const displayMarketCap = marketCapUSD ?? fetchedMarketCap
  const isActuallyLoading = externalLoading ?? isLoading

  const formatUSD = (value: number | null) => {
    if (value === null) return 'N/A'
    if (value < 1000) return `$${value.toFixed(2)}`
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`
    if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`
    return `$${(value / 1000000000).toFixed(2)}B`
  }

  if (!displayMarketCap && !isActuallyLoading) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded text-xs">
      {isActuallyLoading && (
        <span className="inline-block w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
      <span className="text-gray-300">
        {displayMarketCap ? (
          <>MCap: {formatUSD(displayMarketCap)}</>
        ) : (
          <span className="text-gray-500">Loading...</span>
        )}
      </span>
    </div>
  )
}

