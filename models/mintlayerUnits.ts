export const MintlayerUnit = {
  ML: 'ML',
  TML: 'TML',
  LOCAL_CURRENCY: 'ml_local_currency',
  MAX: 'MAX',
} as const;
export type MintlayerUnit = (typeof MintlayerUnit)[keyof typeof MintlayerUnit];
