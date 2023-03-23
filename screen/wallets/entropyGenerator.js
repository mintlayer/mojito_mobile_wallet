import React, { useState, useEffect, useContext } from 'react';
import { Text, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, View, StatusBar, TextInput, StyleSheet, useColorScheme, Touchable, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueButton, BlueButtonLink } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitP2SHWallet, LightningCustodianWallet, AppStorage, LightningLdkWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme, useNavigation, useRoute } from '@react-navigation/native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Canvas, Path } from '@shopify/react-native-skia';
import { generateEntropy, normalize } from '@mintlayer/entropy-generator';

import { Chain } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
import { type } from '../../theme/Fonts';
import { COLORS } from '../../theme/Colors';
import { getNRandomElementsFromArray } from '../../utils/Array';
const A = require('../../blue_modules/analytics');
const bitcoin = require('bitcoinjs-lib');

const ButtonSelected = Object.freeze({
  ONCHAIN: Chain.ONCHAIN,
  OFFCHAIN: Chain.OFFCHAIN,
  VAULT: 'VAULT',
  LDK: 'LDK',
});

const EntropyGenerator = () => {
  const color = '#06D6A0';
  const [paths, setPaths] = useState([{ segments: [], color }]);
  const { navigate, goBack } = useNavigation();
  const selectedWalletTypeProps = useRoute().params.selectedWalletType || false;
  const labelProps = useRoute().params.label || '';

  const onDrawing = (mode, g) => {
    const newPaths = [...paths];
    // Modes follow syntax of path on SVG: read more here https://css-tricks.com/svg-path-syntax-illustrated-guide/
    newPaths[paths.length - 1].segments.push(`${mode} ${g.x} ${g.y}`);
    setPaths(newPaths);
  };

  const pan = Gesture.Pan()
    .onStart((g) => {
      onDrawing('M', g);
    })
    .onUpdate((g) => {
      onDrawing('L', g);
    })
    .onEnd(() => {
      setPaths([...paths, { segments: [], color }]);
    })
    .minDistance(1);

  const onClearDrawingButtonClick = () => {
    setPaths([{ segments: [], color }]);
  };

  const { colors } = useTheme();
  const { addWallet, saveToDisk, isAdancedModeEnabled, wallets, isTestModeEnabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBaseURI, setWalletBaseURI] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [label, setLabel] = useState(labelProps || '');
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(selectedWalletTypeProps || false);
  const [backdoorPressed, setBackdoorPressed] = useState(1);

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
      .then((url) => setWalletBaseURI(url || (isTestMode ? 'https://tnlndhub.mintlayer.org' : 'https://lndhub.io')))
      .catch(() => setWalletBaseURI(''));
    isTestModeEnabled().then(setIsTestMode);
    isAdancedModeEnabled()
      .then(setIsAdvancedOptionsEnabled)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedOptionsEnabled]);

  const generateEntropyDrawing = async () => {
    const flatArray = paths.flatMap((path) => path.segments);
    const numArr = flatArray.flatMap((str) => {
      // Split the string into parts by spaces
      const parts = str.split(' ');
      // Convert the numerical parts into numbers
      const nums = parts.slice(1).map(parseFloat);
      // Return an array with the first part and the numbers
      return nums;
    });
    const normalizedPoints = normalize(numArr.map((point) => Math.round(point)));
    return generateEntropy(normalizedPoints);
  };

  const createWallet = async () => {
    setIsLoading(true);

    let w;

    if (selectedWalletType === ButtonSelected.OFFCHAIN) {
      createLightningWallet(w);
    } else if (selectedWalletType === ButtonSelected.ONCHAIN) {
      const entropy = await generateEntropyDrawing();
      const shuffledEntropy = getNRandomElementsFromArray(entropy, 16);
      if (entropy.length < 192) {
        alert('Your entropy is too small. Please draw more lines.');
        setIsLoading(false);
        return;
      }
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
        await w.generateMnemonicFromEntropy(shuffledEntropy);
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
      // giving app, not adding anything
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

  const handleOnVaultButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.VAULT);
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
  return (
    <GestureHandlerRootView style={styles.flex1}>
      <View>
        <Text style={[styles.headingText]}>{loc.wallets.entrophy_generator}</Text>
        <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.add_desc_entrophy}</Text>
        <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.add_desc_entrophy2}</Text>
        <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.add_desc_entrophy3}</Text>
        <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.add_desc_entrophy4}</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.entrophyContainer}>
          <Canvas style={styles.flex8} mode="default">
            {paths.map((p, index) => (
              <Path key={index} path={p.segments.join(' ')} strokeWidth={3} style="stroke" color={p.color} />
            ))}
          </Canvas>
          <TouchableOpacity onPress={onClearDrawingButtonClick} style={styles.undoButton}>
            <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.clear}</Text>
          </TouchableOpacity>
        </View>
      </GestureDetector>

      <View style={styles.createButton}>{!isLoading ? <BlueButton testID="Create" title={loc.wallets.add_create} disabled={paths.length === 0} onPress={createWallet} /> : <ActivityIndicator />}</View>
      <View style={styles.importContainer}>{!isLoading && <Text style={[styles.importText]}>{loc.wallets.add_import_wallet}</Text>}</View>
      {!isLoading && <BlueButtonLink testID="ImportWallet" style={styles.clickImportContainer} textStyle={styles.clickImport} title={loc.wallets.click_here} onPress={navigateToImportWallet} />}
    </GestureHandlerRootView>
  );
};

EntropyGenerator.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
    headerTitleWithImage: true,
    headerLeftTitle: loc.wallets.add_title,
  },
  (opts) => ({ ...opts, title: '' }),
);

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  createButton: {
    marginHorizontal: 10,
    marginVertical: 10,
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
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: type.light,
    fontSize: 14,
  },
  headingText: {
    marginHorizontal: 20,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: type.bold,
    fontSize: 14,
    color: COLORS.dark_black,
  },
  importContainer: {
    // flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 10,
    marginHorizontal: 25,
    // paddingBottom: 10,
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
    marginBottom: 10,
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
  entrophyContainer: {
    flex: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    borderWidth: 1,
    borderColor: 'black',
    marginHorizontal: 10,
  },
  flex8: {
    flex: 8,
  },
  undoButton: {
    borderStyle: 'dashed',
    borderRadius: 1,
    borderWidth: 1,
    borderColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});

export default EntropyGenerator;
