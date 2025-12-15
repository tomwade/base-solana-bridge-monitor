import bs58 from 'bs58'

/**
 * Check if a string is already a valid base58 Solana address
 */
export function isBase58Address(address: string): boolean {
  try {
    // Solana addresses are typically 32-44 characters in base58
    if (address.length < 32 || address.length > 44) {
      return false
    }
    // Try to decode it - if it succeeds, it's valid base58
    const decoded = bs58.decode(address)
    // Solana addresses are 32 bytes
    return decoded.length === 32
  } catch {
    return false
  }
}

/**
 * Convert bytes32 (hex string) to Solana base58 address
 * Solana addresses are 32 bytes, stored as bytes32 in EVM contracts
 * 
 * @param bytes32 - Hex string (with or without 0x prefix) or already base58 address
 * @returns Base58 encoded Solana address, or null if conversion fails
 */
export function bytes32ToBase58(bytes32: string): string | null {
  try {
    // If it's already a valid base58 address, return it as-is
    const isBase58 = isBase58Address(bytes32)
    
    if (isBase58) {
      return bytes32
    }
    
    // Remove '0x' prefix if present
    const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32

    // Ensure hex string has even length (each byte is 2 hex chars)
    const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex

    // Convert hex to bytes
    const bytes = Buffer.from(paddedHex, 'hex')
    
    // Solana addresses are exactly 32 bytes
    // Handle padding/truncation
    let finalBytes: Buffer
    if (bytes.length > 32) {
      // If longer than 32 bytes, take the last 32 bytes
      finalBytes = bytes.slice(-32)
    } else if (bytes.length < 32) {
      // If shorter than 32 bytes, pad with zeros at the beginning
      finalBytes = Buffer.concat([Buffer.alloc(32 - bytes.length, 0), bytes])
    } else {
      finalBytes = bytes
    }
    
    const result = bs58.encode(finalBytes)

    return result
  } catch (error) {
    console.error('[solana-utils] Error converting bytes32 to base58:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      input: bytes32,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return null
  }
}

/**
 * Convert Solana base58 address to bytes32 (hex string)
 */
export function base58ToBytes32(base58: string): string | null {
  try {
    const bytes = bs58.decode(base58)
    
    // Ensure it's 32 bytes
    if (bytes.length !== 32) {
      console.warn(`Solana address length is ${bytes.length}, expected 32`)
      return null
    }
    
    return '0x' + Buffer.from(bytes).toString('hex').padStart(64, '0')
  } catch (error) {
    console.error('Error converting base58 to bytes32:', error)
    return null
  }
}

