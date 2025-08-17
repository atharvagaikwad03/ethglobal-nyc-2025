import {
  Chain,
  PluginBase,
  WalletClientBase,
  createTool,
} from "@goat-sdk/core";
import { z } from "zod";
import { FLOW_TOKENS, getFlowTokenAddress, getFlowTokenName } from "./flow-tokens";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

export class TokenSwapPlugin extends PluginBase<WalletClientBase> {
  private coingeckoApiKey: string | undefined;
  
  constructor() {
    super("tokenSwap", []);
    this.coingeckoApiKey = process.env.COINGECKO_API_KEY;
  }

  // This plugin supports all chains
  supportsChain = (chain: Chain) => true;

  // Define tools directly in the plugin
  getTools(walletClient: WalletClientBase) {
    return [
      createTool(
        {
          name: "swap_tokens",
          description: "Swap FLOW tokens for WFLOW tokens on Flow blockchain",
          parameters: z.object({
            fromToken: z.string().describe("The token to swap from (FLOW or WFLOW)"),
            amount: z.string().describe("The amount to swap"),
            toToken: z.string().describe("The token to swap to (FLOW or WFLOW)"),
            walletAddress: z
              .string()
              .describe("The wallet address to use for the swap"),
            useMainnet: z
              .boolean()
              .optional()
              .describe("Whether to use mainnet (default is testnet)"),
          }),
        },
        async (parameters) => {
          try {
            console.warn(parameters);
            const fromToken = parameters.fromToken.toUpperCase();
            const toToken = parameters.toToken.toUpperCase();
            const useMainnet = parameters.useMainnet || false;

            // Validate Flow tokens only
            if (!["FLOW", "WFLOW"].includes(fromToken) || !["FLOW", "WFLOW"].includes(toToken)) {
              throw new Error("Only FLOW and WFLOW tokens are supported");
            }

            if (fromToken === toToken) {
              throw new Error("Cannot swap same token");
            }

            const privateKey = process.env.WALLET_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
            const account = privateKeyToAccount(privateKey as `0x${string}`);

            console.log("Account:", account);

            // Set the chain and contract address for Flow
            const chain = useMainnet ? flowMainnet : flowTestnet;
            const contractAddress = useMainnet 
              ? "0x[Contract Address TBD]" // Flow Mainnet contract
              : "0x3DDfe46Bb38474D5179bFfE7451aA9268E5098bb"; // Flow Testnet FreeFlowSwap
            const rpcUrl = useMainnet 
              ? "https://mainnet.evm.nodes.onflow.org"
              : "https://testnet.evm.nodes.onflow.org";

            const walletClient = createWalletClient({
              account,
              transport: http(rpcUrl),
              chain,
            });

            // Convert amount to Wei for FLOW (18 decimals)
            const amountFloat = parseFloat(parameters.amount);
            if (isNaN(amountFloat) || amountFloat <= 0) {
              throw new Error("Invalid amount. Must be a positive number.");
            }

            let hash: string;
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const amountInWei = parseEther(parameters.amount);
            
            if (fromToken === "FLOW") {
              // FLOW to WFLOW swap
              hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: [
                  {
                    inputs: [
                      { name: "amountOutMinimum", type: "uint256" },
                      { name: "recipient", type: "address" },
                      { name: "deadline", type: "uint256" }
                    ],
                    name: "swapFLOWToWFLOW",
                    outputs: [{ name: "amountOut", type: "uint256" }],
                    stateMutability: "payable",
                    type: "function"
                  }
                ],
                functionName: "swapFLOWToWFLOW",
                args: [
                  BigInt(0), // amountOutMinimum (no slippage for 1:1 swap)
                  parameters.walletAddress as `0x${string}`,
                  BigInt(deadline)
                ],
                value: amountInWei,
                chain
              });
            } else {
              // WFLOW to FLOW swap
              hash = await walletClient.writeContract({
                address: contractAddress as `0x${string}`,
                abi: [
                  {
                    inputs: [
                      { name: "amountIn", type: "uint256" },
                      { name: "amountOutMinimum", type: "uint256" },
                      { name: "recipient", type: "address" },
                      { name: "deadline", type: "uint256" }
                    ],
                    name: "swapWFLOWToFLOW",
                    outputs: [{ name: "amountOut", type: "uint256" }],
                    stateMutability: "nonpayable",
                    type: "function"
                  }
                ],
                functionName: "swapWFLOWToFLOW",
                args: [
                  amountInWei,
                  BigInt(0), // amountOutMinimum
                  parameters.walletAddress as `0x${string}`,
                  BigInt(deadline)
                ],
                chain
              });
            }
            console.log("Transaction hash:", hash);

            return {
              tokenName: fromToken,
              amount: parameters.amount,
              walletAddress: parameters.walletAddress,
              toToken: toToken,
              transactionHash: hash,
              chain: `Flow ${useMainnet ? 'Mainnet' : 'Testnet'}`,
              network: "Flow EVM",
              success: true
            };
          } catch (error) {
            console.error("Error in swap_tokens:", error);

            // Return a user-friendly error with details
            return {
              success: false,
              error: `Failed to swap tokens: ${
                (error as Error).message || "Unknown error"
              }`,
              details:
                "The token swap transaction could not be completed. Please try again with a larger amount or different token pair.",
            };
          }
        }
      ),
      createTool(
        {
          name: "get_token_price",
          description: "Get the current price of a cryptocurrency token",
          parameters: z.object({
            tokenSymbol: z.string().describe("The token symbol (e.g., BTC, ETH, FLOW)"),
            currency: z.string().optional().default("usd").describe("The currency to get price in (default: usd)"),
          }),
        },
        async (parameters) => {
          try {
            // Map common token names to CoinGecko IDs
            const tokenMap: { [key: string]: string } = {
              "BTC": "bitcoin",
              "BITCOIN": "bitcoin",
              "ETH": "ethereum", 
              "ETHEREUM": "ethereum",
              "FLOW": "flow",
              "USDC": "usd-coin",
              "USDT": "tether",
              "DAI": "dai",
              "WBTC": "wrapped-bitcoin",
              "WETH": "weth",
              "MATIC": "matic-network",
              "POLYGON": "matic-network",
              "AVAX": "avalanche-2",
              "SOL": "solana",
              "ADA": "cardano"
            };
            
            const tokenId = tokenMap[parameters.tokenSymbol.toUpperCase()] || parameters.tokenSymbol.toLowerCase();
            const currency = parameters.currency.toLowerCase();
            
            // CoinGecko API endpoint
            const apiKey = this.coingeckoApiKey ? `&x_cg_demo_api_key=${this.coingeckoApiKey}` : "";
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data[tokenId]) {
              throw new Error(`Price data not found for ${parameters.tokenSymbol}`);
            }
            
            const priceData = data[tokenId];
            const price = priceData[currency];
            const change24h = priceData[`${currency}_24h_change`];
            const marketCap = priceData[`${currency}_market_cap`];
            
            // Format the response for text-to-speech
            const priceFormatted = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency.toUpperCase(),
              minimumFractionDigits: price < 1 ? 4 : 2,
              maximumFractionDigits: price < 1 ? 6 : 2,
            }).format(price);
            
            const changeFormatted = change24h ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : 'N/A';
            
            const speechText = `The current price of ${parameters.tokenSymbol} is ${priceFormatted}, with a 24-hour change of ${changeFormatted}`;
            
            return {
              success: true,
              token: parameters.tokenSymbol.toUpperCase(),
              price: priceFormatted,
              price_raw: price,
              change_24h: changeFormatted,
              market_cap: marketCap ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency.toUpperCase(),
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(marketCap) : 'N/A',
              speech_text: speechText,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error("Error fetching token price:", error);
            return {
              success: false,
              error: `Failed to get price for ${parameters.tokenSymbol}: ${(error as Error).message}`,
              speech_text: `Sorry, I couldn't get the price for ${parameters.tokenSymbol} at this time.`
            };
          }
        }
      ),
    ];
  }
}

// Export a factory function to create a new instance of the plugin
export const tokenSwap = () => new TokenSwapPlugin();
