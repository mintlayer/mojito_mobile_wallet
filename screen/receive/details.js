import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, InteractionManager, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import LottieView from 'lottie-react-native';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useNavigation, useRoute, useTheme, useFocusEffect } from '@react-navigation/native';
import Share from 'react-native-share';

import { BlueLoading, BlueCopyTextToClipboard, BlueButton, BlueButtonLink, BlueText, BlueSpacing20, BlueAlertWalletExportReminder, BlueCard, BlueSpacing40 } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import BottomModal from '../../components/BottomModal';
import { Chain, BitcoinUnit } from '../../models/bitcoinUnits';
import HandoffComponent from '../../components/handoff';
import AmountInput from '../../components/AmountInput';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc, { formatBalance } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

import { recieveDescriptionRegex } from '../../constants/index';
const currency = require('../../blue_modules/currency');
const bitcoin = require('bitcoinjs-lib');

const ReceiveDetails = () => {
  const { walletID, address } = useRoute().params;
  const { wallets, saveToDisk, sleep, isElectrumDisabled, fetchAndSaveWalletTransactions, isTestModeEnabled } = useContext(BlueStorageContext);
  const wallet = wallets.find((w) => w.getID() === walletID);
  const [customLabel, setCustomLabel] = useState();
  const [customAmount, setCustomAmount] = useState();
  const [customAmountPreview, setCustomAmountPreview] = useState(0);
  const [customUnit, setCustomUnit] = useState(BitcoinUnit.BTC);
  const [customUnitPreview, setCustomUnitPreview] = useState(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState();
  const [isCustom, setIsCustom] = useState(false);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [showPendingBalance, setShowPendingBalance] = useState(false);
  const [showConfirmedBalance, setShowConfirmedBalance] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const { navigate, goBack, setParams } = useNavigation();
  const { colors } = useTheme();
  const [intervalMs, setIntervalMs] = useState(5000);
  const [eta, setEta] = useState('');
  const [initialConfirmed, setInitialConfirmed] = useState(0);
  const [initialUnconfirmed, setInitialUnconfirmed] = useState(0);
  const [displayBalance, setDisplayBalance] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [descriptionInputValue, setDescriptionInputValue] = useState('');
  const [isDescriptionInputValid, setIsDescriptionInputValid] = useState(false);
  const fetchAddressInterval = useRef();
  const stylesHook = StyleSheet.create({
    modalContent: {
      backgroundColor: colors.modal,
      padding: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopColor: colors.foregroundColor,
      borderWidth: colors.borderWidth,
      minHeight: 350,
      height: 350,
    },
    customAmount: {
      flexDirection: 'row',
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      borderWidth: 1.0,
      borderBottomWidth: 0.5,
      backgroundColor: colors.inputBackgroundColor,
      minHeight: 44,
      height: 44,
      marginHorizontal: 20,
      alignItems: 'center',
      marginVertical: 8,
      borderRadius: 4,
    },
    customAmountText: {
      flex: 1,
      marginHorizontal: 8,
      color: colors.foregroundColor,
      minHeight: 33,
    },
    root: {
      flexGrow: 1,
      backgroundColor: colors.elevated,
      justifyContent: 'space-between',
    },
    rootBackgroundColor: {
      backgroundColor: colors.elevated,
    },
    scrollBody: {
      marginTop: 32,
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    share: {
      justifyContent: 'flex-end',
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 8,
    },
    link: {
      marginVertical: 16,
      paddingHorizontal: 32,
    },
    amount: {
      color: colors.foregroundColor,
      fontWeight: '600',
      fontSize: 36,
      textAlign: 'center',
    },
    label: {
      color: colors.foregroundColor,
      fontWeight: '600',
      textAlign: 'center',
      paddingBottom: 24,
    },
    loading: {
      alignItems: 'center',
      width: 300,
      height: 300,
      backgroundColor: colors.elevated,
    },
    modalButton: {
      backgroundColor: colors.modalButton,
      paddingVertical: 14,
      paddingHorizontal: 70,
      maxWidth: '80%',
      borderRadius: 50,
      fontWeight: '700',
    },
  });

  useEffect(() => {
    isTestModeEnabled().then(setIsTestMode);
  }, [isTestModeEnabled]);

  useEffect(() => {
    if (showConfirmedBalance) {
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    }
  }, [showConfirmedBalance]);

  // re-fetching address balance periodically
  useEffect(() => {
    console.log('receive/defails - useEffect');

    if (fetchAddressInterval.current) {
      // interval already exists, lets cleanup it and recreate, so theres no duplicate intervals
      clearInterval(fetchAddressInterval.current);
      fetchAddressInterval.current = undefined;
    }

    const network = isTestMode ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

    fetchAddressInterval.current = setInterval(async () => {
      try {
        const decoded = DeeplinkSchemaMatch.bip21decode(bip21encoded);
        const address2use = address || decoded.address;
        if (!address2use) return;

        console.log('checking address', address2use, 'for balance...');
        const balance = await BlueElectrum.getBalanceByAddress(address2use, network);
        console.log('...got', balance);

        if (balance.unconfirmed > 0) {
          if (initialConfirmed === 0 && initialUnconfirmed === 0) {
            // saving initial values for later (when tx gets confirmed)
            setInitialConfirmed(balance.confirmed);
            setInitialUnconfirmed(balance.unconfirmed);
            setIntervalMs(25000);
            ReactNativeHapticFeedback.trigger('impactHeavy', { ignoreAndroidSystemSettings: false });
          }

          const txs = await BlueElectrum.getMempoolTransactionsByAddress(address2use);
          const tx = txs.pop();
          if (tx) {
            const rez = await BlueElectrum.multiGetTransactionByTxid([tx.tx_hash], 10, true);
            if (rez && rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
              const satPerVbyte = Math.round(tx.fee / rez[tx.tx_hash].vsize);
              const fees = await BlueElectrum.estimateFees();
              if (satPerVbyte >= fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_10m));
              }
              if (satPerVbyte >= fees.medium && satPerVbyte < fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_3h));
              }
              if (satPerVbyte < fees.medium) {
                setEta(loc.formatString(loc.transactions.eta_1d));
              }
            }
          }

          setDisplayBalance(
            loc.formatString(loc.transactions.pending_with_amount, {
              amt1: formatBalance(balance.unconfirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
              amt2: formatBalance(balance.unconfirmed, BitcoinUnit.BTC, true).toString(),
            }),
          );
          setShowPendingBalance(true);
          setShowAddress(false);
        } else if (balance.unconfirmed === 0 && initialUnconfirmed !== 0) {
          // now, handling a case when unconfirmed == 0, but in past it wasnt (i.e. it changed while user was
          // staring at the screen)

          const balanceToShow = balance.confirmed - initialConfirmed;

          if (balanceToShow > 0) {
            // address has actually more coins then initially, so we definately gained something
            setShowConfirmedBalance(true);
            setShowPendingBalance(false);
            setShowAddress(false);

            clearInterval(fetchAddressInterval.current);
            fetchAddressInterval.current = undefined;

            setDisplayBalance(
              loc.formatString(loc.transactions.received_with_amount, {
                amt1: formatBalance(balanceToShow, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
                amt2: formatBalance(balanceToShow, BitcoinUnit.BTC, true).toString(),
              }),
            );

            fetchAndSaveWalletTransactions(walletID);
          } else {
            // rare case, but probable. transaction evicted from mempool (maybe cancelled by the sender)
            setShowConfirmedBalance(false);
            setShowPendingBalance(false);
            setShowAddress(true);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }, intervalMs);
  }, [bip21encoded, address, initialConfirmed, initialUnconfirmed, intervalMs, fetchAndSaveWalletTransactions, walletID, isTestMode]);

  const renderConfirmedBalance = () => {
    return (
      <ScrollView style={stylesHook.rootBackgroundColors} centerContent keyboardShouldPersistTaps="always">
        <View style={stylesHook.scrollBody}>
          {isCustom && (
            <>
              <BlueText style={stylesHook.label} numberOfLines={1}>
                {customLabel}
              </BlueText>
            </>
          )}
          <LottieView style={styles.icon} source={require('../../img/bluenice.json')} autoPlay loop={false} />
          <BlueText style={stylesHook.label} numberOfLines={1}>
            {displayBalance}
          </BlueText>
        </View>
      </ScrollView>
    );
  };

  const renderPendingBalance = () => {
    return (
      <ScrollView contentContainerStyle={stylesHook.rootBackgroundColor} centerContent keyboardShouldPersistTaps="always">
        <View style={stylesHook.scrollBody}>
          {isCustom && (
            <>
              <BlueText style={stylesHook.label} numberOfLines={1}>
                {customLabel}
              </BlueText>
            </>
          )}
          <TransactionPendingIconBig />
          <BlueSpacing40 />
          <BlueText style={stylesHook.label} numberOfLines={1}>
            {displayBalance}
          </BlueText>
          <BlueText style={stylesHook.label} numberOfLines={1}>
            {eta}
          </BlueText>
        </View>
      </ScrollView>
    );
  };

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      clearInterval(fetchAddressInterval.current);
      fetchAddressInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderReceiveDetails = () => {
    return (
      <ScrollView contentContainerStyle={stylesHook.root} keyboardShouldPersistTaps="always">
        <View style={stylesHook.scrollBody}>
          {isCustom && (
            <>
              {getDisplayAmount() && (
                <BlueText testID="CustomAmountText" style={stylesHook.amount} numberOfLines={1}>
                  {getDisplayAmount()}
                </BlueText>
              )}
              {customLabel?.length > 0 && (
                <BlueText testID="CustomAmountDescriptionText" style={stylesHook.label} numberOfLines={1}>
                  {customLabel}
                </BlueText>
              )}
            </>
          )}

          <QRCodeComponent value={bip21encoded} />
          <BlueCopyTextToClipboard text={isCustom ? bip21encoded : address} />
        </View>
        <View style={stylesHook.share}>
          <BlueCard>
            <BlueButtonLink style={stylesHook.link} testID="SetCustomAmountButton" title={loc.receive.details_setAmount} onPress={showCustomAmountModal} />
            <BlueButton onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </BlueCard>
        </View>
        {renderCustomAmountModal()}
      </ScrollView>
    );
  };

  const obtainWalletAddress = useCallback(async () => {
    console.log('receive/details - componentDidMount');
    wallet.setUserHasSavedExport(true);
    await saveToDisk();
    let newAddress;
    if (address) {
      setAddressBIP21Encoded(address);
      await Notifications.tryToObtainPermissions();
      Notifications.majorTomToGroundControl([address], [], []);
    } else {
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        } catch (_) {}
        if (newAddress === undefined) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
        try {
          await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
          newAddress = wallet.getAddress();
        } catch (_) {}
        if (newAddress === undefined) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          newAddress = wallet.getAddress();
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      }
      setAddressBIP21Encoded(newAddress);
      await Notifications.tryToObtainPermissions();
      Notifications.majorTomToGroundControl([newAddress], [], []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAddressBIP21Encoded = (address) => {
    const bip21encoded = DeeplinkSchemaMatch.bip21encode(address);
    setParams({ address });
    setBip21encoded(bip21encoded);
    setShowAddress(true);
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          if (!wallet.getUserHasSavedExport()) {
            BlueAlertWalletExportReminder({
              onSuccess: obtainWalletAddress,
              onFailure: () => {
                goBack();
                navigate('WalletExportRoot', {
                  screen: 'WalletExport',
                  params: {
                    walletID: wallet.getID(),
                  },
                });
              },
            });
          } else {
            obtainWalletAddress();
          }
        } else if (!wallet && address) {
          setAddressBIP21Encoded(address);
        }
      });
      return () => {
        task.cancel();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]),
  );

  const dismissCustomAmountModal = () => {
    Keyboard.dismiss();
    setCustomAmountPreview('');
    setIsCustomModalVisible(false);
  };

  const showCustomAmountModal = () => {
    setIsCustomModalVisible(true);
    setCustomUnitPreview(customUnit);
    let displayAmount = customAmount;
    switch (customUnit) {
      case BitcoinUnit.BTC:
        displayAmount = customAmount;
        break;
      case BitcoinUnit.SATS:
        displayAmount = currency.btcToSatoshi(customAmount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        displayAmount = currency.BTCToLocalCurrency(customAmount);
        displayAmount = parseFloat(displayAmount.replace(/[^0-9.-]+/g, ''));
        break;
    }

    setCustomAmountPreview(displayAmount);
  };

  const createCustomAmountAddress = () => {
    if (!isDescriptionInputValid) {
      Alert.alert(loc.receive.with_amount_error);
      return;
    }
    setIsCustom(true);
    setIsCustomModalVisible(false);
    let amount = customAmountPreview;
    switch (customUnitPreview) {
      case BitcoinUnit.BTC:
        // nop
        break;
      case BitcoinUnit.SATS:
        amount = currency.satoshiToBTC(customAmountPreview);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          amount = currency.satoshiToBTC(AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]);
        } else {
          amount = currency.fiatToBTC(customAmountPreview);
        }
        break;
    }
    setCustomAmount(amount);
    setCustomUnit(customUnitPreview);
    setCustomUnitPreview(null);
    setCustomAmountPreview(null);
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address, { amount, label: customLabel }));
    setShowAddress(true);
  };

  const renderCustomAmountModal = () => {
    const onDescriptionInputChange = (text) => {
      const isDescriptionInputValid = new RegExp(recieveDescriptionRegex).test(text);
      setDescriptionInputValue(text);
      if (isDescriptionInputValid) {
        setCustomLabel(text);
        setIsDescriptionInputValid(true);
      } else {
        setIsDescriptionInputValid(false);
        console.log('Invalid description value');
      }
    };

    return (
      <BottomModal isVisible={isCustomModalVisible} onClose={dismissCustomAmountModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={stylesHook.modalContent}>
            <AmountInput unit={customUnitPreview} amount={customAmountPreview} onChangeText={setCustomAmountPreview} onAmountUnitChange={setCustomUnitPreview} />
            <View style={stylesHook.customAmount}>
              <TextInput onChangeText={(text) => onDescriptionInputChange(text)} placeholderTextColor="#81868e" placeholder={loc.receive.details_label} value={descriptionInputValue || ''} numberOfLines={1} style={stylesHook.customAmountText} testID="CustomAmountDescription" />
            </View>
            <BlueSpacing20 />
            <View>
              <BlueButton testID="CustomAmountSaveButton" style={stylesHook.modalButton} title={loc.receive.details_create} onPress={createCustomAmountAddress} />
              <BlueSpacing20 />
            </View>
            <BlueSpacing20 />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: bip21encoded }).catch((error) => console.log(error));
  };

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = () => {
    if (Number(customAmount) > 0) {
      return customAmount + ' BTC';
    } else {
      return null;
    }
  };

  return (
    <View style={stylesHook.root}>
      <StatusBar barStyle="light-content" />
      {address !== undefined && showAddress && <HandoffComponent title={loc.send.details_address} type={HandoffComponent.activityTypes.ReceiveOnchain} userInfo={{ address: address }} />}
      {showConfirmedBalance ? renderConfirmedBalance() : null}
      {showPendingBalance ? renderPendingBalance() : null}
      {showAddress ? renderReceiveDetails() : null}
      {!showAddress && !showPendingBalance && !showConfirmedBalance ? <BlueLoading /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  icon: {
    width: 400,
    height: 400,
  },
});

ReceiveDetails.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
  },
  (opts) => ({ ...opts, title: loc.receive.header }),
);

export default ReceiveDetails;
