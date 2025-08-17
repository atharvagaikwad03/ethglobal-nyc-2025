# Free Flow - ETHGlobal New York 2025

Free Flow transports users to an interactive, 2D multiplayer virtual environment inspired by the iconic New York skyline. This project aims to create a fun, gamified social space where users can explore, interact with each other in real-time, and engage seamlessly with decentralized applications and blockchain functionalities integrated directly into the environment. It bridges the gap between gaming, social platforms, and the decentralized web, offering a novel way to experience DeFi on the Flow blockchain.


## Features

*   **Multiplayer Arena:**
    *   Real-time character movement and synchronization using Socket.io.
    *   See other players' avatars, usernames, and emotes.
    *   Form and join teams with unique room codes.
*   **Interactive 2D World:**
    *   Navigate a themed New York skyscraper environment.
    *   Discover and approach various interactive locations aka DeFi Agents
*   **Engaging User Interactions:**
    *   Intuitive keyboard controls (Arrow keys) for movement.
    *   Contextual interaction prompts when near stalls.
    *   Express yourself with an emote system (X key).
    *   Utilize browser-based Speech Recognition (Spacebar) for voice commands or AI agent interaction.
    *   Receive audio feedback via Text-to-Speech (ElevenLabs).
*   **AI-Powered DeFi Integration:**
    *   GOAT SDK integration for on-chain operations
    *   Conversational AI for natural language blockchain interactions
    *   Custom token swap functionality for Flow ecosystem
    *   Price checking and token transfer capabilities
*   **Audio-Visual Experience:**
    *   Ambient background sound upon entering Free Flow.
    *   Character graphics and NYC skyscraper designs.

## High-Level Architecture

This multiplayer 2D virtual NYC skyscraper environment consists of three main components:

### Frontend (Next.js + TypeScript)
- **Main game arena**: Interactive 2D multiplayer game environment
- **Real-time communication**: Socket.io client for multiplayer synchronization
- **Web3 integration**: Privy for authentication, Wagmi/Viem for blockchain interactions
- **Key components**:
  - Character movement system with keyboard controls
  - Interactive locations (DeFi agents)
  - Team/room system for multiplayer sessions
  - Speech recognition and text-to-speech for AI agent interaction
  - Emote system for player expression

### Backend Services

1. **Socket.io Server** - Real-time multiplayer synchronization
   - Room/team management with unique codes
   - Player position, emote, and username updates

2. **AI Agent Server** - Blockchain operations and AI interaction
   - GOAT SDK integration for on-chain operations
   - Custom token swap plugin for Flow ecosystem
   - OpenAI integration for conversational AI
   - Supports multiple blockchain operations (token swaps, price checks, transfers)

### Smart Contracts
- **FreeFlowDEX.sol**: DEX functionality for Flow blockchain
- Flow Testnet (Chain ID: 545):
  - FreeFlowSwap - https://evm-testnet.flowscan.io/address/0x3DDfe46Bb38474D5179bFfE7451aA9268E5098bb
  - FlowSwapRouter - https://evm-testnet.flowscan.io/address/0x8F90f58F9A67AFf3c1E8803DF843a15d40800FdE

## Technologies Used

*   **Blockchain:** Flow Testnet
*   **Framework:** Next.js, TypeScript, Socket.io
*   **AI:** GOAT SDK, OpenAI, ElevenLabs
*   **Authentication/Wallet:** Privy, Wagmi, Viem
*   **Package Manager:** pnpm
*   **Real-time:** WebSocket-based multiplayer

## Quick Start Guide

### Prerequisites
- Node.js and pnpm installed
- Required environment variables (see Environment Variables section)

### Installation
```bash
# Install dependencies for all services
cd frontend && pnpm install
cd ../backend && npm install
cd ../agent && pnpm install
```

### Environment Variables
Create `.env` files in the `/agent/` directory with:
```env
WALLET_PRIVATE_KEY=your_flow_private_key
RPC_PROVIDER_URL=https://testnet.evm.nodes.onflow.org
COINGECKO_API_KEY=your_coingecko_api_key
OPENAI_API_KEY=your_openai_api_key
PORT=3003
```

### Development Commands

#### Frontend (Next.js)
```bash
cd frontend
pnpm dev          # Run development server (port 3001)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint code
```

#### Backend (Socket.io Server)
```bash
cd backend
npm run dev       # Run development server (port 3002)
npm start         # Start production server
```

#### AI Agent Server
```bash
cd agent
pnpm dev          # Run development server (port 3003)
pnpm build        # Build TypeScript
pnpm start        # Start production server
```

#### Token Swap Plugin
```bash
cd agent/src/plugins/token-swap
pnpm build        # Build plugin
```

### Starting the Application
1. **Start backend**: `cd backend && npm run dev` (port 3002)
2. **Start agent**: `cd agent && pnpm dev` (port 3003)
3. **Start frontend**: `cd frontend && pnpm dev` (port 3001)
4. **Deploy contracts**: Deploy `FreeFlowDEX.sol` to Flow testnet/mainnet
5. **Update contract addresses**: Update plugin with deployed contract addresses

## Key Technical Details

- **Supported Chains**: Flow Testnet (545)
- **Token Support**: FLOW, WFLOW (native and wrapped FLOW)
- **Real-time Features**: WebSocket-based multiplayer with Socket.io
- **AI Integration**: GOAT SDK for blockchain operations, OpenAI for conversation

## Smart Contract Deployment

The project includes `FreeFlowSwap.sol` which provides Swap functionality for the Flow blockchain. Deploy this contract to your chosen network and update the contract addresses in the agent plugin configuration.
