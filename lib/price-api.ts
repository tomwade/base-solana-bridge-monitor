// Price API integration for market cap lookup
// Supports multiple price providers (CoinGecko, CoinMarketCap, etc.)

interface PriceData {
  priceUSD: number
  marketCapUSD: number | null
  lastUpdated: number
}

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'
const HELIUS_API_BASE = 'https://api.helius.xyz'
const ALCHEMY_BASE_URL = 'https://base-mainnet.g.alchemy.com/v2'

/**
 * Get CoinGecko API key from environment
 */
function getCoinGeckoApiKey(): string | undefined {
  // Try both possible environment variable names
  return process.env.COIN_GECKO_API_KEY || process.env.COINGECKO_API_KEY
}

/**
 * Get Alchemy API key from environment
 */
function getAlchemyApiKey(): string | undefined {
  return process.env.ALCHEMY_API_KEY
}

// Cache for CoinGecko API calls (60 second TTL)
// Also used for Helius API calls
interface CacheEntry {
  data: PriceData | null
  timestamp: number
}

const priceCache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 1000 // 60 seconds in milliseconds

/**
 * Get cache key for a token address and chain
 */
function getCacheKey(tokenAddress: string, chainId: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`
}

/**
 * Get cached price data if available and not expired
 */
function getCachedPrice(tokenAddress: string, chainId: string): PriceData | null | undefined {
  const cacheKey = getCacheKey(tokenAddress, chainId)
  const cached = priceCache.get(cacheKey)
  
  if (!cached) {
    return undefined // No cache entry
  }
  
  const now = Date.now()
  const age = now - cached.timestamp
  
  if (age < CACHE_TTL) {
    return cached.data
  }
  
  // Cache expired, remove it
  priceCache.delete(cacheKey)
  return undefined
}

/**
 * Store price data in cache
 */
function setCachedPrice(tokenAddress: string, chainId: string, data: PriceData | null): void {
  const cacheKey = getCacheKey(tokenAddress, chainId)
  priceCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  })
}

/**
 * Get Base token price and market cap from Alchemy Prices API
 */
async function getPriceFromAlchemy(
  tokenAddress: string
): Promise<PriceData | null> {
  // Check cache first
  const cached = getCachedPrice(tokenAddress, 'base-alchemy')
  if (cached != null) {
    return cached
  }

  const apiKey = getAlchemyApiKey()
  if (!apiKey) {
    return null
  }

  try {
    // Alchemy Prices API endpoint for Base chain
    // First, get token metadata to get symbol for price lookup
    const metadataUrl = `${ALCHEMY_BASE_URL}/${apiKey}`

    // Get token metadata to retrieve symbol
    const metadataResponse = await fetch(metadataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [tokenAddress],
      }),
    })

    if (!metadataResponse.ok) {
      setCachedPrice(tokenAddress, 'base-alchemy', null)
      return null
    }

    const metadataData = await metadataResponse.json() as {
      error?: { message: string; code?: number }
      result?: {
        name?: string
        symbol?: string
        decimals?: number
        totalSupply?: string
        logo?: string
      }
    }

    if (metadataData.error || !metadataData.result?.symbol) {
      setCachedPrice(tokenAddress, 'base-alchemy', null)
      return null
    }

    const symbol = metadataData.result.symbol
    const totalSupply = metadataData.result.totalSupply
      ? BigInt(metadataData.result.totalSupply)
      : null
    const decimals = metadataData.result.decimals || 18

    // Now fetch price using Alchemy Prices API
    const pricesUrl = `${ALCHEMY_BASE_URL}/${apiKey}/prices?symbol=${symbol}`

    const pricesResponse = await fetch(pricesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!pricesResponse.ok) {
      setCachedPrice(tokenAddress, 'base-alchemy', null)
      return null
    }

    const pricesData = await pricesResponse.json() as {
      prices?: Array<{
        symbol?: string
        price?: number
        marketCap?: number
      }>
      error?: string
    }

    if (pricesData.error) {
      setCachedPrice(tokenAddress, 'base-alchemy', null)
      return null
    }

    // Find the price for this symbol
    const priceInfo = pricesData.prices?.find((p) => 
      p.symbol?.toUpperCase() === symbol.toUpperCase()
    )

    if (!priceInfo || !priceInfo.price) {
      setCachedPrice(tokenAddress, 'base-alchemy', null)
      return null
    }

    let marketCapUSD: number | null = priceInfo.marketCap || null

    // If market cap not provided but we have supply and price, calculate it
    if (!marketCapUSD && totalSupply && priceInfo.price && decimals) {
      // Convert supply from raw amount to human-readable
      // Use Math.pow for decimals calculation (avoiding BigInt exponentiation)
      const supplyDivisor = Math.pow(10, decimals)
      const supplyFormatted = Number(totalSupply) / supplyDivisor
      marketCapUSD = supplyFormatted * priceInfo.price
    }

    const result = {
      priceUSD: priceInfo.price,
      marketCapUSD,
      lastUpdated: Date.now(),
    }

    // Cache the result
    setCachedPrice(tokenAddress, 'base-alchemy', result)
    return result
  } catch (error) {
    // Cache null result on error
    setCachedPrice(tokenAddress, 'base-alchemy', null)
    return null
  }
}

// Convert Base token address to CoinGecko format (if needed)
// For Base tokens, we may need to use contract addresses
async function getPriceFromCoinGecko(
  tokenAddress: string,
  chainId: string = 'base'
): Promise<PriceData | null> {
  // Check cache first
  const cached = getCachedPrice(tokenAddress, chainId)
  if (cached != null) {
    return cached
  }
  
  try {
    // CoinGecko API for Base tokens
    const apiKey = getCoinGeckoApiKey()
    let url = `${COINGECKO_API_BASE}/simple/token_price/${chainId}?contract_addresses=${tokenAddress}&vs_currencies=usd&include_market_cap=true`
    
    // Add API key if available
    if (apiKey) {
      url += `&x_cg_demo_api_key=${apiKey}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      // Cache null result to avoid repeated failed requests
      setCachedPrice(tokenAddress, chainId, null)
      return null
    }

    const data = await response.json()
    const tokenData = data[tokenAddress.toLowerCase()]

    if (!tokenData || !tokenData.usd) {
      // Cache null result
      setCachedPrice(tokenAddress, chainId, null)
      return null
    }

    const result = {
      priceUSD: tokenData.usd,
      marketCapUSD: tokenData.usd_market_cap || null,
      lastUpdated: Date.now(),
    }

    // Cache the successful result
    setCachedPrice(tokenAddress, chainId, result)
    return result
  } catch (error) {
    // Cache null result on error to avoid repeated failed requests
    setCachedPrice(tokenAddress, chainId, null)
    return null
  }
}

