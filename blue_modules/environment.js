import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import { getSystemName, isTablet, getDeviceType } from 'react-native-device-info';

import { androidLevel } from '../constants';

const isMacCatalina = getSystemName() === 'Mac OS X';
const isDesktop = getDeviceType() === 'Desktop';
const getIsTorCapable = () => {
  let capable = true;
  if (Platform.OS === 'android' && Platform.Version < androidLevel) {
    capable = false;
  } else if (isDesktop) {
    capable = false;
  }
  return capable;
};

const IS_TOR_DAEMON_DISABLED = 'is_tor_daemon_disabled';
export async function setIsTorDaemonDisabled(disabled = true) {
  return AsyncStorage.setItem(IS_TOR_DAEMON_DISABLED, disabled ? '1' : '');
}

export async function isTorDaemonDisabled() {
  let isTorDaemonDisabled;
  try {
    const savedValue = await AsyncStorage.getItem(IS_TOR_DAEMON_DISABLED);
    if (savedValue === null) {
      isTorDaemonDisabled = false;
    } else {
      isTorDaemonDisabled = savedValue;
    }
  } catch {
    isTorDaemonDisabled = true;
  }

  return !!isTorDaemonDisabled;
}

export const isHandset = getDeviceType() === 'Handset';
export const isTorCapable = getIsTorCapable();
export { isMacCatalina, isDesktop, isTablet };

export const windowWidth = Dimensions.get('window').width;
export const windowHeight = Dimensions.get('window').height;
