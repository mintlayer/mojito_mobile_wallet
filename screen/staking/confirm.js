import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';

import { BlueButton, BlueText, SafeBlueArea, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Biometric from '../../class/biometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import alert from '../../components/Alert';
import { MintLayerWallet } from '../../class/wallets/mintlayer-wallet';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import { ML_ATOMS_PER_COIN, TransactionType } from '../../blue_modules/Mintlayer';
const currency = require('../../blue_modules/currency');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const Bignumber = require('bignumber.js');

const Confirm = () => {
  const { wallets, fetchAndSaveWalletTransactions, isElectrumDisabled, isTorDisabled, isTestMode } = useContext(BlueStorageContext);
  const [isBiometricUseCapableAndEnabled, setIsBiometricUseCapableAndEnabled] = useState(false);
  const { params } = useRoute();
  const { recipients = [], walletID, fee, memo, tx, satoshiPerByte, psbt, requireUtxo, tokenInfo, action } = params;
  const [isLoading, setIsLoading] = useState(false);
  const wallet = wallets.find((wallet) => wallet.getID() === walletID);
  const isMintlayerWallet = wallet.type === MintLayerWallet.type;
  const formattedFee = new Bignumber(fee).multipliedBy(isMintlayerWallet ? ML_ATOMS_PER_COIN : 100000000).toNumber();
  const { navigate, setOptions } = useNavigation();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    transactionDetailsTitle: {
      color: colors.foregroundColor,
    },
    transactionDetailsSubtitle: {
      color: colors.feeText,
    },
    transactionAmountFiat: {
      color: colors.feeText,
    },
    txDetails: {
      backgroundColor: colors.lightButton,
    },
    valueValue: {
      color: colors.alternativeTextColor2,
    },
    valueUnit: {
      color: colors.buttonTextColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    payjoinWrapper: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  useEffect(() => {
    Biometric.isBiometricUseCapableAndEnabled().then(setIsBiometricUseCapableAndEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMl = async () => {
    setIsLoading(true);
    try {
      const result = await broadcast(tx);
      const txId = JSON.parse(result).tx_id;

      let amount = 0;
      for (const recipient of recipients) {
        amount += recipient.value;
      }

      const atomsPerCoin = Math.pow(10, tokenInfo?.number_of_decimals) || undefined;
      const value = atomsPerCoin ? currency.getAmountInCoins(amount, atomsPerCoin) : amount;

      const unconfirmedTx = {
        sortKey: Date.now(),
        confirmations: 0,
        id: txId,
        token_id: tokenInfo?.token_id,
        hash: txId,
        value,
        fee: { atoms: currency.mlToCoins(Number(fee)), decimal: Number(fee) },
        isUnconfirmedTx: true,
        type: tokenInfo?.token_id ? TransactionType.TokenTransfer : TransactionType.Transfer,
        usedUtxo: requireUtxo,
      };

      wallet.addUnconfirmedTx(unconfirmedTx);

      amount = tokenInfo ? currency.getAmountInCoins(amount, atomsPerCoin) : formatBalanceWithoutSuffix(amount, MintlayerUnit.ML, false);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      navigate('Success', {
        fee: Number(fee),
        amount,
        amountUnit: tokenInfo ? tokenInfo.token_ticker.string : isTestMode ? MintlayerUnit.TML : MintlayerUnit.ML,
        feeUnit: isTestMode ? MintlayerUnit.TML : MintlayerUnit.ML,
        action,
        onDonePressed: () => {
          if (action === 'CreateDelegation') {
            navigate('Stake ML', { walletID });
          }
          if (action === 'addFunds') {
            navigate('Stake ML', { walletID });
          }
          if (action === 'withdrawFunds') {
            navigate('Stake ML', { walletID });
          }
        },
      });

      setIsLoading(false);

      await new Promise((resolve) => setTimeout(resolve, 3000)); // sleep to make sure network propagates
      fetchAndSaveWalletTransactions(walletID);
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', {
        ignoreAndroidSystemSettings: false,
      });
      setIsLoading(false);
      alert(error.message);
    }
  };

  const broadcast = async (tx) => {
    if (isBiometricUseCapableAndEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    const result = await wallet.broadcastTx(tx);
    if (!result) {
      throw new Error(loc.errors.broadcast);
    }

    return result;
  };

  const send = sendMl;
  const feeUnit = isTestMode ? MintlayerUnit.TML : MintlayerUnit.ML;
  const toLocalCurrencyFn = isMintlayerWallet ? currency.mlCoinsToLocalCurrency : currency.satoshiToLocalCurrency;

  const _renderItem = ({ index, item }) => {
    const atomsPerCoin = Math.pow(10, tokenInfo?.number_of_decimals) || undefined;
    const amount = currency.getAmountInCoins(item.value, atomsPerCoin);
    const unit = tokenInfo ? tokenInfo.token_ticker.string : loc.units[feeUnit];

    return (
      <>
        {action === 'CreateDelegation' && (
          <>
            <View style={styles.valueWrap}>
              <Text style={[styles.valueValue, stylesHook.valueValue]}>Create delegation</Text>
            </View>
          </>
        )}

        {action !== 'CreateDelegation' && (
          <>
            <View style={styles.valueWrap}>
              <Text testID="TransactionValue" style={[styles.valueValue, stylesHook.valueValue]}>
                {amount}
              </Text>
              <Text style={[styles.valueUnit, stylesHook.valueValue]}>{' ' + unit}</Text>
            </View>
            <Text style={[styles.transactionAmountFiat, stylesHook.transactionAmountFiat]}>{toLocalCurrencyFn(item.value)}</Text>
          </>
        )}
        <BlueCard>
          <Text style={[styles.transactionDetailsTitle, stylesHook.transactionDetailsTitle]}>{loc.stake.owner_address}</Text>
          <Text testID="TransactionAddress" style={[styles.transactionDetailsSubtitle, stylesHook.transactionDetailsSubtitle]}>
            {item.address}
          </Text>
        </BlueCard>
        {item.poolId && (
          <BlueCard>
            <Text style={[styles.transactionDetailsTitle, stylesHook.transactionDetailsTitle]}>{loc.stake.pool_id}</Text>
            <Text testID="TransactionAddress" style={[styles.transactionDetailsSubtitle, stylesHook.transactionDetailsSubtitle]}>
              {item.poolId}
            </Text>
          </BlueCard>
        )}
        {recipients.length > 1 && <BlueText style={styles.valueOf}>{loc.formatString(loc._.of, { number: index + 1, total: recipients.length })}</BlueText>}
      </>
    );
  };
  _renderItem.propTypes = {
    index: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
  };

  const renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <View style={styles.cardTop}>
        <FlatList scrollEnabled={recipients.length > 1} extraData={recipients} data={recipients} renderItem={_renderItem} keyExtractor={(_item, index) => `${index}`} ItemSeparatorComponent={renderSeparator} />
      </View>
      <View style={styles.cardBottom}>
        <BlueCard>
          <Text style={styles.cardText} testID="TransactionFee">
            {loc.send.create_fee}: {formatBalance(formattedFee, feeUnit)} ({toLocalCurrencyFn(formattedFee)})
          </Text>
          {isLoading ? <ActivityIndicator /> : <BlueButton disabled={isElectrumDisabled} onPress={send} title={loc.send.confirm_sendNow} />}
        </BlueCard>
      </View>
    </SafeBlueArea>
  );
};

export default Confirm;

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  transactionAmountFiat: {
    fontWeight: '500',
    fontSize: 15,
    marginVertical: 8,
    textAlign: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  valueValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  valueUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  valueOf: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  separator: {
    height: 0.5,
    margin: 16,
  },
  root: {
    paddingTop: 19,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexGrow: 8,
    marginTop: 16,
    alignItems: 'center',
    maxHeight: '70%',
  },
  cardBottom: {
    flexGrow: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    flexGrow: 1,
    width: '100%',
  },
  cardText: {
    flexDirection: 'row',
    color: '#37c0a1',
    fontSize: 14,
    marginVertical: 8,
    marginHorizontal: 24,
    paddingBottom: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  txDetails: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 38,
  },
  txText: {
    fontSize: 15,
    fontWeight: '600',
  },
  payjoinWrapper: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payjoinText: {
    color: '#81868e',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

Confirm.navigationOptions = navigationStyle({}, (opts) => ({ ...opts, title: loc.send.confirm_header }));
