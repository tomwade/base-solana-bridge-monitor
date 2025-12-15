# Envio Integration Summary

This document summarizes the Envio indexer setup and integration with the Base-Solana Bridge Dashboard.

## What Was Created

### 1. Envio Indexer (`/envio` directory)

- **Schema** (`schema.graphql`): Defines the data structure
  - `BridgeTransaction`: Individual bridge transactions
  - `Token`: Token metadata and aggregated statistics
  - `BridgeStats`: Global bridge statistics

- **Handlers** (`src/Bridge.ts`): Event processing logic
  - `handleBridgeToken`: Processes Base → Solana transfers
  - `handleRelayMessage`: Processes Solana → Base transfers
  - Automatically fetches token metadata (name, symbol, decimals)
  - Aggregates statistics per token

- **Configuration** (`config.yaml`): Indexer setup
  - Monitors Base Mainnet Bridge contract
  - Indexes `BridgeToken` and `RelayMessage` events
  - Starts from block 0 (update `startBlock` to actual deployment block for faster initial sync)

### 2. Dashboard Integration (`/lib/envio.ts`)

- GraphQL client for querying Envio API
- Functions:
  - `getLatestBridgeTransactions()`: Latest bridge transactions
  - `getTopBridgedTokens()`: Top tokens by volume
  - `getAllBridgeTransactions()`: All transactions with pagination
- Automatic fallback to RPC if Envio is unavailable

### 3. Updated API Routes

All API routes (`/app/api/bridge/*`) now:
1. Check if Envio is enabled (`NEXT_PUBLIC_ENVIO_API_URL`)
2. Use Envio if available (faster, pre-indexed data)
3. Fall back to direct RPC calls if Envio is unavailable

## Setup Instructions

### Step 1: Deploy Envio Indexer

```bash
cd envio
npm install
npm run codegen
npm run build
npm run deploy
```

After deployment, you'll receive an API URL like:
```
https://your-indexer.envio.dev/api
```

### Step 2: Configure Dashboard

Add to `.env.local`:
```bash
NEXT_PUBLIC_ENVIO_API_URL=https://your-indexer.envio.dev/v1/graphql
```

### Step 3: Verify

1. Start the dashboard: `npm run dev`
2. Check browser console for any Envio-related errors
3. Verify queries are faster (especially for historical data)

## Benefits

- **Performance**: Pre-indexed data is much faster than scanning logs
- **Scalability**: Handles large datasets efficiently
- **Reliability**: Fallback to RPC ensures dashboard always works
- **Cost**: Reduces RPC calls and associated costs

## Monitoring

- Check Envio dashboard for indexer status
- Monitor sync progress and any errors
- Verify events are being indexed correctly

## Troubleshooting

1. **Indexer not syncing**: Check RPC URL and rate limits
2. **Missing events**: Verify `startBlock` in config matches contract deployment
3. **GraphQL errors**: Ensure schema matches generated types
4. **Dashboard fallback**: Check `NEXT_PUBLIC_ENVIO_API_URL` is set correctly

## Next Steps

1. Update `startBlock` in `config.yaml` to the actual bridge deployment block for faster initial sync
2. Consider adding more aggregations (daily/weekly stats)
3. Add error monitoring and alerting
4. Optimize GraphQL queries for specific use cases

