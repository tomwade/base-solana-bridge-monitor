// Base Bridge Contract ABIs and addresses
export const BRIDGE_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'messageHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'localToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'remoteToken',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'to',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'BridgeToken',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'messageHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'localToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'remoteToken',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'to',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'RelayMessage',
    type: 'event',
  },
] as const

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const

// Contract addresses (Base Mainnet)
export const CONTRACTS = {
  BRIDGE: process.env.NEXT_PUBLIC_BRIDGE_CONTRACT || '0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188',
  BRIDGE_VALIDATOR: process.env.NEXT_PUBLIC_BRIDGE_VALIDATOR || '0xAF24c1c24Ff3BF1e6D882518120fC25442d6794B',
  TOKEN_FACTORY: process.env.NEXT_PUBLIC_TOKEN_FACTORY || '0xDD56781d0509650f8C2981231B6C917f2d5d7dF2',
  SOL_TOKEN: process.env.NEXT_PUBLIC_SOL_TOKEN || '0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82',
} as const

