'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { formatUnits } from 'viem'
import { useMemo } from 'react'
import { BridgedToken } from '@/types/bridge'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CopyButton } from '@/components/CopyButton'
import { TokenPrice } from '@/components/TokenPrice'
import { bytes32ToBase58 } from '@/lib/solana-utils'

interface TokenInfo {
  address: string
  name: string | null
  symbol: string | null
  decimals: number | null
  totalBridgedToSolana: string
  totalBridgedFromSolana: string
  bridgeCountToSolana: number
  bridgeCountFromSolana: number
  lastBridgeTime: string
  marketCapUSD: string | null
  priceUSD: string | null
  solanaMintAddress: string | null
}

interface TokenTransactionsResponse {
  data: BridgedToken[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  token: TokenInfo | null
}

export default function TokenDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tokenAddress = params.tokenAddress as string
  const page = parseInt(searchParams.get('page') || '1')

  const { data, isLoading, error } = useQuery<TokenTransactionsResponse>({
    queryKey: ['token-transactions', tokenAddress, page],
    queryFn: async () => {
      const res = await fetch(`/api/bridge/token/${tokenAddress}?page=${page}&limit=50`)
      if (!res.ok) {
        throw new Error('Failed to fetch token transactions')
      }
      return res.json()
    },
  })

  // Convert Solana address from bytes32 to base58
  // Must be called before any early returns to maintain hook order
  const solanaAddressBase58 = useMemo(() => {
    if (!data?.token?.solanaMintAddress) return null
    return bytes32ToBase58(data.token.solanaMintAddress)
  }, [data?.token?.solanaMintAddress])

