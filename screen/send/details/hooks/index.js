import React, { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useCreateTransaction } from './useCreateTransaction';
import { useHeaderRightOptions } from './useHeaderRightOptions';
import { useRecalcFee } from './useRecalcFee';
import { useTransactionInfoFields } from './useTransactionInfoFields';

const useKeyboard = () => {
  const [walletSelectionOrCoinsSelectedHidden, setWalletSelectionOrCoinsSelectedHidden] = useState(false);
  const [isAmountToolbarVisibleForAndroid, setIsAmountToolbarVisibleForAndroid] = useState(false);

  useEffect(() => {
    const _keyboardDidShow = () => {
      setWalletSelectionOrCoinsSelectedHidden(true);
      setIsAmountToolbarVisibleForAndroid(true);
    };

    const _keyboardDidHide = () => {
      setWalletSelectionOrCoinsSelectedHidden(false);
      setIsAmountToolbarVisibleForAndroid(false);
    };

    Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
    Keyboard.addListener('keyboardDidHide', _keyboardDidHide);
    return () => {
      Keyboard.removeListener('keyboardDidShow', _keyboardDidShow);
      Keyboard.removeListener('keyboardDidHide', _keyboardDidHide);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    walletSelectionOrCoinsSelectedHidden,
    isAmountToolbarVisibleForAndroid,
  };
};

export { useKeyboard, useCreateTransaction, useHeaderRightOptions, useRecalcFee, useTransactionInfoFields };
