export interface BridgedToken {
  id: string
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  decimals: number
  direction: 'solana-to-base' | 'base-to-solana'
  amount: string
  amountFormatted: string
  timestamp: number
  transactionHash: string
  fromAddress: string
  toAddress: string
  marketCap?: number
  totalBridged?: string
}

export interface BridgeStats {
  totalTokensBridged: number
  totalVolume: string
  solanaToBase: {
    count: number
    volume: string
  }
  baseToSolana: {
    count: number
    volume: string
  }
}

export interface TokenMetadata {
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