  // Fetch prices for both Base and Solana chains separately (no fallback)
  // Use the base58 address for Solana price lookup
  const { data: pricesData, isLoading: pricesLoading } = useQuery<{
    prices: {
      base: { priceUSD: number | null; marketCapUSD: number | null } | null
      solana: { priceUSD: number | null; marketCapUSD: number | null } | null
    }
  }>({
    queryKey: ['token-prices-both', tokenAddress, solanaAddressBase58],
    queryFn: async () => {
      const requestBody = {
        baseAddress: tokenAddress,
        solanaAddress: solanaAddressBase58 || data?.token?.solanaMintAddress || undefined,
      }
      
      console.log('[Token Page] Fetching market cap prices:', {
        baseAddress: requestBody.baseAddress,
        solanaAddressBase58: solanaAddressBase58,
        solanaMintAddressBytes32: data?.token?.solanaMintAddress,
        solanaAddressUsed: requestBody.solanaAddress,
      })
      
      const res = await fetch('/api/bridge/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Token Page] Failed to fetch prices:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
        })
        throw new Error(`Failed to fetch prices: ${res.status} ${res.statusText}`)
      }
      
      const result = await res.json()
      console.log('[Token Page] Received price data:', {
        basePrice: result.prices?.base,
        solanaPrice: result.prices?.solana,
        fullResponse: result,
      })
      
      return result
    },
    enabled: !!data?.token, // Only fetch when token data is available
    staleTime: 60 * 1000, // Cache for 60 seconds
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-900/50 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-gray-400">
              Failed to load token transactions. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const token = data.token
  const transactions = data.data
  const pagination = data.pagination

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Token Header */}
        {token && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {token.symbol || 'Unknown Token'}
                </h1>
                <p className="text-gray-400 mb-2">{token.name || 'Unknown'}</p>
                
                {/* Base Address */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-gray-500">Base:</p>
                  <p className="text-sm text-gray-400 font-mono break-all">
                    {token.address}
                  </p>
                  <CopyButton text={token.address} />
                  <Link
                    href={`https://basescan.org/token/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-base-blue transition-colors"
                    title="View on Basescan"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                </div>

                {/* Solana Address */}
                {solanaAddressBase58 && (
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-gray-500">Solana:</p>
                    <p className="text-sm text-gray-400 font-mono break-all">
                      {solanaAddressBase58}
                    </p>
                    <CopyButton text={solanaAddressBase58} />
                    <Link
                      href={`https://solscan.io/token/${solanaAddressBase58}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-green-400 transition-colors"
                      title="View on Solscan"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Link>
                  </div>
                )}

              </div>
            </div>

            {/* Market Cap Stats */}
            {(pricesLoading || pricesData?.prices) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {pricesLoading ? (
                  <>
                    <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-6 bg-gray-700 rounded w-24"></div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-36 mb-2"></div>
                      <div className="h-6 bg-gray-700 rounded w-24"></div>
                    </div>
                  </>
                ) : (
                  <>
                    {pricesData?.prices?.base?.marketCapUSD ? (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Base Market Cap</p>
                        <p className="text-xl font-bold text-white">
                          ${pricesData.prices.base.marketCapUSD.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Base Market Cap</p>
                        <p className="text-sm text-gray-500">Data unavailable</p>
                      </div>
                    )}
                    {pricesData?.prices?.solana?.marketCapUSD ? (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Solana Market Cap</p>
                        <p className="text-xl font-bold text-white">
                          ${pricesData.prices.solana.marketCapUSD.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Solana Market Cap</p>
                        <p className="text-sm text-gray-500">Data unavailable</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Token Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bridged to Solana</p>
                <p className="text-xl font-bold text-white">
                  {token.decimals !== null && token.decimals !== undefined
                    ? parseFloat(
                        formatUnits(BigInt(token.totalBridgedToSolana), token.decimals)
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })
                    : parseFloat(token.totalBridgedToSolana).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {token.bridgeCountToSolana} bridge{token.bridgeCountToSolana !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bridged from Solana</p>
                <p className="text-xl font-bold text-white">
                  {token.decimals !== null && token.decimals !== undefined
                    ? parseFloat(
                        formatUnits(BigInt(token.totalBridgedFromSolana), token.decimals)
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })
                    : parseFloat(token.totalBridgedFromSolana).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {token.bridgeCountFromSolana} bridge{token.bridgeCountFromSolana !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bridges</p>
                <p className="text-xl font-bold text-white">
                  {token.bridgeCountToSolana + token.bridgeCountFromSolana}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Last Bridge</p>
                <p className="text-lg font-bold text-white">
                  {formatDistanceToNow(new Date(parseInt(token.lastBridgeTime) * 1000), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Bridge Transactions ({pagination.total})
          </h2>
          {transactions.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No bridge transactions found for this token.</p>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Direction
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transactions.map((tx) => {
                      const isSolanaToBase = tx.direction === 'solana-to-base'
                      const directionLabel = isSolanaToBase ? 'Solana → Base' : 'Base → Solana'
                      const directionColor = isSolanaToBase
                        ? 'text-green-400'
                        : 'text-blue-400'
                      
                      return (
                        <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-medium ${directionColor}`}>
                              {directionLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-white font-medium">
                              {parseFloat(tx.amountFormatted).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}{' '}
                              {tx.tokenSymbol}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <TokenPrice
                              tokenAddress={tx.tokenAddress}
                              amount={tx.amountFormatted}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {(() => {
                                // For Solana → Base, show 'to' address (destination on Base)
                                // For Base → Solana, show 'from' address (initiator on Base)
                                const addressToShow = isSolanaToBase ? tx.toAddress : tx.fromAddress
                                return (
                                  <>
                                    <Link
                                      href={`https://basescan.org/address/${addressToShow}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-gray-300 hover:text-base-blue transition-colors font-mono"
                                      title={addressToShow}
                                    >
                                      {`${addressToShow.slice(0, 6)}...${addressToShow.slice(-4)}`}
                                    </Link>
                                    <CopyButton text={addressToShow} />
                                  </>
                                )
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-400">
                              {formatDistanceToNow(new Date(tx.timestamp), {
                                addSuffix: true,
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              href={`https://basescan.org/tx/${tx.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-base-blue hover:text-base-blue/80 transition-colors"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href={`/token/${tokenAddress}?page=${Math.max(1, pagination.page - 1)}`}
              className={`px-4 py-2 rounded-lg border ${
                pagination.page === 1
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 text-white hover:border-gray-600'
              }`}
            >
              Previous
            </Link>
            <span className="text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Link
              href={`/token/${tokenAddress}?page=${Math.min(pagination.totalPages, pagination.page + 1)}`}
              className={`px-4 py-2 rounded-lg border ${
                pagination.page === pagination.totalPages
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-700 text-white hover:border-gray-600'
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

