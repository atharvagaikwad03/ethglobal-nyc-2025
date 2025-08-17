import express, { Request, Response, Router } from "express";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, celo } from "viem/chains";

// Define Flow chains
const flowTestnet = {
  id: 545,
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
    public: { http: ['https://testnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'FlowScan', url: 'https://evm-testnet.flowscan.io' },
  },
  testnet: true,
} as const;

const flowMainnet = {
  id: 747,
  name: 'Flow Mainnet',
  network: 'flow-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.evm.nodes.onflow.org'] },
    public: { http: ['https://mainnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'FlowScan', url: 'https://evm.flowscan.io' },
  },
  testnet: false,
} as const;
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { PEPE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { sendETH } from "@goat-sdk/wallet-evm";
import { viem } from "@goat-sdk/wallet-viem";
import { coingecko } from "@goat-sdk/plugin-coingecko";
// Import our custom token swap plugin
import { tokenSwap } from "../plugins/token-swap/src";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router: Router = express.Router();

// Initialize wallet client
const account = privateKeyToAccount(
  process.env.WALLET_PRIVATE_KEY as `0x${string}`
);

const walletClient = createWalletClient({
  account,
  transport: http(process.env.RPC_PROVIDER_URL as string),
  chain: flowTestnet, // Default to Flow testnet
});

interface AgentRequestBody {
  prompt: string;
  isFlow?: boolean;
  useMainnet?: boolean;
}

// Agent route
router.post(
  "/message",
  async (
    req: Request<{}, any, AgentRequestBody>,
    res: Response
  ): Promise<void> => {
    const { prompt, isFlow = true, useMainnet = false } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res
        .status(400)
        .json({ error: "Prompt is required and must be a string" });
      return;
    }

    try {
      // Create wallet client with appropriate chain
      const chain = useMainnet ? flowMainnet : flowTestnet;
      const dynamicWalletClient = createWalletClient({
        account,
        transport: http(process.env.RPC_PROVIDER_URL as string),
        chain,
      });

      // Get on-chain tools
      const tools = await getOnChainTools({
        wallet: viem(dynamicWalletClient),
        plugins: [
          sendETH(),
          erc20({ tokens: [USDC] }), // Start with basic USDC support
          coingecko({
            apiKey: process.env.COINGECKO_API_KEY as string,
          }),
          // Add our token swap plugin
          tokenSwap(),
        ],
      });

      // System message for Flow blockchain
      let systemMessage =
        "You are a DeFi assistant for Free Flow, the NYC-themed metaverse on Flow blockchain! You're quirky and fun, like a New York street-smart trader. No text formatting, just keep it simple plain text. You have special abilities to check cryptocurrency prices and swap tokens on Flow blockchain.";

      if (isFlow) {
        systemMessage +=
          ` You're operating on the Flow ${useMainnet ? 'Mainnet' : 'Testnet'} (Chain ID: ${chain.id}). Available tokens on Flow include: FLOW (native token), FUSD (Flow USD), USDC, and other Flow ecosystem tokens. When helping users, mention that they're in the Free Flow NYC DeFi district where each skyscraper represents a different protocol. Be enthusiastic about the Flow ecosystem and its fast, cheap transactions!`;
      }

      // Enhance prompt with Flow context
      let enhancedPrompt = prompt;
      if (isFlow) {
        enhancedPrompt +=
          ` Context: User is in Free Flow, a NYC-themed DeFi metaverse on Flow blockchain (${useMainnet ? 'Mainnet' : 'Testnet'}). They're interacting from a skyscraper representing a DeFi protocol.`;
      }

      // Generate response from the agent
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        tools,
        maxSteps: 10,
        prompt: enhancedPrompt,
        system: systemMessage,
        onStepFinish: (event) => {
          console.log("Tool Results:", event.toolResults);
        },
      });

      res.json({
        response: result.text,
        toolResults: result.steps?.map((step) => step.toolResults) || [],
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