// Import base58 conversion utility
import { bytes32ToBase58 } from './solana-utils'

// Convert hex string (bytes32) to base58 for Solana addresses
function hexToBase58(hex: string): string | null {
  return bytes32ToBase58(hex)
}

// Get price from multiple sources (fallback chain)
export async function getTokenPrice(
  baseTokenAddress: string,
  solanaMintAddress?: string
): Promise<PriceData | null> {
  // Try CoinGecko first (Base chain)
  let priceData = await getPriceFromCoinGecko(baseTokenAddress, 'base')
  
  if (priceData) {
    return priceData
  }

  // If Base token price not found and Solana mint address provided, try Solana token lookup
  if (solanaMintAddress) {
    // Convert hex to base58 format for Solana
    const solanaAddress = hexToBase58(solanaMintAddress)
    if (solanaAddress) {
      // Try CoinGecko Solana chain
      priceData = await getPriceFromCoinGecko(solanaAddress, 'solana')
      if (priceData) {
        return priceData
      }
    }
  }

  return null
}

/**
 * Get Solana token supply from Helius RPC
 * Uses Helius RPC endpoint to get token supply for market cap calculation
 */
async function getSolanaTokenSupply(
  mintAddress: string,
  heliusApiKey: string
): Promise<number | null> {
  try {
    const rpcUrl = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'supply-lookup',
        method: 'getTokenSupply',
        params: [mintAddress],
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json() as {
      result?: {
        value?: {
          uiAmount?: number
          amount?: string
        }
      }
      error?: {
        code?: number
        message?: string
      }
    }

    if (data.error || !data.result?.value) {
      return null
    }

    // Return UI amount (human-readable) if available, otherwise parse amount string
    return data.result.value.uiAmount ?? parseFloat(data.result.value.amount || '0')
  } catch (error) {
    return null
  }
}

