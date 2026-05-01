/**
 * Display names for blockchain networks shown in NOWPayments crypto picker.
 * Falls back to upper-cased network code for any network not listed here.
 */
const NETWORK_NAMES: Record<string, string> = {
  trx: 'Tron (TRC20)',
  eth: 'Ethereum (ERC20)',
  bsc: 'BNB Smart Chain (BEP20)',
  sol: 'Solana',
  matic: 'Polygon',
  btc: 'Bitcoin',
  ltc: 'Litecoin',
  ada: 'Cardano',
  xrp: 'XRP Ledger',
  doge: 'Dogecoin',
  avax: 'Avalanche C-Chain',
  arb: 'Arbitrum One',
  op: 'Optimism',
  base: 'Base',
  ton: 'TON',
  near: 'NEAR',
  algo: 'Algorand',
  xlm: 'Stellar',
  atom: 'Cosmos',
  dot: 'Polkadot',
}

export function getNetworkDisplayName(network: string): string {
  return NETWORK_NAMES[network.toLowerCase()] || network.toUpperCase()
}
