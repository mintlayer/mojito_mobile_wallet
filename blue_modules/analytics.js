import { getUniqueId } from 'react-native-device-info';
const BlueApp = require('../BlueApp');

let userHasOptedOut = false;

BlueApp.isDoNotTrackEnabled().then((value) => {
  if (value) userHasOptedOut = true;
});

const A = async (event) => {};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  GOT_ZERO_BALANCE: 'GOT_ZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
  APP_UNSUSPENDED: 'APP_UNSUSPENDED',
  NAVIGATED_TO_WALLETS_HODLHODL: 'NAVIGATED_TO_WALLETS_HODLHODL',
};

A.setOptOut = (value) => {
  if (value) userHasOptedOut = true;
};

A.logError = (errorString) => {
  console.error(errorString);
  // Bugsnag.notify(new Error(String(errorString)));
};

module.exports = A;