/**
 * Get Solana token price and market cap from Helius DAS API
 * Uses Helius getAsset method (DAS API) to fetch price data
 * Price data is cached for 60 seconds by Helius
 * Market cap is calculated from: (supply / 10^decimals) * price_per_token
 * 
 * Reference: https://www.helius.dev/docs/das/get-nfts#price-data-for-tokens
 */
async function getPriceFromHelius(
  mintAddress: string,
  heliusApiKey: string
): Promise<PriceData | null> {
  // Check cache first
  const cached = getCachedPrice(mintAddress, 'solana-helius')
  if (cached != null) {
    return cached
  }

  try {
    // Use Helius DAS API getAsset method
    // Endpoint: https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
    const url = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAsset',
        params: {
          id: mintAddress,
          displayOptions: {
            showFungible: true, // Required to get token_info with price data
          },
        },
      }),
    })
    
    if (!response.ok) {
      // Cache null result
      setCachedPrice(mintAddress, 'solana-helius', null)
      return null
    }

    const data = await response.json() as {
      error?: { code?: number; message?: string }
      result?: {
        token_info?: {
          symbol?: string
          supply?: number | string // Raw supply (needs decimals adjustment)
          decimals?: number
          token_program?: string
          price_info?: {
            price_per_token?: number // Price in USDC
            currency?: string
          }
        }
      }
    }

    if (data.error) {
      setCachedPrice(mintAddress, 'solana-helius', null)
      return null
    }

    if (!data.result?.token_info?.price_info) {
      setCachedPrice(mintAddress, 'solana-helius', null)
      return null
    }

    const tokenInfo = data.result.token_info
    const priceInfo = tokenInfo.price_info!

    // Extract price (price_per_token is in USDC, which is equivalent to USD)
    const priceUSD = priceInfo.price_per_token
    if (!priceUSD) {
      setCachedPrice(mintAddress, 'solana-helius', null)
      return null
    }

    // Calculate market cap: (supply / 10^decimals) * price_per_token
    let marketCapUSD: number | null = null
    if (tokenInfo.supply !== undefined && tokenInfo.decimals !== undefined) {
      const supply = typeof tokenInfo.supply === 'string' 
        ? parseFloat(tokenInfo.supply) 
        : tokenInfo.supply
      const decimals = tokenInfo.decimals
      
      // Adjust supply for decimals
      const adjustedSupply = supply / Math.pow(10, decimals)
      marketCapUSD = adjustedSupply * priceUSD
    }

    const result = {
      priceUSD,
      marketCapUSD,
      lastUpdated: Date.now(),
    }

    // Cache the result (Helius also caches for 60 seconds, but we cache to avoid repeated calls)
    setCachedPrice(mintAddress, 'solana-helius', result)
    return result
  } catch (error) {
    // Cache null result on error
    setCachedPrice(mintAddress, 'solana-helius', null)
    return null
  }
}

// Get prices for both Base and Solana tokens separately (no fallback)
export async function getTokenPricesBothChains(
  baseTokenAddress: string,
  solanaMintAddress?: string,
  heliusApiKey?: string
): Promise<{
  base: PriceData | null
  solana: PriceData | null
}> {
  // Fetch Base price - try Alchemy first, fallback to CoinGecko
  let basePrice: PriceData | null = null
  
  // Try Alchemy first if API key is available
  const alchemyApiKey = getAlchemyApiKey()
  if (alchemyApiKey) {
    basePrice = await getPriceFromAlchemy(baseTokenAddress)
  }
  
  // Fallback to CoinGecko if Alchemy didn't return price
  if (!basePrice) {
    basePrice = await getPriceFromCoinGecko(baseTokenAddress, 'base')
  }

  // Fetch Solana price from Helius if address and API key provided
  let solanaPrice: PriceData | null = null
  if (solanaMintAddress && heliusApiKey) {
    const solanaAddress = hexToBase58(solanaMintAddress)
    
    if (solanaAddress) {
      solanaPrice = await getPriceFromHelius(solanaAddress, heliusApiKey)
      
      // Fallback to CoinGecko if Helius doesn't return price
      if (!solanaPrice) {
        solanaPrice = await getPriceFromCoinGecko(solanaAddress, 'solana')
      }
    }
  } else if (solanaMintAddress) {
    // Fallback to CoinGecko if no Helius API key
    const solanaAddress = hexToBase58(solanaMintAddress)
    if (solanaAddress) {
      solanaPrice = await getPriceFromCoinGecko(solanaAddress, 'solana')
    }
  }

  return {
    base: basePrice,
    solana: solanaPrice,
  }
}

