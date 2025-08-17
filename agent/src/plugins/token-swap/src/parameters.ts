import { createToolParameters } from "@goat-sdk/core";
import { z } from "zod";

export class SwapTokenParameters extends createToolParameters(
  z.object({
    fromToken: z.string().describe("The token to swap from"),
    amount: z.string().describe("The amount to swap"),
    toToken: z.string().optional().describe("The token to swap to (optional)"),
    walletAddress: z
      .string()
      .describe("The wallet address to use for the swap"),
  })
) {}
