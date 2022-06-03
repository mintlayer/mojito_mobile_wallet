import React, { useEffect } from 'react';
import './shim.js';
import { AppRegistry } from 'react-native';
import App from './App';
import { BlueStorageProvider } from './blue_modules/storage-context';
import SplashScreen from 'react-native-splash-screen';
import { getIntroSliderFlage, setFlage } from './store/asyncStorage.js';

const A = require('./blue_modules/analytics');
if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

const BlueAppComponent = () => {
  useEffect(() => {
    A(A.ENUM.INIT);
    setTimeout(() => {
      SplashScreen.hide();
    }, 5000);

    getIntroSliderFlage(cbSuccess);
  }, []);

  function cbSuccess(val) {
    setFlage(val === null ? false : Boolean(val));
  }

  return (
    <BlueStorageProvider>
      <App />
    </BlueStorageProvider>
  );
};

AppRegistry.registerComponent('BlueWallet', () => BlueAppComponent);
