// Envio API client utilities

const ENVIO_API_URL = process.env.NEXT_PUBLIC_ENVIO_API_URL

interface EnvioQuery {
  query: string
  variables?: Record<string, any>
}

interface BridgeTransaction {
  id: string
  transactionHash: string
  blockNumber: string
  blockTimestamp: string
  logIndex: string
  tokenAddress: string
  tokenName: string | null
  tokenSymbol: string | null
  decimals: number | null
  direction: 'SOLANA_TO_BASE' | 'BASE_TO_SOLANA'
  localToken: string
  remoteToken: string
  to: string
  amount: string
  amountFormatted: string | null
  fromAddress: string
  toAddress: string
}

interface Token {
  id: string
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
}

async function queryEnvio<T>(query: string, variables?: Record<string, any>): Promise<T> {
  if (!ENVIO_API_URL) {
    throw new Error('NEXT_PUBLIC_ENVIO_API_URL is not set')
  }

  const response = await fetch(ENVIO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`Envio API error: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result.data
}

export async function getLatestBridgeTransactions(
  limit: number = 10,
  direction?: 'solana-to-base' | 'base-to-solana'
): Promise<BridgeTransaction[]> {
  const directionValue =
    direction === 'solana-to-base'
      ? 'SOLANA_TO_BASE'
      : direction === 'base-to-solana'
      ? 'BASE_TO_SOLANA'
      : null

  const whereClause = directionValue
    ? `\n        where: { direction: { _eq: ${directionValue} } }`
    : ''

  const query = `
    query GetLatestBridgeTransactions($limit: Int!) {
      BridgeTransaction(
        order_by: { blockTimestamp: desc }
        limit: $limit${whereClause}
      ) {
        id
        transactionHash
        blockNumber
        blockTimestamp
        logIndex
        tokenAddress
        tokenName
        tokenSymbol
        decimals
        direction
        localToken
        remoteToken
        baseTokenAddress
        solanaTokenAddress
        to
        amount
        amountFormatted
        fromAddress
        toAddress
      }
    }
  `

  const data = await queryEnvio<{
    BridgeTransaction: BridgeTransaction[]
  }>(query, { limit })

  return data.BridgeTransaction
}

export async function getTopBridgedTokens(
  limit: number = 10,
  direction?: 'solana-to-base' | 'base-to-solana'
): Promise<Token[]> {
  // Build where clause for tokens with bridge activity
  let whereClause = ''
  if (direction === 'solana-to-base') {
    whereClause = '\n        where: { totalBridgedFromSolana: { _gt: "0" } }'
  } else if (direction === 'base-to-solana') {
    whereClause = '\n        where: { totalBridgedToSolana: { _gt: "0" } }'
  } else {
    whereClause = '\n        where: { _or: [{ totalBridgedToSolana: { _gt: "0" } }, { totalBridgedFromSolana: { _gt: "0" } }] }'
  }

  // Fetch more tokens than needed since we'll sort by market cap
  // Some tokens may not have market cap data, so we fetch more to ensure we get enough with market cap
  const fetchLimit = limit * 5

  const query = `
    query GetTopBridgedTokens($limit: Int!) {
      Token(
        ${whereClause}
        limit: $limit
      ) {
        id
        address
        name
        symbol
        decimals
        solanaMintAddress
        totalBridgedToSolana
        totalBridgedFromSolana
        bridgeCountToSolana
        bridgeCountFromSolana
        lastBridgeTime
        marketCapUSD
        priceUSD
        lastPriceUpdate
      }
    }
  `

  const data = await queryEnvio<{
    Token: Token[]
  }>(query, { limit: fetchLimit })

  // Sort by market cap (marketCapUSD) descending
  // Tokens without market cap will be sorted to the end
  const sortedTokens = [...data.Token].sort((a, b) => {
    // Parse market cap values, treating null/empty/NaN as -Infinity (so they sort to the end)
    const marketCapA = a.marketCapUSD && a.marketCapUSD.trim() !== '' 
      ? parseFloat(a.marketCapUSD) 
      : -Infinity
    const marketCapB = b.marketCapUSD && b.marketCapUSD.trim() !== '' 
      ? parseFloat(b.marketCapUSD) 
      : -Infinity
    
    // Handle NaN values (shouldn't happen, but just in case)
    const valueA = isNaN(marketCapA) ? -Infinity : marketCapA
    const valueB = isNaN(marketCapB) ? -Infinity : marketCapB
    
    // Sort descending: higher market cap first
    return valueB - valueA
  })

  // Return top N tokens (prioritizing those with market cap data)
  return sortedTokens.slice(0, limit)
}

export async function getAllBridgeTransactions(
  sortBy: 'timestamp' | 'marketCap' = 'timestamp',
  order: 'asc' | 'desc' = 'desc',
  page: number = 1,
  limit: number = 50
): Promise<{
  data: BridgeTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> {
  // For market cap sorting, we need to join with Token entity
  // For now, sort by amount if marketCap requested (will be improved with proper joins)
  const orderByField = sortBy === 'timestamp' ? 'blockTimestamp' : 'amount'
  const orderDirection = order === 'asc' ? 'asc' : 'desc'
  const offset = (page - 1) * limit

  // First get total count
  const countQuery = `
    query GetBridgeTransactionCount {
      BridgeTransaction {
        id
      }
    }
  `

  // Then get paginated results
  const dataQuery = `
    query GetAllBridgeTransactions($limit: Int!, $offset: Int!) {
      BridgeTransaction(
        order_by: { ${orderByField}: ${orderDirection} }
        limit: $limit
        offset: $offset
      ) {
        id
        transactionHash
        blockNumber
        blockTimestamp
        logIndex
        tokenAddress
        tokenName
        tokenSymbol
        decimals
        direction
        localToken
        remoteToken
        baseTokenAddress
        solanaTokenAddress
        to
        amount
        amountFormatted
        fromAddress
        toAddress
        token {
          marketCapUSD
          priceUSD
        }
      }
    }
  `

  const [countData, transactionsData] = await Promise.all([
    queryEnvio<{ BridgeTransaction: { id: string }[] }>(countQuery),
    queryEnvio<{ BridgeTransaction: BridgeTransaction[] }>(dataQuery, {
      limit,
      offset,
    }),
  ])

  const total = countData.BridgeTransaction.length
  const totalPages = Math.ceil(total / limit)

  return {
    data: transactionsData.BridgeTransaction,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

export async function getTokenBridgeTransactions(
  tokenAddress: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  data: BridgeTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  token: Token | null
}> {
  const offset = (page - 1) * limit

  // Get token info and transactions in parallel
  const tokenQuery = `
    query GetToken($tokenAddress: String!) {
      Token(where: { address: { _eq: $tokenAddress } }, limit: 1) {
        id
        address
        name
        symbol
        decimals
        solanaMintAddress
        totalBridgedToSolana
        totalBridgedFromSolana
        bridgeCountToSolana
        bridgeCountFromSolana
        lastBridgeTime
        marketCapUSD
        priceUSD
        lastPriceUpdate
      }
    }
  `

  const countQuery = `
    query GetTokenBridgeTransactionCount($tokenAddress: String!) {
      BridgeTransaction(
        where: { tokenAddress: { _eq: $tokenAddress } }
      ) {
        id
      }
    }
  `

  const transactionsQuery = `
    query GetTokenBridgeTransactions($tokenAddress: String!, $limit: Int!, $offset: Int!) {
      BridgeTransaction(
        where: { tokenAddress: { _eq: $tokenAddress } }
        order_by: { blockTimestamp: desc }
        limit: $limit
        offset: $offset
      ) {
        id
        transactionHash
        blockNumber
        blockTimestamp
        logIndex
        tokenAddress
        tokenName
        tokenSymbol
        decimals
        direction
        localToken
        remoteToken
        baseTokenAddress
        solanaTokenAddress
        to
        amount
        amountFormatted
        fromAddress
        toAddress
      }
    }
  `

  const [tokenData, countData, transactionsData] = await Promise.all([
    queryEnvio<{ Token: Token[] }>(tokenQuery, { tokenAddress: tokenAddress.toLowerCase() }),
    queryEnvio<{ BridgeTransaction: { id: string }[] }>(countQuery, {
      tokenAddress: tokenAddress.toLowerCase(),
    }),
    queryEnvio<{ BridgeTransaction: BridgeTransaction[] }>(transactionsQuery, {
      tokenAddress: tokenAddress.toLowerCase(),
      limit,
      offset,
    }),
  ])

  const total = countData.BridgeTransaction.length
  const totalPages = Math.ceil(total / limit)
  const token = tokenData.Token.length > 0 ? tokenData.Token[0] : null

  return {
    data: transactionsData.BridgeTransaction,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    token,
  }
}

export function isEnvioEnabled(): boolean {
  return !!ENVIO_API_URL
}
