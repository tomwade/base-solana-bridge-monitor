'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface PriceData {
  priceUSD: number | null
  marketCapUSD: number | null
  lastUpdated: number
  isLoading: boolean
}

interface PriceCache {
  [tokenAddress: string]: PriceData
}

interface TokenAddressMapping {
  [baseAddress: string]: string // Maps Base address to Solana address
  [solanaAddress: string]: string // Maps Solana address to Base address
}

const CACHE_DURATION = 60 * 1000 // 60 seconds in milliseconds
const priceCache: PriceCache = {}
const addressMapping: TokenAddressMapping = {} // Track Base <-> Solana address mappings

export function useTokenPrice(
  tokenAddress: string | null | undefined,
  solanaMintAddress?: string | null,
  direction?: 'solana-to-base' | 'base-to-solana'
) {
  const [priceData, setPriceData] = useState<PriceData>({
    priceUSD: null,
    marketCapUSD: null,
    lastUpdated: 0,
    isLoading: false,
  })

  const isFetchingRef = useRef(false)

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress || isFetchingRef.current) return

    // Check cache first
    const cached = priceCache[tokenAddress.toLowerCase()]
    const now = Date.now()

    if (cached && now - cached.lastUpdated < CACHE_DURATION) {
      // Use cached data
      setPriceData({
        ...cached,
        isLoading: false,
      })
      return
    }

    // Set loading state
    setPriceData((prev) => ({
      ...prev,
      isLoading: true,
    }))
    isFetchingRef.current = true

    try {
      // If we have both addresses and direction, fetch prices from both chains
      // and select the appropriate one based on direction (source chain first, then fallback)
      if (solanaMintAddress && direction) {
        const response = await fetch('/api/bridge/prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            baseAddress: tokenAddress,
            solanaAddress: solanaMintAddress,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const prices = data.prices

          // Select price based on direction: try source chain first, then fallback to other chain
          let selectedPrice = null
          let selectedMarketCap = null

          if (direction === 'solana-to-base') {
            // Try Solana price first, fallback to Base
            selectedPrice = prices.solana?.priceUSD ?? prices.base?.priceUSD ?? null
            selectedMarketCap = prices.solana?.marketCapUSD ?? prices.base?.marketCapUSD ?? null
          } else {
            // Try Base price first, fallback to Solana
            selectedPrice = prices.base?.priceUSD ?? prices.solana?.priceUSD ?? null
            selectedMarketCap = prices.base?.marketCapUSD ?? prices.solana?.marketCapUSD ?? null
          }

          const newPriceData: PriceData = {
            priceUSD: selectedPrice,
            marketCapUSD: selectedMarketCap,
            lastUpdated: now,
            isLoading: false,
          }

          // Update cache for the Base address
          const baseAddressKey = tokenAddress.toLowerCase()
          priceCache[baseAddressKey] = newPriceData

          // Cache for Solana address too
          if (solanaMintAddress) {
            priceCache[solanaMintAddress.toLowerCase()] = newPriceData
            addressMapping[baseAddressKey] = solanaMintAddress
            addressMapping[solanaMintAddress.toLowerCase()] = tokenAddress
          }

          setPriceData(newPriceData)
        } else {
          // Fallback to single-chain fetch
          const fallbackResponse = await fetch(
            `/api/bridge/prices?address=${tokenAddress}${solanaMintAddress ? `&solanaAddress=${solanaMintAddress}` : ''}`
          )
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            const newPriceData: PriceData = {
              priceUSD: fallbackData.price?.priceUSD || null,
              marketCapUSD: fallbackData.price?.marketCapUSD || null,
              lastUpdated: now,
              isLoading: false,
            }
            priceCache[tokenAddress.toLowerCase()] = newPriceData
            setPriceData(newPriceData)
          } else {
            throw new Error('Failed to fetch price')
          }
        }
      } else {
        // Single-chain fetch (original behavior)
        const response = await fetch(
          `/api/bridge/prices?address=${tokenAddress}${solanaMintAddress ? `&solanaAddress=${solanaMintAddress}` : ''}`
        )

        if (response.ok) {
          const data = await response.json()
          const newPriceData: PriceData = {
            priceUSD: data.price?.priceUSD || null,
            marketCapUSD: data.price?.marketCapUSD || null,
            lastUpdated: now,
            isLoading: false,
          }

          // Update cache for the Base address
          const baseAddressKey = tokenAddress.toLowerCase()
          priceCache[baseAddressKey] = newPriceData

          // If we have a Solana address mapping, also cache for that address
          if (solanaMintAddress) {
            priceCache[solanaMintAddress.toLowerCase()] = newPriceData
            addressMapping[baseAddressKey] = solanaMintAddress
            addressMapping[solanaMintAddress.toLowerCase()] = tokenAddress
          } else {
            const solanaAddress = addressMapping[baseAddressKey]
            if (solanaAddress) {
              priceCache[solanaAddress.toLowerCase()] = newPriceData
            }
          }

          setPriceData(newPriceData)
        } else {
          throw new Error('Failed to fetch price')
        }
      }
    } catch (error) {
      // Use cached data if available
      if (cached) {
        setPriceData({
          ...cached,
          isLoading: false,
        })
      } else {
        setPriceData({
          priceUSD: null,
          marketCapUSD: null,
          lastUpdated: 0,
          isLoading: false,
        })
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [tokenAddress, solanaMintAddress, direction])

  useEffect(() => {
    if (!tokenAddress) {
      setPriceData({
        priceUSD: null,
        marketCapUSD: null,
        lastUpdated: 0,
        isLoading: false,
      })
      return
    }

    const cached = priceCache[tokenAddress.toLowerCase()]
    const now = Date.now()

    // If we have cached data, use it immediately
    if (cached) {
      setPriceData({
        ...cached,
        isLoading: now - cached.lastUpdated >= CACHE_DURATION,
      })
    }

    // Fetch if cache is stale or doesn't exist
    if (!cached || now - cached.lastUpdated >= CACHE_DURATION) {
      fetchPrice()
    }
  }, [tokenAddress, solanaMintAddress, direction, fetchPrice])

  return {
    ...priceData,
    refetch: fetchPrice,
  }
}

