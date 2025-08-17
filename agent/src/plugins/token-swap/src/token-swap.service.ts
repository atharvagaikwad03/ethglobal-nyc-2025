import { createTool, WalletClientBase } from "@goat-sdk/core";
import { z } from "zod";
import { getTokenAddress } from "./celo-tokens";

export class TokenSwapService {
  getTools(walletClient: WalletClientBase) {
    return [
      createTool(
        {
          name: "swap_tokens",
          description: "Swap one token for another",
          parameters: z.object({
            fromToken: z.string().describe("The token to swap from"),
            amount: z.string().describe("The amount to swap"),
            toToken: z
              .string()
              .optional()
              .describe("The token to swap to (optional)"),
            walletAddress: z
              .string()
              .describe("The wallet address to use for the swap"),
          }),
        },
        async (parameters) => {
          return {
            tokenName: parameters.fromToken,
            amount: parameters.amount,
            walletAddress: parameters.walletAddress,
            toToken: getTokenAddress(parameters.toToken!),
          };
        }
      ),
    ];
  }
}
