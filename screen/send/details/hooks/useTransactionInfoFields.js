import { Alert, Text, View } from 'react-native';
import AmountInput from '../../../../components/amount_input/AmountInput';
import { BitcoinUnit } from '../../../../models/bitcoinUnits';
import currency from '../../../../blue_modules/currency';
import InputAccessoryAllFunds from '../../../../components/InputAccessoryAllFunds';
import AddressInput from '../../../../components/AddressInput';
import DeeplinkSchemaMatch from '../../../../class/deeplink-schema-match';
import { BlueDismissKeyboardInputAccessory } from '../../../../BlueComponents';
import loc from '../../../../loc';
import React from 'react';
import BigNumber from 'bignumber.js';
import AmountInputML from '../../../../components/amount_input/AmountInputML';
import { MintlayerUnit } from '../../../../models/mintlayerUnits';

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

export const useTransactionInfoFields = ({ wallet, scrollView, isMintlayerWallet, scrollIndex, isLoading, setIsLoading, addresses, setAddresses, units, setUnits, amountUnit, setAmountUnit, isEditable, transactionMemo, setTransactionMemo, setPayjoinUrl, width, name, isTestMode, stylesHook, styles }) => {
  const renderBitcoinTransactionInfoFields = (params) => {
    const { item, index } = params;
    const itemAmount = item.amount ? item.amount.toString() : 0;
    return (
      <View style={{ width }} testID={'Transaction' + index}>
        <AmountInput
          isLoading={isLoading}
          amount={itemAmount}
          onAmountUnitChange={(unit) => {
            setAddresses((addresses) => {
              const item = addresses[index];

              switch (unit) {
                case BitcoinUnit.SATS:
                  item.amountInCoins = parseInt(item.amount);
                  break;
                case BitcoinUnit.BTC:
                  item.amountInCoins = currency.btcToSatoshi(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  // also accounting for cached fiat->sat conversion to avoid rounding error
                  item.amountInCoins = AmountInput.getCachedSatoshis(item.amount) || currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                  break;
              }

              addresses[index] = item;
              return [...addresses];
            });
            setUnits((units) => {
              units[index] = unit;
              return [...units];
            });
          }}
          onChangeText={(text) => {
            setAddresses((addresses) => {
              item.amount = text;
              switch (units[index] || amountUnit) {
                case BitcoinUnit.BTC:
                  item.amountInCoins = currency.btcToSatoshi(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  item.amountInCoins = currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                  break;
                case BitcoinUnit.SATS:
                default:
                  item.amountInCoins = parseInt(text);
                  break;
              }
              addresses[index] = item;
              return [...addresses];
            });
          }}
          unit={units[index] || amountUnit}
          editable={isEditable}
          disabled={!isEditable}
          inputAccessoryViewID={InputAccessoryAllFunds.InputAccessoryViewID}
        />
        <AddressInput
          onChangeText={(text) => {
            text = text.trim();
            const { address, amount, memo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(text);
            setAddresses((addresses) => {
              item.address = address || text;
              item.amount = amount || item.amount;
              addresses[index] = item;
              return [...addresses];
            });
            setTransactionMemo(memo || transactionMemo);
            setIsLoading(false);
            setPayjoinUrl(payjoinUrl);
          }}
          onBarScanned={processAddressData}
          address={item.address}
          isLoading={isLoading}
          inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          launchedBy={name}
          editable={isEditable}
        />
        {addresses.length > 1 && <Text style={[styles.of, stylesHook.of]}>{loc.formatString(loc._.of, { number: index + 1, total: addresses.length })}</Text>}
      </View>
    );
  };

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  const processAddressData = (data) => {
    const currentIndex = scrollIndex.current;
    setIsLoading(true);
    if (!data.replace) {
      // user probably scanned PSBT and got an object instead of string..?
      setIsLoading(false);
      return Alert.alert(loc.errors.error, loc.send.details_address_field_is_not_valid);
    }

    const dataWithoutSchema = data.replace('bitcoin:', '').replace('BITCOIN:', '');
    if (wallet.isAddressValid(dataWithoutSchema)) {
      setAddresses((addresses) => {
        addresses[scrollIndex.current].address = dataWithoutSchema;
        return [...addresses];
      });
      setIsLoading(false);
      return;
    }

    let address = '';
    let options;
    try {
      if (!data.toLowerCase().startsWith('bitcoin:')) data = `bitcoin:${data}`;
      const decoded = DeeplinkSchemaMatch.bip21decode(data);
      address = decoded.address;
      options = decoded.options;
    } catch (error) {
      data = data.replace(/(amount)=([^&]+)/g, '').replace(/(amount)=([^&]+)&/g, '');
      const decoded = DeeplinkSchemaMatch.bip21decode(data);
      decoded.options.amount = 0;
      address = decoded.address;
      options = decoded.options;
    }

    if (btcAddressRx.test(address) || address.startsWith('bc1') || address.startsWith('BC1')) {
      setAddresses((addresses) => {
        addresses[scrollIndex.current].address = address;
        addresses[scrollIndex.current].amount = options.amount;
        addresses[scrollIndex.current].amountInCoins = new BigNumber(options.amount).multipliedBy(100000000).toNumber();
        return [...addresses];
      });
      setUnits((units) => {
        units[scrollIndex.current] = BitcoinUnit.BTC; // also resetting current unit to BTC
        return [...units];
      });
      setTransactionMemo(options.label || options.message);
      setAmountUnit(BitcoinUnit.BTC);
      setPayjoinUrl(options.pj || '');
      // RN Bug: contentOffset gets reset to 0 when state changes. Remove code once this bug is resolved.
      setTimeout(() => scrollView.current.scrollToIndex({ index: currentIndex, animated: false }), 50);
    }

    setIsLoading(false);
  };

  const renderMintlayerTransactionInfoFields = (params) => {
    const { item, index } = params;
    const itemAmount = item.amount ? item.amount.toString() : 0;
    return (
      <View style={{ width }} testID={'Transaction' + index}>
        <AmountInputML
          isLoading={isLoading}
          amount={itemAmount}
          onAmountUnitChange={(unit) => {
            setAddresses((addresses) => {
              const item = addresses[index];

              switch (unit) {
                case MintlayerUnit.ML:
                case MintlayerUnit.TML:
                  item.amountInCoins = currency.mlToCoins(item.amount);
                  break;
                case MintlayerUnit.LOCAL_CURRENCY:
                  item.amountInCoins = currency.mlToCoins(currency.fiatToML(item.amount));
                  break;
              }

              addresses[index] = item;
              return [...addresses];
            });
            setUnits((units) => {
              units[index] = unit;
              return [...units];
            });
          }}
          onChangeText={(text) => {
            setAddresses((addresses) => {
              item.amount = text;
              switch (units[index] || amountUnit) {
                case MintlayerUnit.ML:
                case MintlayerUnit.TML:
                  item.amountInCoins = currency.mlToCoins(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                default:
                  item.amountInCoins = currency.mlToCoins(currency.fiatToML(item.amount));
                  break;
              }
              addresses[index] = item;
              return [...addresses];
            });
          }}
          unit={units[index] || amountUnit}
          editable={isEditable}
          disabled={!isEditable}
          inputAccessoryViewID={InputAccessoryAllFunds.InputAccessoryViewID}
          isTestMode={isTestMode}
        />
        <AddressInput
          onChangeText={(text) => {
            text = text.trim();
            const { address, amount, memo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(text);
            setAddresses((addresses) => {
              item.address = address || text;
              item.amount = amount || item.amount;
              addresses[index] = item;
              return [...addresses];
            });
            setTransactionMemo(memo || transactionMemo);
            setIsLoading(false);
            setPayjoinUrl(payjoinUrl);
          }}
          onBarScanned={processAddressData}
          address={item.address}
          isLoading={isLoading}
          inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          launchedBy={name}
          editable={isEditable}
        />
        {addresses.length > 1 && <Text style={[styles.of, stylesHook.of]}>{loc.formatString(loc._.of, { number: index + 1, total: addresses.length })}</Text>}
      </View>
    );
  };

  const renderTransactionInfoFields = isMintlayerWallet ? renderMintlayerTransactionInfoFields : renderBitcoinTransactionInfoFields;

  return { renderTransactionInfoFields };
};
