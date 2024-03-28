import React, { useState, useEffect, useContext } from 'react';
import { Text, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, View, StatusBar, TextInput, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueText, BlueListItem, LightningButton, BitcoinButton, VaultButton, BlueFormLabel, BlueButton, BlueButtonLink, BlueSpacing20, MintLayerButton } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitP2SHWallet, LightningCustodianWallet, AppStorage, LightningLdkWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Chain } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { LdkButton } from '../../components/LdkButton';
import alert from '../../components/Alert';
import { type } from '../../theme/Fonts';
import { COLORS } from '../../theme/Colors';
import { create_wallet } from '../../theme/Images';
import { BtcMlcComponent } from '../../components/BtcMltComponent';
const A = require('../../blue_modules/analytics');
const bitcoin = require('bitcoinjs-lib');

const ButtonSelected = Object.freeze({
  ONCHAIN: Chain.ONCHAIN,
  OFFCHAIN: Chain.OFFCHAIN,
  VAULT: 'VAULT',
  LDK: 'LDK',
  ML: 'ML',
});

const WalletsAdd = () => {
  const { colors } = useTheme();
  const { addWallet, saveToDisk, isAdancedModeEnabled, wallets, isTestModeEnabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBaseURI, setWalletBaseURI] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState('');
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(false);
  const [backdoorPressed, setBackdoorPressed] = useState(1);
  const { navigate, goBack } = useNavigation();
  const [entropy, setEntropy] = useState();
  const [entropyButtonText, setEntropyButtonText] = useState(loc.wallets.add_entropy_provide);
  const stylesHook = {
    advancedText: {
      color: colors.feeText,
    },
    label: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    noPadding: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
      marginBottom: 30,
    },
    lndUri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  };

  useEffect(() => {
    AsyncStorage.getItem(isTestMode ? AppStorage.TEST_LNDHUB : AppStorage.LNDHUB)
      .then((url) => setWalletBaseURI(url || (isTestMode ? 'https://tnlndhub.mintlayer.org' : '')))
      .catch(() => setWalletBaseURI(''));
    isTestModeEnabled().then(setIsTestMode);
    isAdancedModeEnabled()
      .then(setIsAdvancedOptionsEnabled)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedOptionsEnabled]);

  const entropyGenerated = (newEntropy) => {
    let entropyTitle;
    if (!newEntropy) {
      entropyTitle = loc.wallets.add_entropy_provide;
    } else if (newEntropy.length < 32) {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_remain, {
        gen: newEntropy.length,
        rem: 32 - newEntropy.length,
      });
    } else {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_generated, {
        gen: newEntropy.length,
      });
    }
    setEntropy(newEntropy);
    setEntropyButtonText(entropyTitle);
  };

  const createWallet = async () => {
    setIsLoading(true);

    let w;

    if (selectedWalletType === ButtonSelected.OFFCHAIN) {
      createLightningWallet(w);
    } else if (selectedWalletType === ButtonSelected.ONCHAIN) {
      if (selectedIndex === 2) {
        // zero index radio - HD segwit
        w = new HDSegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else if (selectedIndex === 1) {
        // btc was selected
        // index 1 radio - segwit single address
        w = new SegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else {
        // btc was selected
        // index 2 radio - hd bip84
        if (isTestMode) {
          w = new HDSegwitBech32Wallet({ network: bitcoin.networks.testnet });
        } else {
          w = new HDSegwitBech32Wallet();
        }
        w.setLabel(label || loc.wallets.details_title);
      }
      if (selectedWalletType === ButtonSelected.ONCHAIN) {
        if (entropy) {
          try {
            await w.generateFromEntropy(entropy);
          } catch (e) {
            console.log(e.toString());
            alert(e.toString());
            goBack();
            return;
          }
        } else {
          await w.generate();
        }
        addWallet(w);
        await saveToDisk();
        A(A.ENUM.CREATED_WALLET);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        if (w.type === HDSegwitP2SHWallet.type || w.type === HDSegwitBech32Wallet.type) {
          navigate('PleaseBackup', {
            walletID: w.getID(),
          });
        } else {
          goBack();
        }
      }
    } else if (selectedWalletType === ButtonSelected.VAULT) {
      setIsLoading(false);
      navigate('WalletsAddMultisig', { walletLabel: label.trim().length > 0 ? label : loc.multisig.default_label });
    } else if (selectedWalletType === ButtonSelected.LDK) {
      setIsLoading(false);
      createLightningLdkWallet(w);
    }
  };

  const createLightningLdkWallet = async (wallet) => {
    const foundLdk = wallets.find((w) => w.type === LightningLdkWallet.type);
    if (foundLdk) {
      return alert('LDK wallet already exists');
    }
    setIsLoading(true);
    wallet = new LightningLdkWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    await wallet.generate();
    await wallet.init();
    setIsLoading(false);
    addWallet(wallet);
    await saveToDisk();

    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigate('PleaseBackupLdk', {
      walletID: wallet.getID(),
    });
  };

  const createLightningWallet = async (wallet) => {
    wallet = new LightningCustodianWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    try {
      const lndhub = walletBaseURI?.trim();
      if (lndhub) {
        const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
        if (isValidNodeAddress) {
          wallet.setBaseURI(lndhub);
          await wallet.init();
        } else {
          throw new Error('The provided node address is not valid LNDHub node.');
        }
      }
      await wallet.createAccount(isTestMode);
      await wallet.authorize();
    } catch (Err) {
      setIsLoading(false);
      console.warn('lnd create failure', Err);
      return alert(Err.message || Err);
    }
    A(A.ENUM.CREATED_LIGHTNING_WALLET);
    await wallet.generate();
    addWallet(wallet);
    await saveToDisk();

    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigate('PleaseBackupLNDHub', {
      walletID: wallet.getID(),
    });
  };

  const navigateToImportWallet = () => {
    navigate('ImportWallet');
  };

  const handleOnBitcoinButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ONCHAIN);
  };

  const handleOnLightningButtonPressed = () => {
    setBackdoorPressed((prevState) => {
      return prevState + 1;
    });
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.OFFCHAIN);
  };

  const handleOnLdkButtonPressed = async () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.LDK);
  };

  const handleOnMLButtonPressed = async () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ML);
  };

  return (
    <ScrollView style={stylesHook.root}>
      <StatusBar barStyle={Platform.select({ ios: 'light-content', default: useColorScheme() === 'dark' ? 'light-content' : 'dark-content' })} />
      <BlueSpacing20 />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.add_desc}</Text>
        <View style={[styles.label, stylesHook.label]}>
          <TextInput testID="WalletNameInput" value={label} placeholderTextColor="#81868e" placeholder={loc.wallets.add_placeholder} onChangeText={setLabel} style={styles.textInputCommon} editable={!isLoading} underlineColorAndroid="transparent" />
        </View>
        <View style={styles.buttons}>
          {isTestMode ? <BitcoinButton testID="ActivateBitcoinButton" active={selectedWalletType === ButtonSelected.ONCHAIN} onPress={handleOnBitcoinButtonPressed} style={styles.button} testnet /> : <BitcoinButton testID="ActivateBitcoinButton" active={selectedWalletType === ButtonSelected.ONCHAIN} onPress={handleOnBitcoinButtonPressed} style={styles.button} />}
          {/* <BitcoinButton testID="ActivateBitcoinButton" active={selectedWalletType === ButtonSelected.ONCHAIN} onPress={handleOnBitcoinButtonPressed} style={styles.button} /> */}

          <LightningButton active={selectedWalletType === ButtonSelected.OFFCHAIN} onPress={handleOnLightningButtonPressed} style={styles.button} comingSoon={false} />
          {backdoorPressed > 10 ? <LdkButton active={selectedWalletType === ButtonSelected.LDK} onPress={handleOnLdkButtonPressed} style={styles.button} subtext={LightningLdkWallet.getPackageVersion()} text="LDK" /> : null}

          <MintLayerButton testID="ActivateMintlayerButton" active={selectedWalletType === ButtonSelected.ML} onPress={handleOnMLButtonPressed} title="ML" subtitle="Mintlayer" style={styles.button} />
        </View>

        <View style={styles.advanced}>
          {(() => {
            if (selectedWalletType === ButtonSelected.ONCHAIN && isAdvancedOptionsEnabled) {
              return (
                <View>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <BlueListItem containerStyle={[styles.noPadding, stylesHook.noPadding]} bottomDivider={false} onPress={() => setSelectedIndex(0)} title={HDSegwitBech32Wallet.typeReadable} checkmark={selectedIndex === 0} />
                  <BlueListItem containerStyle={[styles.noPadding, stylesHook.noPadding]} bottomDivider={false} onPress={() => setSelectedIndex(1)} title={SegwitP2SHWallet.typeReadable} checkmark={selectedIndex === 1} />
                  <BlueListItem containerStyle={[styles.noPadding, stylesHook.noPadding]} bottomDivider={false} onPress={() => setSelectedIndex(2)} title={HDSegwitP2SHWallet.typeReadable} checkmark={selectedIndex === 2} />
                </View>
              );
            } else if (selectedWalletType === ButtonSelected.OFFCHAIN) {
              return (
                <>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <BlueSpacing20 />
                  <BlueText>{loc.wallets.add_lndhub}</BlueText>
                  <View style={[styles.lndUri, stylesHook.lndUri]}>
                    <TextInput value={walletBaseURI} onChangeText={setWalletBaseURI} onSubmitEditing={Keyboard.dismiss} placeholder={isTestMode ? 'https://tnlndhub.mintlayer.org' : loc.wallets.add_lndhub_placeholder} clearButtonMode="while-editing" autoCapitalize="none" textContentType="URL" autoCorrect={false} placeholderTextColor="#81868e" style={styles.textInputCommon} editable={!isLoading} underlineColorAndroid="transparent" />
                  </View>
                </>
              );
            }
          })()}
          <BlueSpacing20 />
          <View style={styles.createButton}>
            {!isLoading ? (
              <BlueButton
                testID="Create"
                title={selectedIndex == 1 ? loc.multisig.create : loc.send.details_next}
                disabled={!selectedWalletType || label.length === 0 || (selectedWalletType === Chain.OFFCHAIN && (walletBaseURI ?? '').trim().length === 0)}
                onPress={() => {
                  if (selectedIndex == 1) {
                    createWallet();
                  } else {
                    navigate('EntropyGenerator', { selectedWalletType, label, selectedIndex });
                  }
                }}
              />
            ) : (
              <ActivityIndicator />
            )}
          </View>
          <View style={styles.importContainer}>
            {!isLoading && (
              <Text style={[styles.importText]}>
                {loc.wallets.add_import_wallet}
                {!isLoading && <BlueButtonLink testID="ImportWallet" style={styles.clickImportContainer} textStyle={styles.clickImport} title={loc.wallets.click_here} onPress={navigateToImportWallet} />}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

WalletsAdd.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
    headerTitleWithImage: true,
    headerLeftTitle: loc.wallets.add_title,
  },
  (opts) => ({ ...opts, title: '' }),
);

const styles = StyleSheet.create({
  createButton: {
    flex: 1,
  },
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  label: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  textInputCommon: {
    flex: 1,
    marginHorizontal: 8,
    color: '#81868e',
  },
  buttons: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 0,
    minHeight: 100,
  },
  button: {
    width: '100%',
    height: 'auto',
  },
  advanced: {
    marginHorizontal: 20,
  },
  advancedText: {
    fontWeight: '500',
  },
  lndUri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  descText: {
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: type.light,
    fontSize: 14,
  },
  importContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 25,
    paddingBottom: 5,
  },
  import: {
    marginBottom: 0,
    marginTop: 24,
  },
  importText: {
    color: COLORS.black,
    fontFamily: type.light,
    fontSize: 14,
  },
  clickImportContainer: {
    margin: 0,
  },
  clickImport: {
    paddingHorizontal: 10,
    color: COLORS.green_shade,
    fontFamily: type.semiBold,
    fontSize: 14,
    marginBottom: -5,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
  typeMargin: {
    marginTop: 8,
  },
});

export default WalletsAdd;
