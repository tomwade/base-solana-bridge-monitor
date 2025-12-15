'use client'

import { useQuery } from '@tanstack/react-query'
import { BridgedToken } from '@/types/bridge'
import { BridgeCard } from './BridgeCard'
import { useEffect, useRef } from 'react'

interface LatestBridgedProps {
  direction: 'solana-to-base' | 'base-to-solana'
  title: string
}

export function LatestBridged({ direction, title }: LatestBridgedProps) {
  const { data, isLoading } = useQuery<{ data: BridgedToken[] }>({
    queryKey: ['latest-bridged', direction],
    queryFn: async () => {
      const res = await fetch(
        `/api/bridge/latest?direction=${direction}&limit=5`
      )
      return res.json()
    },
  })

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data?.data && containerRef.current) {
      // Auto-insert new items at the top
      const container = containerRef.current
      const firstChild = container.firstElementChild
      
      // Scroll to top smoothly if new items are added
      if (firstChild) {
        container.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div
        ref={containerRef}
        className="space-y-4 max-h-[600px] overflow-y-auto"
      >
        {data?.data?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No bridge events found
          </p>
        ) : (
          data?.data?.map((token) => (
            <BridgeCard key={token.id} token={token} />
          ))
        )}
      </div>
    </div>
  )
}

