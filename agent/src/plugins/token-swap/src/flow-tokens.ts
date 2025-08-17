/**
 * Dictionary of top tokens on Flow blockchain with their addresses
 */

export type FlowTokenName = "FLOW" | "WFLOW";
export type FlowTokenNameType = FlowTokenName;

export const FLOW_TOKENS: Record<FlowTokenName, string> = {
  // Native FLOW token (wrapped version for EVM)
  FLOW: "0x0000000000000000000000000000000000000000", // Native token address
  
  // Flow USD stablecoin
  WFLOW: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e", // Example address - needs actual deployment

};

/**
 * Function to get token address by name on Flow
 * @param tokenName The name of the token
 * @returns The address of the token or undefined if not found
 */
export function getFlowTokenAddress(tokenName: string): string | undefined {
  const normalizedName = tokenName.toUpperCase() as FlowTokenName;
  return FLOW_TOKENS[normalizedName];
}

/**
 * Function to get token name by address on Flow
 * @param address The address of the token
 * @returns The name of the token or undefined if not found
 */
export function getFlowTokenName(address: string): FlowTokenName | undefined {
  const normalizedAddress = address.toLowerCase();

  for (const [name, tokenAddress] of Object.entries(FLOW_TOKENS)) {
    if (tokenAddress.toLowerCase() === normalizedAddress) {
      return name as FlowTokenName;
    }
  }

  return undefined;
}

/**
 * Get all available Flow tokens
 * @returns Array of token names
 */
export function getAvailableFlowTokens(): FlowTokenName[] {
  return Object.keys(FLOW_TOKENS) as FlowTokenName[];
}

/**
 * Check if a token is supported on Flow
 * @param tokenName The name of the token
 * @returns Whether the token is supported
 */
export function isFlowTokenSupported(tokenName: string): boolean {
  const normalizedName = tokenName.toUpperCase() as FlowTokenName;
  return normalizedName in FLOW_TOKENS;
}