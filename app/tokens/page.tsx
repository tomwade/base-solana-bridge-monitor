'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BridgedToken } from '@/types/bridge'
import { BridgeCard } from '@/components/BridgeCard'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

type SortBy = 'timestamp'
type SortOrder = 'asc' | 'desc'

export default function TokensPage() {
  const [sortBy, setSortBy] = useState<SortBy>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const limit = 50

  const { data, isLoading } = useQuery<{
    data: BridgedToken[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>({
    queryKey: ['all-tokens', sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/bridge/all?sortBy=${sortBy}&order=${sortOrder}&page=${page}&limit=${limit}`
      )
      return res.json()
    },
  })

  const handleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-base-dark flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            All Bridged Tokens
          </h1>
          <p className="text-gray-400">
            View and sort all token bridge transactions
          </p>
        </div>

        {/* Sort Controls */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-400">Sort by:</span>
            <button
              onClick={() => handleSort('timestamp')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                sortBy === 'timestamp'
                  ? 'bg-base-blue text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              Time{' '}
              {sortBy === 'timestamp' && (
                <span className="ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            {data?.pagination && (
              <div className="ml-auto text-sm text-gray-400">
                Showing {((page - 1) * limit) + 1}-
                {Math.min(page * limit, data.pagination.total)} of{' '}
                {data.pagination.total} transactions
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {data?.data?.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No bridge transactions found</p>
                </div>
              ) : (
                data?.data?.map((token) => (
                  <BridgeCard key={token.id} token={token} />
                ))
              )}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    page === 1
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  )}
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-400">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(data.pagination.totalPages, p + 1)
                    )
                  }
                  disabled={page === data.pagination.totalPages}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    page === data.pagination.totalPages
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  )}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

