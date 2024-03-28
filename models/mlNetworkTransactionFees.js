import * as Mintlayer from '../blue_modules/Mintlayer';

export const MlNetworkTransactionFeeType = Object.freeze({
  FAST: 'Fast',
  MEDIUM: 'MEDIUM',
  SLOW: 'SLOW',
  CUSTOM: 'CUSTOM',
});

export class MlNetworkTransactionFee {
  static StorageKey = 'MlNetworkTransactionFee';

  constructor(fastestFee = 1, mediumFee = 1, slowFee = 1) {
    this.fastestFee = fastestFee;
    this.mediumFee = mediumFee;
    this.slowFee = slowFee;
  }
}

export default class MlNetworkTransactionFees {
  static async recommendedFees() {
    // eslint-disable-next-line no-async-promise-executor
    try {
      const feeEstimatesResponse = await Mintlayer.getFeesEstimates();
      const feeEstimatesInBytes = JSON.parse(feeEstimatesResponse) / 1000;
      const networkFee = new MlNetworkTransactionFee(feeEstimatesInBytes, feeEstimatesInBytes, feeEstimatesInBytes);

      return networkFee;
    } catch (err) {
      console.error(err);
      const networkFee = new MlNetworkTransactionFee(1, 1, 1);
      return networkFee;
    }
  }
}
