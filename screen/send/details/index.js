import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, I18nManager, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BlueButton, BlueDismissKeyboardInputAccessory, BlueListItem, BlueLoading } from '../../../BlueComponents';
import { navigationStyleTx } from '../../../components/navigationStyle';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../../models/networkTransactionFees';
import { BitcoinUnit, Chain } from '../../../models/bitcoinUnits';
import { HDSegwitBech32Wallet, MultisigHDWallet, WatchOnlyWallet } from '../../../class';
import DeeplinkSchemaMatch from '../../../class/deeplink-schema-match';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../../loc';
import CoinsSelected from '../../../components/CoinsSelected';
import BottomModal from '../../../components/BottomModal';
import InputAccessoryAllFunds from '../../../components/InputAccessoryAllFunds';
import { BlueStorageContext } from '../../../blue_modules/storage-context';
import { MintLayerWallet } from '../../../class/wallets/mintlayer-wallet';
import { getStyles, sendDetailsStyles } from './styles';
import { useKeyboard, useTransactionInfoFields, useCreateTransaction, useHeaderRightOptions, useRecalcFee } from './hooks';
import { MintlayerUnit } from '../../../models/mintlayerUnits';
import MlNetworkTransactionFees, { MlNetworkTransactionFee } from '../../../models/mlNetworkTransactionFees';
const currency = require('../../../blue_modules/currency');
const prompt = require('../../../blue_modules/prompt');

