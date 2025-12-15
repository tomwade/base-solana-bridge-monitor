# Market Cap Integration Guide

## Current Implementation

### Token Addresses

✅ **Both addresses are now stored:**
- `baseTokenAddress`: Base ERC20 token address
- `solanaTokenAddress`: Solana mint address (as bytes32)
- `solanaMintAddress`: Also stored in Token entity for easy lookup

### Market Cap Status

⚠️ **Market cap is NOT currently fetched automatically**

The schema includes `marketCapUSD` and `priceUSD` fields, but they need to be populated via:
1. External price API (CoinGecko, CoinMarketCap, etc.)
2. Manual updates via the `/api/bridge/prices` endpoint

## Setting Up Market Cap Lookup

### Option 1: CoinGecko API (Free Tier)

1. **Get API Key** (optional, free tier has rate limits):
   - Sign up at https://www.coingecko.com/en/api
   - Free tier: 10-50 calls/minute

2. **Update price fetching:**
   - The `lib/price-api.ts` file includes CoinGecko integration
   - Currently configured for Base chain tokens

3. **Set up periodic updates:**
   - Create a cron job or scheduled task
   - Call `/api/bridge/prices` endpoint periodically
   - Update Envio indexer with price data

### Option 2: Custom Price Oracle

1. **Integrate with your preferred price source:**
   - CoinMarketCap API
   - DeFiLlama API
   - Custom oracle contract

2. **Update `lib/price-api.ts`** with your provider

3. **Create update script** to fetch and store prices

## Implementation Steps

### Step 1: Update Prices via API

```bash
# POST to /api/bridge/prices
curl -X POST http://localhost:3000/api/bridge/prices \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": [
      { "baseAddress": "0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82" },
      { "baseAddress": "0x..." }
    ]
  }'
```

### Step 2: Update Envio Schema (if needed)

The schema already includes `marketCapUSD` and `priceUSD` fields. After updating prices, you'll need to:

1. Query Envio for tokens
2. Update token entities with price data
3. Re-index or update via GraphQL mutations

### Step 3: Sort by Market Cap

Once prices are populated, update the sorting logic:

```typescript
// In getAllBridgeTransactions, when sortBy === 'marketCap'
// Join with Token entity and sort by marketCapUSD
```

## Current Limitations

1. **No automatic price updates**: Prices must be fetched manually
2. **Market cap sorting**: Currently falls back to amount sorting
3. **Solana token prices**: Not yet integrated (would need Solana price API)

## Recommended Next Steps

1. **Set up price update cron job:**
   - Run every 5-15 minutes
   - Update top 100 tokens by volume
   - Store in Envio or cache

2. **Add price display to UI:**
   - Show USD value of bridged amounts
   - Display market cap in token lists
   - Add price change indicators

3. **Improve sorting:**
   - Implement proper market cap sorting with joins
   - Add fallback logic for missing prices

## Example Price Update Script

```typescript
// scripts/update-prices.ts
import { updateTokenPrices } from './lib/price-api'

async function updateAllPrices() {
  // Fetch top tokens from Envio
  const tokens = await getTopBridgedTokens(100)
  
  // Update prices
  const prices = await updateTokenPrices(
    tokens.map(t => ({
      baseAddress: t.address,
      solanaAddress: t.solanaMintAddress
    }))
  )
  
  // Update Envio indexer (via GraphQL mutations)
  // or store in separate price cache
}
```

