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
import DrawingBoard from '../../components/DrawingBoard';
const A = require('../../blue_modules/analytics');
const bitcoin = require('bitcoinjs-lib');

const ButtonSelected = Object.freeze({
  ONCHAIN: Chain.ONCHAIN,
  OFFCHAIN: Chain.OFFCHAIN,
  VAULT: 'VAULT',
  LDK: 'LDK',
});

const EntropyGenerator = ({ props }) => {
  const color = '#06D6A0';
  const [paths, setPaths] = useState([{ segments: [], color }]);
  const { navigate, goBack } = useNavigation();
  const selectedWalletTypeProps = useRoute().params.selectedWalletType || false;
  const labelProps = useRoute().params.label || '';
  const selectedIndexProps = useRoute().params.selectedIndex || 0;

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
  const { addWallet, saveToDisk, wallets, isTestModeEnabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(selectedIndexProps || 0);
  const [label, setLabel] = useState(labelProps || '');
  const [isTestMode, setIsTestMode] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(selectedWalletTypeProps || false);

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
    isTestModeEnabled()
      .then(setIsTestMode)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // The following function takes a user-provided “randomness” value and XORs it with a PRNG-generated value to improve the randomness of the output.
    const normalizedPoints = normalize(numArr.map((point) => Math.round(point)));
    return generateEntropy(normalizedPoints);
  };

  const createWallet = async () => {
    setIsLoading(true);

    let w;

    if (selectedWalletType === ButtonSelected.ONCHAIN) {
      const entropy = await generateEntropyDrawing();
      const shuffledEntropy = getNRandomElementsFromArray(entropy, 16);
      if (entropy.length < 192) {
        alert('Not enough entropy gathered. Please continue drawing.');
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
        if (selectedIndex === 1) {
          // segwit (p2sh) without Entropy
          await w.generate();
        } else {
          await w.generateMnemonicFromEntropy(shuffledEntropy);
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
    }
  };

  const navigateToImportWallet = () => {
    navigate('ImportWallet');
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
      <DrawingBoard callbackPath={(data) => setPaths(data)} />
      <View style={styles.createButton}>{!isLoading ? <BlueButton testID="entropyCreate" title={loc.wallets.add_create} disabled={paths.length === 0} onPress={createWallet} /> : <ActivityIndicator />}</View>
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