// Batch update prices for multiple tokens
export async function updateTokenPrices(
  tokens: Array<{ baseAddress: string; solanaAddress?: string }>
): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>()

  // First, try Base tokens
  const baseAddresses = tokens.map((t) => t.baseAddress.toLowerCase()).filter(Boolean)
  const batchSize = 100

  // Fetch Base token prices
  for (let i = 0; i < baseAddresses.length; i += batchSize) {
    const batch = baseAddresses.slice(i, i + batchSize)
    const apiKey = getCoinGeckoApiKey()
    let url = `${COINGECKO_API_BASE}/simple/token_price/base?contract_addresses=${batch.join(',')}&vs_currencies=usd&include_market_cap=true`
    if (apiKey) {
      url += `&x_cg_demo_api_key=${apiKey}`
    }

    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        for (const [address, priceInfo] of Object.entries(data)) {
          const priceData = priceInfo as any
          if (priceData.usd) {
            const priceResult: PriceData = {
              priceUSD: priceData.usd,
              marketCapUSD: priceData.usd_market_cap || null,
              lastUpdated: Date.now(),
            }
            results.set(address.toLowerCase(), priceResult)
            
            // Also cache for the corresponding Solana address if available
            const token = tokens.find(t => t.baseAddress.toLowerCase() === address.toLowerCase())
            if (token?.solanaAddress) {
              const solanaKey = token.solanaAddress.toLowerCase()
              results.set(solanaKey, priceResult)
            }
          }
        }
      }
    } catch (error) {
      // Silently handle batch fetch errors
    }
  }

  // Then, try Solana tokens for those that didn't get Base prices
  const tokensNeedingSolanaPrice = tokens.filter(
    (t) => !results.has(t.baseAddress.toLowerCase()) && t.solanaAddress
  )

  if (tokensNeedingSolanaPrice.length > 0) {
    const solanaAddresses = tokensNeedingSolanaPrice
      .map((t) => {
        if (!t.solanaAddress) return null
        return hexToBase58(t.solanaAddress)
      })
      .filter((addr): addr is string => addr !== null)

    for (let i = 0; i < solanaAddresses.length; i += batchSize) {
      const batch = solanaAddresses.slice(i, i + batchSize)
      const apiKey = getCoinGeckoApiKey()
      let url = `${COINGECKO_API_BASE}/simple/token_price/solana?contract_addresses=${batch.join(',')}&vs_currencies=usd&include_market_cap=true`
      if (apiKey) {
        url += `&x_cg_demo_api_key=${apiKey}`
      }

      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          for (const [address, priceInfo] of Object.entries(data)) {
            const priceData = priceInfo as any
            if (priceData.usd) {
              const priceResult: PriceData = {
                priceUSD: priceData.usd,
                marketCapUSD: priceData.usd_market_cap || null,
                lastUpdated: Date.now(),
              }
              
              // Find the token that matches this Solana address
              const token = tokensNeedingSolanaPrice.find((t) => {
                if (!t.solanaAddress) return false
                const converted = hexToBase58(t.solanaAddress)
                return converted?.toLowerCase() === address.toLowerCase()
              })
              
              if (token) {
                // Cache for both Base and Solana addresses
                results.set(token.baseAddress.toLowerCase(), priceResult)
                if (token.solanaAddress) {
                  results.set(token.solanaAddress.toLowerCase(), priceResult)
                }
              }
            }
          }
        }
      } catch (error) {
        // Silently handle batch fetch errors
      }
    }
  }

  return results
}

