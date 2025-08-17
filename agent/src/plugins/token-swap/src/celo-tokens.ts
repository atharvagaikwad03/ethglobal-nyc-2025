/**
 * Dictionary of top tokens on Celo mainnet with their addresses
 */

export type CeloTokenName = "CELO" | "cUSD" | "cEUR" | "USDC" | "DAI" | "USDT";
export type RootstockTokenName =
  | "RBTC"
  | "DOC"
  | "RIF"
  | "SOV"
  | "BPRO"
  | "RUSDT";
export type TokenName = CeloTokenName | RootstockTokenName;

export const CELO_TOKENS: Record<CeloTokenName, string> = {
  // Native CELO token
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",

  // Celo Dollar stablecoin
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",

  // Celo Euro stablecoin
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",

  // USDC on Celo
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",

  // DAI on Celo
  DAI: "0xE4fE50cdD716522A56204352f00AA110F731932d",
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
};

/**
 * Dictionary of top tokens on Rootstock with their addresses
 */
export const ROOTSTOCK_TOKENS: Record<RootstockTokenName, string> = {
  // Native RBTC token (Rootstock's native token)
  RBTC: "0x542fDA317318eBF1d3DEAf76E0b632741A7e677d", // Native token

  // Dollar on Chain (DOC) - Rootstock stablecoin
  DOC: "0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db",

  // RIF Token - RSK Infrastructure Framework
  RIF: "0x2aCC95758f8b5F583470bA265Eb685a8f45fC9D5",

  // Sovryn Token
  SOV: "0xEFc78fc7d48b64958315949279Ba181c2114ABBd",

  // BitPRO - Rootstock stability token
  BPRO: "0x440bBd6a888a36DE6e2F6A25f65bc4e16874faa9",

  // RUSDT - Rootstock USDT
  RUSDT: "0xEf213441a85DF4d7acBdAe0Cf78004E1e486BB96",
};

/**
 * Function to get token address by name, checking both Celo and Rootstock tokens
 * @param tokenName The name of the token
 * @param isRootstock Whether to prioritize Rootstock tokens
 * @returns The address of the token or undefined if not found
 */
export function getTokenAddress(
  tokenName: string,
  isRootstock = false
): string | undefined {
  const normalizedName = tokenName.toUpperCase() as TokenName;

  // If isRootstock is true, check Rootstock tokens first
  if (isRootstock) {
    const rootstockAddress =
      ROOTSTOCK_TOKENS[normalizedName as RootstockTokenName];
    if (rootstockAddress) {
      return rootstockAddress;
    }
    // Fall back to Celo tokens if not found in Rootstock
    return CELO_TOKENS[normalizedName as CeloTokenName];
  }

  // Otherwise check Celo tokens first
  const celoAddress = CELO_TOKENS[normalizedName as CeloTokenName];
  if (celoAddress) {
    return celoAddress;
  }
  // Fall back to Rootstock tokens if not found in Celo
  return ROOTSTOCK_TOKENS[normalizedName as RootstockTokenName];
}

/**
 * Function to get token name by address
 * @param address The address of the token
 * @param isRootstock Whether to check Rootstock tokens
 * @returns The name of the token or undefined if not found
 */
export function getTokenName(
  address: string,
  isRootstock = false
): TokenName | undefined {
  const normalizedAddress = address.toLowerCase();

  // Check the appropriate token list based on isRootstock flag
  const tokenList = isRootstock ? ROOTSTOCK_TOKENS : CELO_TOKENS;

  for (const [name, tokenAddress] of Object.entries(tokenList)) {
    if (tokenAddress.toLowerCase() === normalizedAddress) {
      return name as TokenName;
    }
  }

  // If not found and we're checking one chain, try the other
  if (isRootstock) {
    for (const [name, tokenAddress] of Object.entries(CELO_TOKENS)) {
      if (tokenAddress.toLowerCase() === normalizedAddress) {
        return name as CeloTokenName;
      }
    }
  } else {
    for (const [name, tokenAddress] of Object.entries(ROOTSTOCK_TOKENS)) {
      if (tokenAddress.toLowerCase() === normalizedAddress) {
        return name as RootstockTokenName;
      }
    }
  }

  return undefined;
}
