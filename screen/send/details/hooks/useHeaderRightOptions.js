import React, { useEffect, useState } from 'react';
import { Alert, Keyboard, LayoutAnimation, Platform, TouchableOpacity } from 'react-native';
import ToolTipMenu from '../../../../components/TooltipMenu.ios';
import { Icon } from 'react-native-elements';
import { BitcoinUnit } from '../../../../models/bitcoinUnits';
import loc from '../../../../loc';
import { HDSegwitBech32Wallet, MultisigHDWallet, WatchOnlyWallet } from '../../../../class';
import * as bitcoin from 'bitcoinjs-lib';
import DocumentPicker from 'react-native-document-picker';
import DeeplinkSchemaMatch from '../../../../class/deeplink-schema-match';
import RNFS from 'react-native-fs';
import fs from '../../../../blue_modules/fs';
import scanqr from '../../../../helpers/scan-qr';
import BigNumber from 'bignumber.js';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { MintLayerWallet } from '../../../../class/wallets/mintlayer-wallet';
import { MintlayerUnit } from '../../../../models/mintlayerUnits';

export const useHeaderRightOptions = ({ name, setIsTransactionReplaceable, setUnits, setUtxo, scrollIndex, scrollView, colors, wallet, isTransactionReplaceable, balance, addresses, isEditable, isLoading, SendDetails, styles, navigation, setIsLoading, setAddresses, transactionMemo, sleep }) => {
  const [optionsVisible, setOptionsVisible] = useState(false);

  useEffect(() => {
    if (wallet && wallet.type !== MintLayerWallet.type) {
      setHeaderRightOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, wallet, isTransactionReplaceable, balance, addresses, isEditable, isLoading]);

  /**
   * same as `importTransaction`, but opens camera instead.
   *
   * @returns {Promise<void>}
   */
  const importQrTransaction = () => {
    if (wallet.type !== WatchOnlyWallet.type) {
      return Alert.alert(loc.errors.error, 'Error: importing transaction in non-watchonly wallet (this should never happen)');
    }

    setOptionsVisible(false);

    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        onBarScanned: importQrTransactionOnBarScanned,
        showFileImportButton: false,
      },
    });
  };

  const importQrTransactionOnBarScanned = (ret) => {
    navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      Alert.alert(loc.errors.error, 'BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?

      // we construct PSBT object and pass to next screen
      // so user can do smth with it:
      const psbt = bitcoin.Psbt.fromBase64(ret.data);
      navigation.navigate('PsbtWithHardwareWallet', {
        memo: transactionMemo,
        fromWallet: wallet,
        psbt,
      });
      setIsLoading(false);
      setOptionsVisible(false);
    }
  };

  /**
   * watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
   * so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
   * user whether he wants to broadcast it.
   * alternatively, user can export psbt file, sign it externally and then import it
   *
   * @returns {Promise<void>}
   */
  const importTransaction = async () => {
    if (wallet.type !== WatchOnlyWallet.type) {
      return Alert.alert(loc.errors.error, 'Importing transaction in non-watchonly wallet (this should never happen)');
    }

    try {
      const res = await DocumentPicker.pick({
        type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn', DocumentPicker.types.plainText, 'public.json'] : [DocumentPicker.types.allFiles],
      });

      if (DeeplinkSchemaMatch.isPossiblySignedPSBTFile(res.uri)) {
        // we assume that transaction is already signed, so all we have to do is get txhex and pass it to next screen
        // so user can broadcast:
        const file = await RNFS.readFile(res.uri, 'ascii');
        const psbt = bitcoin.Psbt.fromBase64(file);
        const txhex = psbt.extractTransaction().toHex();
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, txhex });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      if (DeeplinkSchemaMatch.isPossiblyPSBTFile(res.uri)) {
        // looks like transaction is UNsigned, so we construct PSBT object and pass to next screen
        // so user can do smth with it:
        const file = await RNFS.readFile(res.uri, 'ascii');
        const psbt = bitcoin.Psbt.fromBase64(file);
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, psbt });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      if (DeeplinkSchemaMatch.isTXNFile(res.uri)) {
        // plain text file with txhex ready to broadcast
        const file = (await RNFS.readFile(res.uri, 'ascii')).replace('\n', '').replace('\r', '');
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, txhex: file });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      Alert.alert(loc.errors.error, loc.send.details_unrecognized_file_format);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(loc.errors.error, loc.send.details_no_signed_tx);
      }
    }
  };

  const askCosignThisTransaction = async () => {
    return new Promise((resolve) => {
      Alert.alert(
        '',
        loc.multisig.cosign_this_transaction,
        [
          {
            text: loc._.no,
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: loc._.yes,
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false },
      );
    });
  };

  const _importTransactionMultisig = async (base64arg) => {
    try {
      const base64 = base64arg || (await fs.openSignedTransaction());
      if (!base64) return;
      const psbt = bitcoin.Psbt.fromBase64(base64); // if it doesnt throw - all good, its valid

      if (wallet.howManySignaturesCanWeMake() > 0 && (await askCosignThisTransaction())) {
        hideOptions();
        setIsLoading(true);
        await sleep(100);
        wallet.cosignPsbt(psbt);
        setIsLoading(false);
        await sleep(100);
      }

      navigation.navigate('PsbtMultisig', {
        memo: transactionMemo,
        psbtBase64: psbt.toBase64(),
        walletID: wallet.getID(),
      });
    } catch (error) {
      Alert.alert(loc.send.problem_with_psbt, error.message);
    }
    setIsLoading(false);
    setOptionsVisible(false);
  };

  const importTransactionMultisig = () => {
    return _importTransactionMultisig();
  };

  const onBarScanned = (ret) => {
    navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      Alert.alert(loc.errors.error, 'BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?
      return _importTransactionMultisig(ret.data);
    }
  };

  const importTransactionMultisigScanQr = () => {
    setOptionsVisible(false);
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  const handleAddRecipient = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut, () => scrollView.current.scrollToEnd());
    setAddresses((addresses) => [...addresses, { address: '', key: String(Math.random()) }]);
    setOptionsVisible(false);
    scrollView.current.scrollToEnd();
    if (addresses.length === 0) return;
    await sleep(200); // wait for animation
    scrollView.current.flashScrollIndicators();
  };

  const handleRemoveRecipient = async () => {
    const last = scrollIndex.current === addresses.length - 1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddresses((addresses) => {
      addresses.splice(scrollIndex.current, 1);
      return [...addresses];
    });
    setUnits((units) => {
      units.splice(scrollIndex.current, 1);
      return [...units];
    });
    setOptionsVisible(false);
    if (addresses.length === 0) return;
    await sleep(200); // wait for animation
    scrollView.current.flashScrollIndicators();
    if (last && Platform.OS === 'android') scrollView.current.scrollToEnd(); // fix white screen on android
  };

  const handleCoinControl = () => {
    setOptionsVisible(false);
    navigation.navigate('CoinControl', {
      walletID: wallet.getID(),
      onUTXOChoose: (utxo) => setUtxo(utxo),
    });
  };

  const handlePsbtSign = async () => {
    setIsLoading(true);
    setOptionsVisible(false);
    await new Promise((resolve) => setTimeout(resolve, 100)); // sleep for animations
    const scannedData = await scanqr(navigation.navigate, name);
    if (!scannedData) return setIsLoading(false);

    let tx;
    let psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(scannedData);
      tx = wallet.cosignPsbt(psbt).tx;
    } catch (e) {
      Alert.alert(loc.errors.error, e.message);
      return;
    } finally {
      setIsLoading(false);
    }

    if (!tx) return setIsLoading(false);

    // we need to remove change address from recipients, so that Confirm screen show more accurate info
    const changeAddresses = [];
    for (let c = 0; c < wallet.next_free_change_address_index + wallet.gap_limit; c++) {
      changeAddresses.push(wallet._getInternalAddressByIndex(c));
    }
    const recipients = psbt.txOutputs.filter(({ address }) => !changeAddresses.includes(address));

    navigation.navigate('CreateTransaction', {
      fee: new BigNumber(psbt.getFee()).dividedBy(100000000).toNumber(),
      feeSatoshi: psbt.getFee(),
      wallet,
      tx: tx.toHex(),
      recipients,
      satoshiPerByte: psbt.getFeeRate(),
      showAnimatedQr: true,
      psbt,
    });
  };

  const hideOptions = () => {
    Keyboard.dismiss();
    setOptionsVisible(false);
  };

  // Header Right Button

  const headerRightOnPress = (id) => {
    if (id === SendDetails.actionKeys.AddRecipient) {
      handleAddRecipient();
    } else if (id === SendDetails.actionKeys.RemoveRecipient) {
      handleRemoveRecipient();
    } else if (id === SendDetails.actionKeys.SignPSBT) {
      handlePsbtSign();
    } else if (id === SendDetails.actionKeys.SendMax) {
      onUseAllPressed();
    } else if (id === SendDetails.actionKeys.AllowRBF) {
      onReplaceableFeeSwitchValueChanged(!isTransactionReplaceable);
    } else if (id === SendDetails.actionKeys.ImportTransaction) {
      importTransaction();
    } else if (id === SendDetails.actionKeys.ImportTransactionQR) {
      importQrTransaction();
    } else if (id === SendDetails.actionKeys.ImportTransactionMultsig) {
      importTransactionMultisig();
    } else if (id === SendDetails.actionKeys.CoSignTransaction) {
      importTransactionMultisigScanQr();
    } else if (id === SendDetails.actionKeys.CoinControl) {
      handleCoinControl();
    }
  };

  const onReplaceableFeeSwitchValueChanged = (value) => {
    setIsTransactionReplaceable(value);
  };

  const onUseAllPressed = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning');
    Alert.alert(
      loc.send.details_adv_full,
      loc.send.details_adv_full_sure,
      [
        {
          text: loc._.ok,
          onPress: () => {
            Keyboard.dismiss();
            setAddresses((addresses) => {
              addresses[scrollIndex.current].amount = wallet.type === MintLayerWallet.type ? MintlayerUnit.MAX : BitcoinUnit.MAX;
              addresses[scrollIndex.current].amountInCoins = wallet.type === MintLayerWallet.type ? MintlayerUnit.MAX : BitcoinUnit.MAX;
              return [...addresses];
            });
            setUnits((units) => {
              units[scrollIndex.current] = wallet.type === MintLayerWallet.type ? MintlayerUnit.ML : BitcoinUnit.BTC;
              return [...units];
            });
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOptionsVisible(false);
          },
          style: 'default',
        },
        { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const headerRightActions = () => {
    const actions = [];
    if (isEditable) {
      const isSendMaxUsed = addresses.some((element) => element.amount === BitcoinUnit.MAX);

      actions.push([{ id: SendDetails.actionKeys.SendMax, text: loc.send.details_adv_full, disabled: balance === 0 || isSendMaxUsed }]);
      if (wallet.type === HDSegwitBech32Wallet.type) {
        actions.push([{ id: SendDetails.actionKeys.AllowRBF, text: loc.send.details_adv_fee_bump, menuStateOn: isTransactionReplaceable }]);
      }
      const transactionActions = [];
      if (wallet.type === WatchOnlyWallet.type && wallet.isHd()) {
        transactionActions.push(
          {
            id: SendDetails.actionKeys.ImportTransaction,
            text: loc.send.details_adv_import,
            icon: SendDetails.actionIcons.ImportTransaction,
          },
          {
            id: SendDetails.actionKeys.ImportTransactionQR,
            text: loc.send.details_adv_import_qr,
            icon: SendDetails.actionIcons.ImportTransactionQR,
          },
        );
      }
      if (wallet.type === MultisigHDWallet.type) {
        transactionActions.push({
          id: SendDetails.actionKeys.ImportTransactionMultsig,
          text: loc.send.details_adv_import,
          icon: SendDetails.actionIcons.ImportTransactionMultsig,
        });
      }
      if (wallet.type === MultisigHDWallet.type && wallet.howManySignaturesCanWeMake() > 0) {
        transactionActions.push({
          id: SendDetails.actionKeys.CoSignTransaction,
          text: loc.multisig.co_sign_transaction,
          icon: SendDetails.actionIcons.SignPSBT,
        });
      }
      if (wallet.allowCosignPsbt()) {
        transactionActions.push({ id: SendDetails.actionKeys.SignPSBT, text: loc.send.psbt_sign, icon: SendDetails.actionIcons.SignPSBT });
      }
      actions.push(transactionActions, [
        {
          id: SendDetails.actionKeys.AddRecipient,
          text: loc.send.details_add_rec_add,
          icon: SendDetails.actionIcons.AddRecipient,
        },
        {
          id: SendDetails.actionKeys.RemoveRecipient,
          text: loc.send.details_add_rec_rem,
          disabled: addresses.length < 2,
          icon: SendDetails.actionIcons.RemoveRecipient,
        },
      ]);
    }

    actions.push({ id: SendDetails.actionKeys.CoinControl, text: loc.cc.header, icon: SendDetails.actionIcons.CoinControl });

    return actions;
  };
  const setHeaderRightOptions = () => {
    navigation.setOptions({
      headerRight: Platform.select({
        ios: () => (
          <ToolTipMenu disabled={isLoading} isButton isMenuPrimaryAction onPressMenuItem={headerRightOnPress} actions={headerRightActions()}>
            <Icon size={22} name="kebab-horizontal" type="octicon" color={colors.foregroundColor} style={styles.advancedOptions} />
          </ToolTipMenu>
        ),
        default: () => (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isLoading}
            style={styles.advancedOptions}
            onPress={() => {
              Keyboard.dismiss();
              setOptionsVisible(true);
            }}
            testID="advancedOptionsMenuButton"
          >
            <Icon size={22} name="kebab-horizontal" type="octicon" color={colors.foregroundColor} />
          </TouchableOpacity>
        ),
      }),
    });
  };

  return { optionsVisible, hideOptions, onUseAllPressed, onReplaceableFeeSwitchValueChanged, importTransaction, importQrTransaction, importTransactionMultisig, importTransactionMultisigScanQr, handleAddRecipient, handleRemoveRecipient, handleCoinControl, handlePsbtSign };
};
