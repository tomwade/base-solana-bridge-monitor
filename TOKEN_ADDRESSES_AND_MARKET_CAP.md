# Token Addresses and Market Cap Implementation

## Summary of Changes

### ✅ Token Addresses - NOW CAPTURED

**Both Base and Solana token addresses are now stored:**

1. **In BridgeTransaction entity:**
   - `baseTokenAddress`: Base ERC20 token address (e.g., `0x3119...`)
   - `solanaTokenAddress`: Solana mint address stored as bytes32
   - `localToken`: Base token address (same as baseTokenAddress)
   - `remoteToken`: Solana mint address as bytes32

2. **In Token entity:**
   - `address`: Base ERC20 token address (primary key)
   - `solanaMintAddress`: Solana mint address (bytes32) for cross-chain lookup

**Example:**
```graphql
{
  baseTokenAddress: "0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82"
  solanaTokenAddress: "0x..." # bytes32 representation of Solana mint
  solanaMintAddress: "So11111111111111111111111111111111111111112" # Base58 decoded
}
```

### ⚠️ Market Cap - SCHEMA READY, NEEDS PRICE DATA

**Current Status:**
- ✅ Schema includes `marketCapUSD` and `priceUSD` fields
- ✅ Price API integration created (`lib/price-api.ts`)
- ✅ API endpoint for price updates (`/api/bridge/prices`)
- ❌ **Prices are NOT automatically fetched** - requires manual setup

**What's Missing:**
1. Automatic price fetching (cron job or scheduled task)
2. Price updates stored in Envio indexer
3. Market cap sorting properly implemented (currently falls back to amount)

## How to Access Token Addresses

### Via GraphQL Query

```graphql
query {
  bridgeTransactions(first: 10) {
    baseTokenAddress    # Base ERC20 address
    solanaTokenAddress  # Solana mint (bytes32)
    token {
      address           # Base token address
      solanaMintAddress # Solana mint (bytes32)
    }
  }
  
  tokens(first: 10) {
    address             # Base ERC20 address
    solanaMintAddress   # Solana mint (bytes32)
  }
}
```

### Via API Response

The API routes now return:
```json
{
  "baseTokenAddress": "0x3119...",
  "solanaTokenAddress": "0x...",
  "localToken": "0x3119...",
  "remoteToken": "0x..."
}
```

## Market Cap Implementation

### Current Behavior

When sorting by "marketCap":
- **With Envio**: Falls back to sorting by transaction amount (not actual market cap)
- **Without Envio**: Sorts by transaction amount

### To Enable Real Market Cap Sorting

1. **Set up price updates:**
   ```bash
   # Call periodically (every 5-15 minutes)
   POST /api/bridge/prices
   {
     "tokens": [
       { "baseAddress": "0x3119..." },
       { "baseAddress": "0x..." }
     ]
   }
   ```

2. **Update Envio with prices:**
   - Prices need to be stored in the Token entity
   - This requires GraphQL mutations or re-indexing

3. **Update sorting logic:**
   - Modify `getAllBridgeTransactions` to sort by `token.marketCapUSD`
   - Requires joining Token entity in GraphQL query

## Conversion Helpers Needed

### Solana Address Conversion

The Solana mint address is stored as `bytes32` in the events. To convert:

**From bytes32 to Base58 (Solana format):**
```typescript
// You'll need a base58 library
import bs58 from 'bs58'

function bytes32ToSolanaAddress(bytes32: string): string {
  // Remove 0x prefix and convert
  const bytes = Buffer.from(bytes32.slice(2), 'hex')
  return bs58.encode(bytes)
}
```

**From Base58 to bytes32:**
```typescript
function solanaAddressToBytes32(base58: string): string {
  const bytes = bs58.decode(base58)
  return '0x' + Buffer.from(bytes).toString('hex').padStart(64, '0')
}
```

## Next Steps

1. ✅ **Token addresses**: Complete - both addresses stored
2. ⏳ **Market cap**: 
   - Set up price update cron job
   - Integrate price data into Envio
   - Update sorting to use actual market cap
3. 🔄 **Future enhancements**:
   - Add price display in UI
   - Show USD value of bridged amounts
   - Add price change indicators
   - Support for Solana token price lookup

## Files Modified

- `envio/schema.graphql` - Added `baseTokenAddress`, `solanaTokenAddress`, `solanaMintAddress`, `marketCapUSD`, `priceUSD`
- `envio/src/Bridge.ts` - Updated handlers to store both addresses
- `lib/envio.ts` - Updated GraphQL queries to include new fields
- `lib/price-api.ts` - Created price API integration
- `app/api/bridge/prices/route.ts` - Created price update endpoint