// Hook for multiple tokens (batch fetching)
export function useTokenPrices(tokenAddresses: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const isFetchingRef = useRef(false)

  const fetchPrices = useCallback(async () => {
    if (tokenAddresses.length === 0 || isFetchingRef.current) return

    const now = Date.now()
    const addressesToFetch: string[] = []

    // Check which addresses need fetching
    tokenAddresses.forEach((addr) => {
      const key = addr.toLowerCase()
      const cached = priceCache[key]
      if (!cached || now - cached.lastUpdated >= CACHE_DURATION) {
        addressesToFetch.push(addr)
      } else {
        // Use cached data
        setPrices((prev) => ({
          ...prev,
          [key]: cached,
        }))
      }
    })

    if (addressesToFetch.length === 0) return

    isFetchingRef.current = true

    // Set loading state for addresses being fetched
    addressesToFetch.forEach((addr) => {
      const key = addr.toLowerCase()
      setPrices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          isLoading: true,
        },
      }))
    })

    try {
      const response = await fetch('/api/bridge/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: addressesToFetch.map((addr) => ({ baseAddress: addr })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newPrices: Record<string, PriceData> = {}

        addressesToFetch.forEach((addr) => {
          const key = addr.toLowerCase()
          const priceInfo = data.prices[key]

          const priceData: PriceData = {
            priceUSD: priceInfo?.priceUSD || null,
            marketCapUSD: priceInfo?.marketCapUSD || null,
            lastUpdated: now,
            isLoading: false,
          }

          // Update cache
          priceCache[key] = priceData
          newPrices[key] = priceData
        })

        setPrices((prev) => ({
          ...prev,
          ...newPrices,
        }))
      }
    } catch (error) {
      console.error('Error fetching prices:', error)
      // Keep existing prices, just remove loading state
      addressesToFetch.forEach((addr) => {
        const key = addr.toLowerCase()
        setPrices((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            isLoading: false,
          },
        }))
      })
    } finally {
      isFetchingRef.current = false
    }
  }, [tokenAddresses])

  useEffect(() => {
    if (tokenAddresses.length === 0) {
      setPrices({})
      return
    }

    // Load cached prices immediately
    const cachedPrices: Record<string, PriceData> = {}
    const now = Date.now()

    tokenAddresses.forEach((addr) => {
      const key = addr.toLowerCase()
      const cached = priceCache[key]
      if (cached) {
        cachedPrices[key] = {
          ...cached,
          isLoading: now - cached.lastUpdated >= CACHE_DURATION,
        }
      }
    })

    if (Object.keys(cachedPrices).length > 0) {
      setPrices(cachedPrices)
    }

    // Fetch prices that need updating
    fetchPrices()
  }, [tokenAddresses, fetchPrices])

  return prices
}

