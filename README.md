# Base-Solana Bridge Dashboard

A real-time dashboard for monitoring tokens bridged between Base and Solana networks.

## Features

- **Latest Bridge Activity**: View the most recent bridge transactions in both directions (Solana → Base and Base → Solana)
- **Top Bridged Tokens**: See the top 10 tokens by total bridged volume in each direction
- **All Tokens Page**: Browse all bridge transactions with sorting by time (ASC/DESC) and amount (DESC)
- **Live Updates**: Automatic data refresh every 10 seconds with smooth insertion of new transactions
- **Modern UI**: Built with Tailwind CSS and Inter font

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) Envio CLI for indexer setup

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file (optional, defaults are provided):
```bash
# Base RPC URL (required for fallback)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# Envio API URL (optional, enables faster queries)
NEXT_PUBLIC_ENVIO_API_URL=http://localhost:8080/v1/graphql

# Contract addresses (optional, defaults provided)
NEXT_PUBLIC_BRIDGE_CONTRACT=0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188
NEXT_PUBLIC_BRIDGE_VALIDATOR=0xAF24c1c24Ff3BF1e6D882518120fC25442d6794B
NEXT_PUBLIC_TOKEN_FACTORY=0xDD56781d0509650f8C2981231B6C917f2d5d7dF2
NEXT_PUBLIC_SOL_TOKEN=0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting Up Envio Indexer (Recommended)

For better performance, especially with large datasets, set up the Envio indexer:

1. Navigate to the Envio directory:
```bash
cd envio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
BASE_RPC_URL=https://mainnet.base.org
```

4. Generate code and build:
```bash
npm run codegen
npm run build
```

5. Deploy the indexer:
```bash
npm run deploy
```

6. After deployment, add the GraphQL endpoint URL to your dashboard's `.env.local`:
```bash
# For local development:
NEXT_PUBLIC_ENVIO_API_URL=http://localhost:8080/v1/graphql

# For deployed instance:
NEXT_PUBLIC_ENVIO_API_URL=https://your-deployed-envio-instance.com/v1/graphql
```

The dashboard will automatically use Envio when `NEXT_PUBLIC_ENVIO_API_URL` is set, falling back to direct RPC calls if Envio is unavailable.

See `envio/README.md` for detailed Envio setup instructions.

## Project Structure

```
dashboard/
├── app/
│   ├── api/
│   │   └── bridge/
│   │       ├── latest/route.ts    # Latest bridge transactions
│   │       ├── top/route.ts       # Top bridged tokens by volume
│   │       └── all/route.ts      # All bridge transactions with pagination
│   ├── tokens/
│   │   └── page.tsx              # All tokens listing page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Dashboard homepage
│   └── providers.tsx             # React Query provider
├── components/
│   ├── BridgeCard.tsx           # Individual bridge transaction card
│   ├── LatestBridged.tsx        # Latest bridge transactions component
│   ├── Navbar.tsx               # Navigation bar
│   └── TopBridged.tsx           # Top bridged tokens component
├── lib/
│   └── contracts.ts             # Contract ABIs and addresses
├── types/
│   └── bridge.ts                # TypeScript types
└── envio/
    └── config.yaml              # Envio indexer configuration (optional)
```

## API Routes

### `/api/bridge/latest`
Get the latest bridge transactions.

Query parameters:
- `limit` (optional): Number of results (default: 10)
- `direction` (optional): `solana-to-base` or `base-to-solana`

### `/api/bridge/top`
Get top bridged tokens by volume.

Query parameters:
- `limit` (optional): Number of results (default: 10)
- `direction` (optional): `solana-to-base` or `base-to-solana`

### `/api/bridge/all`
Get all bridge transactions with pagination and sorting.

Query parameters:
- `sortBy` (optional): `timestamp` or `marketCap` (default: `timestamp`)
- `order` (optional): `asc` or `desc` (default: `desc`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

## Architecture

The dashboard supports two data sources:

1. **Envio Indexer** (Recommended): Pre-indexed events for fast queries
2. **Direct RPC** (Fallback): Direct blockchain queries via viem

The dashboard automatically uses Envio if `NEXT_PUBLIC_ENVIO_API_URL` is configured, falling back to RPC if Envio is unavailable.

## Contract Addresses

### Base Mainnet
- Bridge: `0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188`
- Bridge Validator: `0xAF24c1c24Ff3BF1e6D882518120fC25442d6794B`
- CrossChainERC20Factory: `0xDD56781d0509650f8C2981231B6C917f2d5d7dF2`
- SOL Token: `0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82`

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Viem**: Ethereum/BASE blockchain interaction
- **React Query**: Data fetching and caching
- **date-fns**: Date formatting

## License

MIT

