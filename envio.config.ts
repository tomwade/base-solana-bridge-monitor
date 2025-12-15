// Envio indexer configuration for Base-Solana Bridge
// This file defines what events to index from the Base bridge contracts

export default {
  network: {
    chainId: 8453, // Base Mainnet
    name: 'base-mainnet',
  },
  contracts: [
    {
      name: 'Bridge',
      address: '0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188',
      startBlock: 0, // Set to the block when bridge was deployed
    },
    {
      name: 'CrossChainERC20Factory',
      address: '0xDD56781d0509650f8C2981231B6C917f2d5d7dF2',
      startBlock: 0,
    },
  ],
  events: [
    {
      name: 'BridgeToken',
      contract: 'Bridge',
      handlers: ['handleBridgeToken'],
    },
    {
      name: 'RelayMessage',
      contract: 'Bridge',
      handlers: ['handleRelayMessage'],
    },
    {
      name: 'Deploy',
      contract: 'CrossChainERC20Factory',
      handlers: ['handleTokenDeploy'],
    },
  ],
}

