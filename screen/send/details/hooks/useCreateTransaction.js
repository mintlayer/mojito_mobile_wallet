import { Alert, Keyboard } from 'react-native';
import loc from '../../../../loc';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BitcoinUnit } from '../../../../models/bitcoinUnits';
import currency from '../../../../blue_modules/currency';
import { HDSegwitBech32Wallet, MultisigHDWallet, WatchOnlyWallet } from '../../../../class';
import BigNumber from 'bignumber.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AbstractHDElectrumWallet } from '../../../../class/wallets/abstract-hd-electrum-wallet';
import { MintLayerWallet } from '../../../../class/wallets/mintlayer-wallet';
import { ML_ATOMS_PER_COIN } from '../../../../blue_modules/Mintlayer';
import { MintlayerUnit } from '../../../../models/mintlayerUnits';

const DUST_THRESHOLD = process.env.DUST_THRESHOLD;

export const useCreateTransaction = ({ wallet, setIsLoading, feeRate, addresses, balance, scrollView, txMetadata, isTransactionReplaceable, transactionMemo, utxo, payjoinUrl, changeAddress, setChangeAddress, saveToDisk, sleep }) => {
  const navigation = useNavigation();
  const { params: routeParams } = useRoute();

  const createBtcTransaction = async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    const requestedSatPerByte = feeRate;
    for (const [index, transaction] of addresses.entries()) {
      let error;
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = loc.send.details_amount_field_is_not_valid;
      } else if (parseFloat(transaction.amountInCoins) <= DUST_THRESHOLD) {
        error = loc.send.details_amount_field_is_less_than_minimum_amount_sat;
      } else if (!requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = loc.send.details_fee_field_is_not_valid;
      } else if (!transaction.address) {
        error = loc.send.details_address_field_is_not_valid;
      } else if (balance - transaction.amountInCoins < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = loc.send.details_total_exceeds_balance;
      } else if (transaction.address) {
        const address = transaction.address.trim().toLowerCase();
        if (address.startsWith('lnb') || address.startsWith('lightning:lnb')) {
          error = loc.send.provided_address_is_invoice;
          console.log('validation error');
        }
      }

      if (!error) {
        if (!wallet.isAddressValid(transaction.address)) {
          console.log('validation error');
          error = loc.send.details_address_field_is_not_valid;
        }
      }

      if (error) {
        scrollView.current.scrollToIndex({ index });
        setIsLoading(false);
        Alert.alert(loc.errors.error, error);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return;
      }
    }

    try {
      await createPsbtTransaction();
    } catch (Err) {
      setIsLoading(false);
      Alert.alert(loc.errors.error, Err.message);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const createPsbtTransaction = async () => {
    const changeAddress = await getChangeAddressAsync();
    const requestedSatPerByte = Number(feeRate);
    const lutxo = utxo || wallet.getUtxo();

    const targets = [];
    for (const transaction of addresses) {
      if (transaction.amount === BitcoinUnit.MAX) {
        // output with MAX
        targets.push({ address: transaction.address });
        continue;
      }
      const value = parseInt(transaction.amountInCoins);
      if (value > 0) {
        targets.push({ address: transaction.address, value });
      } else if (transaction.amount) {
        if (currency.btcToSatoshi(transaction.amount) > 0) {
          targets.push({ address: transaction.address, value: currency.btcToSatoshi(transaction.amount) });
        }
      }
    }

    const { tx, outputs, psbt, fee } = wallet.createTransaction(lutxo, targets, requestedSatPerByte, changeAddress, isTransactionReplaceable ? HDSegwitBech32Wallet.defaultRBFSequence : HDSegwitBech32Wallet.finalRBFSequence);

    if (tx && routeParams.launchedBy && psbt) {
      console.warn('navigating back to ', routeParams.launchedBy);
      navigation.navigate(routeParams.launchedBy, { psbt });
    }

    if (wallet.type === WatchOnlyWallet.type) {
      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it
      navigation.navigate('PsbtWithHardwareWallet', {
        memo: transactionMemo,
        fromWallet: wallet,
        psbt,
        launchedBy: routeParams.launchedBy,
      });
      setIsLoading(false);
      return;
    }

    if (wallet.type === MultisigHDWallet.type) {
      navigation.navigate('PsbtMultisig', {
        memo: transactionMemo,
        psbtBase64: psbt.toBase64(),
        walletID: wallet.getID(),
        launchedBy: routeParams.launchedBy,
      });
      setIsLoading(false);
      return;
    }

    txMetadata[tx.getId()] = {
      txhex: tx.toHex(),
      memo: transactionMemo,
    };
    await saveToDisk();

    let recipients = outputs.filter(({ address }) => address !== changeAddress);

    if (recipients.length === 0) {
      // special case. maybe the only destination in this transaction is our own change address..?
      // (ez can be the case for single-address wallet when doing self-payment for consolidation)
      recipients = outputs;
    }

    navigation.navigate('Confirm', {
      fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
      memo: transactionMemo,
      walletID: wallet.getID(),
      tx: tx.toHex(),
      recipients,
      satoshiPerByte: requestedSatPerByte,
      payjoinUrl,
      psbt,
    });
    setIsLoading(false);
  };

  const getChangeAddressAsync = async () => {
    if (changeAddress) return changeAddress; // cache

    let change;
    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      change = wallet.getAddress();
    } else {
      // otherwise, lets call widely-used getChangeAddressAsync()
      try {
        change = await Promise.race([sleep(2000), wallet.getChangeAddressAsync()]);
      } catch (_) {}

      if (!change) {
        // either sleep expired or getChangeAddressAsync threw an exception
        if (wallet.type === MintLayerWallet.type || wallet instanceof AbstractHDElectrumWallet) {
          change = wallet._getInternalAddressByIndex(wallet.getNextFreeChangeAddressIndex());
        } else {
          // legacy wallets
          change = wallet.getAddress();
        }
      }
    }

    if (change) setChangeAddress(change); // cache

    return change;
  };

  const createMlTransaction = async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    const requestedMlCoinsPerByte = feeRate;
    for (const [index, transaction] of addresses.entries()) {
      let error;
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = loc.send.details_amount_field_is_not_valid;
      } else if (!requestedMlCoinsPerByte || parseFloat(requestedMlCoinsPerByte) < 1) {
        error = loc.send.details_fee_field_is_not_valid;
      } else if (!transaction.address) {
        error = loc.send.details_address_field_is_not_valid;
      } else if (balance - Number(transaction.amount) * ML_ATOMS_PER_COIN < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = loc.send.details_total_exceeds_balance;
      }

      if (!error) {
        if (!wallet.isAddressValid(transaction.address)) {
          console.log('validation error');
          error = loc.send.details_address_field_is_not_valid;
        }
      }

      if (error) {
        scrollView.current.scrollToIndex({ index });
        setIsLoading(false);
        Alert.alert(loc.errors.error, error);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return;
      }
    }

    try {
      const changeAddress = await getChangeAddressAsync();
      const requestedMlCoinsPerByteNum = Number(feeRate);
      const lutxo = utxo || wallet.getUtxo();

      const targets = [];
      for (const transaction of addresses) {
        if (transaction.amount === MintlayerUnit.MAX) {
          // output with MAX
          targets.push({ address: transaction.address, value: balance });
          continue;
        }
        const value = parseInt(transaction.amountInCoins);
        if (value > 0) {
          targets.push({ address: transaction.address, value });
        } else if (transaction.amount) {
          const amount = currency.mlToCoins(transaction.amount);
          if (amount > 0) {
            targets.push({ address: transaction.address, value: amount });
          }
        }
      }

      const { tx, outputs, fee, requireUtxo } = await wallet.createTransaction(lutxo, targets, requestedMlCoinsPerByteNum, changeAddress);

      const recipients = outputs.filter(({ address }) => address !== changeAddress);

      navigation.navigate('Confirm', {
        fee: new BigNumber(fee).dividedBy(ML_ATOMS_PER_COIN).toNumber(),
        memo: transactionMemo,
        walletID: wallet.getID(),
        tx,
        recipients,
        requireUtxo,
      });

      setIsLoading(false);
    } catch (Err) {
      setIsLoading(false);
      Alert.alert(loc.errors.error, Err.message);
      console.error(Err);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const createTransaction = wallet?.type === MintLayerWallet.type ? createMlTransaction : createBtcTransaction;

  return { createTransaction };
};
