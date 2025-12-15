import { NextResponse } from 'next/server'
import { updateTokenPrices, getTokenPricesBothChains } from '@/lib/price-api'
import { isEnvioEnabled } from '@/lib/envio'
import { isBase58Address } from '@/lib/solana-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// API endpoint to update token prices (batch) or fetch both chain prices
// This can be called periodically or on-demand
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[API /prices POST] Request body:', {
      hasBaseAddress: !!body.baseAddress,
      hasSolanaAddress: !!body.solanaAddress,
      hasTokens: !!body.tokens,
      tokensCount: body.tokens?.length || 0,
    })
    
    // Check if this is a request for both chain prices (single token)
    if (body.baseAddress) {
      const { baseAddress, solanaAddress } = body

      if (!baseAddress) {
        console.error('[API /prices POST] Missing baseAddress parameter')
        return NextResponse.json(
          { error: 'baseAddress parameter required' },
          { status: 400 }
        )
      }

      console.log('[API /prices POST] Dual-chain price request:', {
        baseAddress,
        solanaAddress,
        hasSolanaAddress: !!solanaAddress,
      })

      // If Solana address not provided, try to fetch it from Envio
      let solanaMintAddress = solanaAddress

      if (!solanaMintAddress && isEnvioEnabled()) {
        try {
          const ENVIO_API_URL = process.env.NEXT_PUBLIC_ENVIO_API_URL
          console.log('[API /prices] Fetching Solana address from Envio for:', baseAddress)
          
          if (ENVIO_API_URL) {
            const tokenQuery = `
              query GetToken($tokenAddress: String!) {
                Token(where: { address: { _eq: $tokenAddress } }, limit: 1) {
                  solanaMintAddress
                }
              }
            `

            const response = await fetch(ENVIO_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: tokenQuery,
                variables: { tokenAddress: baseAddress.toLowerCase() },
              }),
            })

            if (response.ok) {
              const result = await response.json()
              console.log('[API /prices] Envio response:', {
                hasData: !!result.data,
                hasToken: !!result.data?.Token?.[0],
                solanaMintAddress: result.data?.Token?.[0]?.solanaMintAddress,
              })
              
              if (result.data?.Token?.[0]?.solanaMintAddress) {
                solanaMintAddress = result.data.Token[0].solanaMintAddress
                console.log('[API /prices] Using Solana address from Envio:', solanaMintAddress)
              }
            } else {
              console.warn('[API /prices] Envio query failed:', response.status, response.statusText)
            }
          }
        } catch (error) {
          console.error('[API /prices] Failed to fetch Solana address from Envio:', error)
        }
      }

      console.log('[API /prices] Calling getTokenPricesBothChains with:', {
        baseAddress,
        solanaMintAddress,
        hasSolanaAddress: !!solanaMintAddress,
      })

      // Get Helius API key from environment
      const heliusApiKey = process.env.HELIUS_API_KEY
      console.log('[API /prices POST] API keys available:', {
        hasHeliusKey: !!heliusApiKey,
        heliusKeyLength: heliusApiKey?.length || 0,
      })

      const { getTokenPricesBothChains } = await import('@/lib/price-api')
      console.log('[API /prices POST] Calling getTokenPricesBothChains:', {
        baseAddress,
        solanaMintAddress,
        hasSolanaMintAddress: !!solanaMintAddress,
        hasHeliusKey: !!heliusApiKey,
      })
      
      const startTime = Date.now()
      const prices = await getTokenPricesBothChains(
        baseAddress,
        solanaMintAddress,
        heliusApiKey
      )
      const fetchDuration = Date.now() - startTime

      console.log('[API /prices POST] Price fetch completed:', {
        duration: `${fetchDuration}ms`,
        basePrice: prices.base?.priceUSD || null,
        baseMarketCap: prices.base?.marketCapUSD || null,
        hasBasePrice: !!prices.base,
        solanaPrice: prices.solana?.priceUSD || null,
        solanaMarketCap: prices.solana?.marketCapUSD || null,
        hasSolanaPrice: !!prices.solana,
      })

      return NextResponse.json({ prices })
    }
    
    // Otherwise, handle batch token price updates
    const tokens = body.tokens || []
    console.log('[API /prices POST] Batch price update request:', {
      tokensCount: tokens.length,
      tokenAddresses: tokens.map((t: any) => t.baseAddress || t.address).slice(0, 5), // Log first 5
    })

    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.error('[API /prices POST] Invalid tokens array:', {
        isArray: Array.isArray(tokens),
        length: tokens.length,
      })
      return NextResponse.json(
        { error: 'Invalid tokens array' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const prices = await updateTokenPrices(tokens)
    const fetchDuration = Date.now() - startTime
    
    console.log('[API /prices POST] Batch price update completed:', {
      duration: `${fetchDuration}ms`,
      tokensProcessed: tokens.length,
      pricesFound: prices.size,
      priceKeys: Array.from(prices.keys()).slice(0, 5), // Log first 5
    })

    // Convert Map to object for JSON response
    const pricesObj: Record<string, any> = {}
    prices.forEach((value, key) => {
      pricesObj[key] = value
    })

    return NextResponse.json({ prices: pricesObj })
  } catch (error) {
    console.error('Error in POST /api/bridge/prices:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch price for a single token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      console.error('[API /prices GET] Missing address parameter')
      return NextResponse.json(
        { error: 'Address parameter required' },
        { status: 400 }
      )
    }

    // Step 1: Determine if address is Solana (base58) or Base (hex/0x)
    const isSolanaAddress = isBase58Address(address)
    const isBaseAddress = address.startsWith('0x') || /^[0-9a-fA-F]{40}$/.test(address)

    if (!isEnvioEnabled()) {
      console.error('[API /prices GET] Envio is not enabled')
      return NextResponse.json(
        { error: 'Envio indexer is required' },
        { status: 503 }
      )
    }

    // Step 2: Query Envio to get token record with both addresses
    const ENVIO_API_URL = process.env.NEXT_PUBLIC_ENVIO_API_URL
    if (!ENVIO_API_URL) {
      console.error('[API /prices GET] ENVIO_API_URL not configured')
      return NextResponse.json(
        { error: 'Envio API URL not configured' },
        { status: 500 }
      )
    }

    // Build query based on address type
    let tokenQuery: string
    let variables: Record<string, any>

    if (isSolanaAddress) {
      // Query by Solana address
      tokenQuery = `
        query GetTokenBySolana($solanaAddress: String!) {
          Token(where: { solanaMintAddress: { _eq: $solanaAddress } }, limit: 1) {
            id
            address
            solanaMintAddress
          }
        }
      `
      variables = { solanaAddress: address }
    } else if (isBaseAddress) {
      // Query by Base address
      tokenQuery = `
        query GetTokenByBase($baseAddress: String!) {
          Token(where: { address: { _eq: $baseAddress } }, limit: 1) {
            id
            address
            solanaMintAddress
          }
        }
      `
      variables = { baseAddress: address.toLowerCase() }
    } else {
      console.error('[API /prices GET] Invalid address format:', address)
      return NextResponse.json(
        { error: 'Invalid address format. Must be Base (hex) or Solana (base58) address' },
        { status: 400 }
      )
    }

    console.log('[API /prices GET] Querying Envio:', {
      queryType: isSolanaAddress ? 'bySolana' : 'byBase',
      variables,
    })

    const envioResponse = await fetch(ENVIO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: tokenQuery,
        variables,
      }),
    })

    if (!envioResponse.ok) {
      console.error('[API /prices GET] Envio query failed:', {
        status: envioResponse.status,
        statusText: envioResponse.statusText,
      })
      return NextResponse.json(
        { error: 'Failed to query Envio indexer' },
        { status: 500 }
      )
    }

    const envioResult = await envioResponse.json()
    console.log('[API /prices GET] Envio response:', {
      hasData: !!envioResult.data,
      hasToken: !!envioResult.data?.Token?.[0],
      token: envioResult.data?.Token?.[0],
    })

    const token = envioResult.data?.Token?.[0]
    if (!token) {
      console.log('[API /prices GET] Token not found in Envio')
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    // Extract both addresses from Envio
    const baseAddress = token.address
    const solanaMintAddress = token.solanaMintAddress

    console.log('[API /prices GET] Token addresses from Envio:', {
      baseAddress,
      solanaMintAddress,
      hasBaseAddress: !!baseAddress,
      hasSolanaAddress: !!solanaMintAddress,
    })

    // Step 3: Fetch prices from both chains
    const heliusApiKey = process.env.HELIUS_API_KEY
    console.log('[API /prices GET] Fetching prices from both chains:', {
      baseAddress,
      solanaMintAddress,
      hasHeliusKey: !!heliusApiKey,
    })

    const startTime = Date.now()
    const prices = await getTokenPricesBothChains(
      baseAddress,
      solanaMintAddress,
      heliusApiKey
    )
    const fetchDuration = Date.now() - startTime

    console.log('[API /prices GET] Price fetch completed:', {
      duration: `${fetchDuration}ms`,
      basePrice: prices.base?.priceUSD || null,
      baseMarketCap: prices.base?.marketCapUSD || null,
      solanaPrice: prices.solana?.priceUSD || null,
      solanaMarketCap: prices.solana?.marketCapUSD || null,
    })

    // Step 4: Select price based on input address type with fallback
    let selectedPrice = null
    let selectedMarketCap = null

    if (isSolanaAddress) {
      // If input is Solana address: try Solana price first, fallback to Base
      selectedPrice = prices.solana?.priceUSD ?? prices.base?.priceUSD ?? null
      selectedMarketCap = prices.solana?.marketCapUSD ?? prices.base?.marketCapUSD ?? null
      console.log('[API /prices GET] Selected price (Solana input):', {
        priceUSD: selectedPrice,
        marketCapUSD: selectedMarketCap,
        source: prices.solana?.priceUSD ? 'solana' : prices.base?.priceUSD ? 'base' : 'none',
      })
    } else {
      // If input is Base address: try Base price first, fallback to Solana
      selectedPrice = prices.base?.priceUSD ?? prices.solana?.priceUSD ?? null
      selectedMarketCap = prices.base?.marketCapUSD ?? prices.solana?.marketCapUSD ?? null
      console.log('[API /prices GET] Selected price (Base input):', {
        priceUSD: selectedPrice,
        marketCapUSD: selectedMarketCap,
        source: prices.base?.priceUSD ? 'base' : prices.solana?.priceUSD ? 'solana' : 'none',
      })
    }

    const result = {
      priceUSD: selectedPrice,
      marketCapUSD: selectedMarketCap,
      lastUpdated: Date.now(),
    }

    console.log('[API /prices GET] Returning price:', result)
    return NextResponse.json({ price: result })
  } catch (error) {
    console.error('[API /prices GET] Error fetching price:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    )
  }
}

