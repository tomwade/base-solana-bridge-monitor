# Envio Indexer Setup Guide

For better performance with large datasets, you can set up an Envio indexer to pre-index bridge events.

## Quick Start

1. **Install Envio CLI:**
```bash
npm install -g @envio-dev/cli
```

2. **Initialize Envio project:**
```bash
envio init
```

3. **Configure your indexer** based on `config.yaml`:

The indexer should track:
- `BridgeToken` events from the Bridge contract (Base → Solana)
- `RelayMessage` events from the Bridge contract (Solana → Base)
- `Deploy` events from the CrossChainERC20Factory (for token metadata)

4. **Deploy the indexer:**
```bash
envio build
envio deploy
```

5. **Update your environment variables:**
```bash
NEXT_PUBLIC_ENVIO_API_URL=https://your-envio-instance.com/v1/graphql
```

6. **Update API routes** to use Envio API instead of direct RPC calls when `NEXT_PUBLIC_ENVIO_API_URL` is set.

## Example Envio Handler

```typescript
// handlers/Bridge.ts
import { BridgeToken, RelayMessage } from "../generated";

export function handleBridgeToken(event: BridgeToken) {
  // Store bridge token event
  // This represents Base → Solana transfers
}

export function handleRelayMessage(event: RelayMessage) {
  // Store relay message event
  // This represents Solana → Base transfers
}
```

## Benefits of Using Envio

- **Faster queries**: Pre-indexed data is much faster than scanning logs
- **Better pagination**: Efficient pagination for large datasets
- **Aggregations**: Pre-compute statistics like top tokens
- **Reduced RPC load**: Less strain on your RPC provider

## Migration Path

The current implementation works without Envio, but you can gradually migrate:

1. Start with direct RPC calls (current implementation)
2. Set up Envio for historical data
3. Use Envio for all queries, fallback to RPC if needed
4. Eventually remove RPC fallback once Envio is stable

