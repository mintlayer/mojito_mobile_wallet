export const MintlayerUnit = {
  ML: 'ML',
  LOCAL_CURRENCY: 'ml_local_currency',
  MAX: 'MAX',
} as const;
export type BitcoinUnit = (typeof MintlayerUnit)[keyof typeof MintlayerUnit];