const SendDetails = () => {
  const { wallets, setSelectedWallet, sleep, txMetadata, saveToDisk, isTestMode } = useContext(BlueStorageContext);
  const navigation = useNavigation();
  const { name, params: routeParams } = useRoute();
  const scrollView = useRef();
  const scrollIndex = useRef(0);
  const { colors } = useTheme();

  // state
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [isFeeSelectionModalVisible, setIsFeeSelectionModalVisible] = useState(false);
  const [isTransactionReplaceable, setIsTransactionReplaceable] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [units, setUnits] = useState([BitcoinUnit.BTC]);
  const [transactionMemo, setTransactionMemo] = useState('');
  const [feePrecalc, setFeePrecalc] = useState({ current: null, slowFee: null, mediumFee: null, fastestFee: null });
  const [networkTransactionFees, setNetworkTransactionFees] = useState(new NetworkTransactionFee(3, 2, 1));
  const [networkTransactionFeesIsLoading, setNetworkTransactionFeesIsLoading] = useState(false);
  const [customFee, setCustomFee] = useState(null);
  const [feeUnit, setFeeUnit] = useState();
  const [amountUnit, setAmountUnit] = useState();
  const [utxo, setUtxo] = useState(null);
  const [payjoinUrl, setPayjoinUrl] = useState(null);
  const [changeAddress, setChangeAddress] = useState();
  const [dumb, setDumb] = useState(false);
  const { isEditable = true } = routeParams;
  const isMintlayerWallet = wallet?.type === MintLayerWallet.type;
  const unit = isMintlayerWallet ? (isTestMode ? MintlayerUnit.TML : MintlayerUnit.ML) : BitcoinUnit.BTC;

  // if utxo is limited we use it to calculate available balance
  const balance = utxo ? utxo.reduce((prev, curr) => prev + curr.value, 0) : wallet?.getBalance();
  const allBalance = formatBalanceWithoutSuffix(balance, unit, true);

  // if cutomFee is not set, we need to choose highest possible fee for wallet balance
  // if there are no funds for even Slow option, use 1 sat/vbyte fee
  const feeRate = useMemo(() => {
    if (customFee) return customFee;
    if (feePrecalc.slowFee === null) {
      return '1';
    } // wait for precalculated fees
    let initialFee;
    if (feePrecalc.fastestFee !== null) {
      initialFee = String(networkTransactionFees.fastestFee);
    } else if (feePrecalc.mediumFee !== null) {
      initialFee = String(networkTransactionFees.mediumFee);
    } else {
      initialFee = String(networkTransactionFees.slowFee);
    }
    return initialFee;
  }, [customFee, feePrecalc, networkTransactionFees]);

  useRecalcFee({ wallet, networkTransactionFees, feeRate, utxo, addresses, changeAddress, dumb, feePrecalc, setFeePrecalc, balance });

  const { optionsVisible, hideOptions, handlePsbtSign, onUseAllPressed, importQrTransaction, importTransactionMultisig, importTransactionMultisigScanQr, handleCoinControl, handleRemoveRecipient, handleAddRecipient, importTransaction, onReplaceableFeeSwitchValueChanged } = useHeaderRightOptions({
    name,
    setIsTransactionReplaceable,
    setUnits,
    setUtxo,
    scrollIndex,
    scrollView,
    colors,
    wallet,
    isTransactionReplaceable,
    balance,
    addresses,
    isEditable,
    isLoading,
    SendDetails,
    styles,
    navigation,
    setIsLoading,
    setAddresses,
    transactionMemo,
    sleep,
  });

  const stylesHook = StyleSheet.create(getStyles(colors));
  const { isAmountToolbarVisibleForAndroid, walletSelectionOrCoinsSelectedHidden } = useKeyboard();
  const { createTransaction } = useCreateTransaction({ wallet, setIsLoading, feeRate, addresses, balance, scrollView, txMetadata, isTransactionReplaceable, transactionMemo, utxo, payjoinUrl, changeAddress, setChangeAddress, saveToDisk, sleep });

  useEffect(() => {
    // decode route params
    const currentAddress = addresses[scrollIndex.current];

    if (routeParams.uri) {
      try {
        const { address, amount, memo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(routeParams.uri);
        setUnits((units) => {
          units[scrollIndex.current] = BitcoinUnit.BTC; // also resetting current unit to BTC
          return [...units];
        });

        setAddresses((addresses) => {
          if (currentAddress) {
            currentAddress.address = address;
            if (Number(amount) > 0) {
              currentAddress.amount = amount;
              currentAddress.amountInCoins = currency.btcToSatoshi(amount);
            }
            addresses[scrollIndex.current] = currentAddress;
            return [...addresses];
          } else {
            return [...addresses, { address, amount, amountInCoins: currency.btcToSatoshi(amount), key: String(Math.random()) }];
          }
        });

        if (memo?.trim().length > 0) {
          setTransactionMemo(memo);
        }
        setAmountUnit(BitcoinUnit.BTC);
        setPayjoinUrl(payjoinUrl);
      } catch (error) {
        console.log(error);
        Alert.alert(loc.errors.error, loc.send.details_error_decode);
      }
    } else if (routeParams.address) {
      const { amount, amountSats: amountInCoins, unit = BitcoinUnit.BTC } = routeParams;
      setAddresses((addresses) => {
        if (currentAddress) {
          currentAddress.address = routeParams.address;
          addresses[scrollIndex.current] = currentAddress;
          return [...addresses];
        } else {
          return [...addresses, { address: routeParams.address, key: String(Math.random()), amount, amountInCoins }];
        }
      });
      if (routeParams.memo?.trim().length > 0) {
        setTransactionMemo(routeParams.memo);
      }
      setUnits((units) => {
        units[scrollIndex.current] = unit;
        return [...units];
      });
    } else {
      setAddresses([{ address: '', key: String(Math.random()) }]); // key is for the FlatList
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.uri, routeParams.address]);

  useEffect(() => {
    // check if we have a suitable wallet
    const suitable = wallets.filter((wallet) => wallet.chain === Chain.ONCHAIN && wallet.allowSend());
    if (suitable.length === 0) {
      Alert.alert(loc.errors.error, loc.send.details_wallet_before_tx);
      navigation.goBack();
      return;
    }
    const wallet = (routeParams.walletID && wallets.find((w) => w.getID() === routeParams.walletID)) || suitable[0];
    setWallet(wallet);
    const isMintlayerWallet = wallet.type === MintLayerWallet.type;

    setUnits(isMintlayerWallet ? [MintlayerUnit.ML] : [BitcoinUnit.BTC]);
    setFeeUnit(wallet.getPreferredBalanceUnit());
    setAmountUnit(wallet.preferredBalanceUnit); // default for whole screen

    // we are ready!
    setIsLoading(false);

    const NetworkTransactionFeeClass = isMintlayerWallet ? MlNetworkTransactionFee : NetworkTransactionFee;
    const NetworkTransactionFeesClass = isMintlayerWallet ? MlNetworkTransactionFees : NetworkTransactionFees;

    // load cached fees
    AsyncStorage.getItem(NetworkTransactionFeeClass.StorageKey)
      .then((res) => {
        const fees = JSON.parse(res);
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
      })
      .catch((e) => console.log('loading cached recommendedFees error', e));

    // load fresh fees from servers

    setNetworkTransactionFeesIsLoading(true);
    NetworkTransactionFeesClass.recommendedFees()
      .then(async (fees) => {
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
        await AsyncStorage.setItem(NetworkTransactionFeeClass.StorageKey, JSON.stringify(fees));
      })
      .catch((e) => console.log('loading recommendedFees error', e))
      .finally(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNetworkTransactionFeesIsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // change header and reset state on wallet change
  useEffect(() => {
    if (!wallet) return;
    setSelectedWallet(wallet.getID());
    // reset other values
    setUtxo(null);
    setChangeAddress(null);
    setIsTransactionReplaceable(wallet.type === HDSegwitBech32Wallet.type && !routeParams.noRbf);

    // update wallet UTXO
    wallet
      .fetchUtxo()
      .then(() => {
        // we need to re-calculate fees
        setDumb((v) => !v);
      })
      .catch((e) => console.log('fetchUtxo error', e));
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const onWalletSelect = (wallet) => {
    setWallet(wallet);
    navigation.pop();
  };

  // because of https://github.com/facebook/react-native/issues/21718 we use
  // onScroll for android and onMomentumScrollEnd for iOS
  const handleRecipientsScrollEnds = (e) => {
    if (Platform.OS === 'android') return; // for android we use handleRecipientsScroll
    const contentOffset = e.nativeEvent.contentOffset;
    const viewSize = e.nativeEvent.layoutMeasurement;
    const index = Math.floor(contentOffset.x / viewSize.width);
    scrollIndex.current = index;
  };

  const handleRecipientsScroll = (e) => {
    if (Platform.OS === 'ios') return; // for iOS we use handleRecipientsScrollEnds
    const contentOffset = e.nativeEvent.contentOffset;
    const viewSize = e.nativeEvent.layoutMeasurement;
    const index = Math.floor(contentOffset.x / viewSize.width);
    scrollIndex.current = index;
  };

  const formatFee = (fee) => formatBalance(fee, feeUnit, true);

  const { renderTransactionInfoFields } = useTransactionInfoFields({ wallet, scrollView, isMintlayerWallet, scrollIndex, isLoading, setIsLoading, addresses, setAddresses, units, setUnits, amountUnit, setAmountUnit, isEditable, transactionMemo, setTransactionMemo, setPayjoinUrl, width, name, isTestMode, stylesHook, styles });

  const getFeeRateVByte = (rate) => {
    if (isMintlayerWallet) {
      const calculateFeeFailed = feePrecalc.slowFee === null;
      const finalRate = calculateFeeFailed ? networkTransactionFees.fastestFee : rate;
      return `${formatBalanceWithoutSuffix(finalRate, MintlayerUnit.ML)} ${isTestMode ? loc.units.tml_vbyte : loc.units.ml_vbyte}`;
    }

    return `${rate} ${loc.units.sat_vbyte}`;
  };

  const renderFeeSelectionModal = () => {
    const nf = networkTransactionFees;
    const options = [
      {
        label: loc.send.fee_fast,
        time: loc.send.fee_10m,
        fee: feePrecalc.fastestFee,
        rate: nf.fastestFee,
        active: Number(feeRate) === nf.fastestFee,
      },
      {
        label: loc.send.fee_medium,
        time: loc.send.fee_3h,
        fee: feePrecalc.mediumFee,
        rate: nf.mediumFee,
        active: Number(feeRate) === nf.mediumFee,
        disabled: nf.mediumFee === nf.fastestFee,
      },
      {
        label: loc.send.fee_slow,
        time: loc.send.fee_1d,
        fee: feePrecalc.slowFee,
        rate: nf.slowFee,
        active: Number(feeRate) === nf.slowFee,
        disabled: nf.slowFee === nf.mediumFee || nf.slowFee === nf.fastestFee,
      },
    ];

    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={isFeeSelectionModalVisible} onClose={() => setIsFeeSelectionModalVisible(false)}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            {options.map(({ label, time, fee, rate, active, disabled }, index) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={label}
                disabled={disabled}
                onPress={() => {
                  setFeePrecalc((fp) => ({ ...fp, current: fee }));
                  setIsFeeSelectionModalVisible(false);
                  setCustomFee(rate.toString());
                }}
                style={[styles.feeModalItem, active && styles.feeModalItemActive, active && !disabled && stylesHook.feeModalItemActive]}
              >
                <View style={styles.feeModalRow}>
                  <Text style={[styles.feeModalLabel, disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalLabel]}>{label}</Text>
                  <View style={[styles.feeModalTime, disabled ? stylesHook.feeModalItemDisabled : stylesHook.feeModalTime]}>
                    <Text style={stylesHook.feeModalTimeText}>~{time}</Text>
                  </View>
                </View>
                <View style={styles.feeModalRow}>
                  <Text style={disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalValue}>{fee && formatFee(fee)}</Text>
                  <Text style={disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalValue}>{getFeeRateVByte(rate)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {!isMintlayerWallet && (
              <TouchableOpacity
                testID="feeCustom"
                accessibilityRole="button"
                style={styles.feeModalCustom}
                onPress={async () => {
                  let error = isMintlayerWallet ? loc.send.fee_mlvbyte : loc.send.fee_satvbyte;
                  while (true) {
                    let fee;

                    try {
                      fee = await prompt(loc.send.create_fee, error, true, 'numeric');
                    } catch (_) {
                      return;
                    }

                    if (!/^\d+$/.test(fee)) {
                      error = loc.send.details_fee_field_is_not_valid;
                      continue;
                    }

                    if (fee < 1) fee = '1';
                    fee = Number(fee).toString(); // this will remove leading zeros if any
                    setCustomFee(fee);
                    setIsFeeSelectionModalVisible(false);
                    return;
                  }
                }}
              >
                <Text style={[styles.feeModalCustomText, stylesHook.feeModalCustomText]}>{loc.send.fee_custom}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderOptionsModal = () => {
    if (isMintlayerWallet) {
      return;
    }

    const isSendMaxUsed = addresses.some((element) => element.amount === BitcoinUnit.MAX);

    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={optionsVisible} onClose={hideOptions}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.optionsContent, stylesHook.optionsContent]}>
            {isEditable && <BlueListItem testID="sendMaxButton" disabled={balance === 0 || isSendMaxUsed} title={loc.send.details_adv_full} hideChevron component={TouchableOpacity} onPress={onUseAllPressed} />}
            {wallet.type === HDSegwitBech32Wallet.type && isEditable && <BlueListItem title={loc.send.details_adv_fee_bump} Component={TouchableWithoutFeedback} switch={{ value: isTransactionReplaceable, onValueChange: onReplaceableFeeSwitchValueChanged }} />}
            {wallet.type === WatchOnlyWallet.type && wallet.isHd() && <BlueListItem title={loc.send.details_adv_import} hideChevron component={TouchableOpacity} onPress={importTransaction} />}
            {wallet.type === WatchOnlyWallet.type && wallet.isHd() && <BlueListItem testID="ImportQrTransactionButton" title={loc.send.details_adv_import_qr} hideChevron component={TouchableOpacity} onPress={importQrTransaction} />}
            {wallet.type === MultisigHDWallet.type && isEditable && <BlueListItem title={loc.send.details_adv_import} hideChevron component={TouchableOpacity} onPress={importTransactionMultisig} />}
            {wallet.type === MultisigHDWallet.type && wallet.howManySignaturesCanWeMake() > 0 && isEditable && <BlueListItem title={loc.multisig.co_sign_transaction} hideChevron component={TouchableOpacity} onPress={importTransactionMultisigScanQr} />}
            {isEditable && (
              <>
                <BlueListItem testID="AddRecipient" title={loc.send.details_add_rec_add} hideChevron component={TouchableOpacity} onPress={handleAddRecipient} />
                <BlueListItem testID="RemoveRecipient" title={loc.send.details_add_rec_rem} hideChevron disabled={addresses.length < 2} component={TouchableOpacity} onPress={handleRemoveRecipient} />
              </>
            )}
            <BlueListItem testID="CoinControl" title={loc.cc.header} hideChevron component={TouchableOpacity} onPress={handleCoinControl} />
            {wallet.allowCosignPsbt() && isEditable && <BlueListItem testID="PsbtSign" title={loc.send.psbt_sign} hideChevron component={TouchableOpacity} onPress={handlePsbtSign} />}
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderCreateButton = () => {
    return <View style={styles.createButton}>{isLoading ? <ActivityIndicator /> : <BlueButton onPress={createTransaction} title={loc.send.details_next} testID="CreateTransactionButton" />}</View>;
  };

  const renderWalletSelectionOrCoinsSelected = () => {
    if (walletSelectionOrCoinsSelectedHidden) return null;
    if (utxo !== null) {
      return (
        <View style={styles.select}>
          <CoinsSelected
            number={utxo.length}
            onContainerPress={handleCoinControl}
            onClose={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setUtxo(null);
            }}
          />
        </View>
      );
    }

    const availableWallets =
      wallets.filter((item) => {
        const isMintlayerItem = item.type === MintLayerWallet.type;
        const isAvailableWallet = isMintlayerWallet ? isMintlayerItem : !isMintlayerItem;
        return item.allowSend() && isAvailableWallet;
      }) || [];

    return (
      <View style={styles.select}>
        {!isLoading && isEditable && (
          <TouchableOpacity accessibilityRole="button" style={styles.selectTouch} onPress={() => navigation.navigate('SelectWallet', { onWalletSelect, availableWallets })}>
            <Text style={styles.selectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWrap}>
          <TouchableOpacity accessibilityRole="button" style={styles.selectTouch} onPress={() => navigation.navigate('SelectWallet', { onWalletSelect, availableWallets })} disabled={!isEditable || isLoading}>
            <Text style={[styles.selectLabel, stylesHook.selectLabel]}>{wallet.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading || !wallet) {
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, stylesHook.root]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <StatusBar barStyle="light-content" />
        <View>
          <KeyboardAvoidingView enabled={!Platform.isPad} behavior="position">
            <FlatList scrollEnabled={addresses.length > 1} data={addresses} renderItem={renderTransactionInfoFields} ref={scrollView} horizontal pagingEnabled removeClippedSubviews={false} onMomentumScrollBegin={Keyboard.dismiss} onMomentumScrollEnd={handleRecipientsScrollEnds} onScroll={handleRecipientsScroll} scrollEventThrottle={200} scrollIndicatorInsets={styles.scrollViewIndicator} contentContainerStyle={styles.scrollViewContent} />
            {!isMintlayerWallet && (
              <View style={[styles.memo, stylesHook.memo]}>
                <TextInput onChangeText={setTransactionMemo} placeholder={loc.send.details_note_placeholder} placeholderTextColor="#81868e" value={transactionMemo} numberOfLines={1} style={styles.memoText} editable={!isLoading} onSubmitEditing={Keyboard.dismiss} inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID} />
              </View>
            )}
            <TouchableOpacity testID="chooseFee" accessibilityRole="button" onPress={() => setIsFeeSelectionModalVisible(true)} disabled={isLoading} style={styles.fee}>
              <Text style={[styles.feeLabel, stylesHook.feeLabel]}>{loc.send.create_fee}</Text>

              {networkTransactionFeesIsLoading ? (
                <ActivityIndicator />
              ) : (
                <View style={[styles.feeRow, stylesHook.feeRow]}>
                  <Text style={stylesHook.feeValue}>{feePrecalc.current ? formatFee(feePrecalc.current) : getFeeRateVByte(feeRate)}</Text>
                </View>
              )}
            </TouchableOpacity>
            {renderCreateButton()}
            {renderFeeSelectionModal()}
            {renderOptionsModal()}
          </KeyboardAvoidingView>
        </View>
        <BlueDismissKeyboardInputAccessory />
        {Platform.select({
          ios: <InputAccessoryAllFunds canUseAll={balance > 0} onUseAllPressed={onUseAllPressed} balance={allBalance} unit={unit} />,
          android: isAmountToolbarVisibleForAndroid && <InputAccessoryAllFunds canUseAll={balance > 0} onUseAllPressed={onUseAllPressed} balance={allBalance} unit={unit} />,
        })}

        {renderWalletSelectionOrCoinsSelected()}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SendDetails;

SendDetails.actionKeys = {
  SignPSBT: 'SignPSBT',
  SendMax: 'SendMax',
  AddRecipient: 'AddRecipient',
  RemoveRecipient: 'RemoveRecipient',
  AllowRBF: 'AllowRBF',
  ImportTransaction: 'ImportTransaction',
  ImportTransactionMultsig: 'ImportTransactionMultisig',
  ImportTransactionQR: 'ImportTransactionQR',
  CoinControl: 'CoinControl',
  CoSignTransaction: 'CoSignTransaction',
};

SendDetails.actionIcons = {
  SignPSBT: { iconType: 'SYSTEM', iconValue: 'signature' },
  SendMax: 'SendMax',
  AddRecipient: { iconType: 'SYSTEM', iconValue: 'person.badge.plus' },
  RemoveRecipient: { iconType: 'SYSTEM', iconValue: 'person.badge.minus' },
  AllowRBF: 'AllowRBF',
  ImportTransaction: { iconType: 'SYSTEM', iconValue: 'square.and.arrow.down' },
  ImportTransactionMultsig: { iconType: 'SYSTEM', iconValue: 'square.and.arrow.down.on.square' },
  ImportTransactionQR: { iconType: 'SYSTEM', iconValue: 'qrcode.viewfinder' },
  CoinControl: { iconType: 'SYSTEM', iconValue: 'switch.2' },
};

const styles = StyleSheet.create(sendDetailsStyles);

SendDetails.navigationOptions = navigationStyleTx({}, (options) => ({
  ...options,
  title: loc.send.header,
}));
