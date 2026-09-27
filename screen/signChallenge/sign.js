import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { navigationStyleTx } from '../../components/navigationStyle';
import loc from '../../loc';
import { signChallenge } from '../../blue_modules/mintlayer/mintlayer';
import { Button } from 'react-native-elements';
import { BlueButton } from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const uint8ArrayToString = (uint8Array) => {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return Buffer.from(binaryString, 'binary').toString('base64');
};

const stringToBytes = (string) => {
  const bytes = [];
  for (let i = 0; i < string.length; i++) {
    const codePoint = string.charCodeAt(i);

    if (codePoint < 0x80) {
      // 1-byte character
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      // 2-byte character
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      // 3-byte character
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      // 4-byte character (rare in common strings)
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return new Uint8Array(bytes);
};

const SignChallenge = ({ route, navigation }) => {
  // get params
  const { wallets, saveToDisk, isTestMode, walletsInitialized } = useContext(BlueStorageContext);
  const [selectedWallet, setSelectedWallet] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState('');
  const { challengeBase64, callback, address } = route.params;
  const [signature, setSignature] = useState('');
  const [challegneShowMode, setChallengeShowMode] = useState('base64');

  const mlWallets = wallets.filter((w) => w.type === 'ML_HDsegwitBech32') || [];

  const challengeDecoded = Buffer.from(challengeBase64, 'base64').toString('utf-8');

  useEffect(() => {
    handleSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeBase64, address]);

  const wallet = mlWallets[selectedWallet];

  const handleSign = async () => {
    const challengeText = Buffer.from(challengeBase64, 'base64').toString();
    const signChallenge = await wallet.signChallenge(stringToBytes(challengeText), selectedAddress);
    const str = uint8ArrayToString(signChallenge.signature);
    setSignature(str);
  };

  const handleSubmit = () => {
    if (callback.includes('t.me') && callback.endsWith('startapp=')) {
      const link = decodeURIComponent(callback) + Buffer.from(JSON.stringify({ signature, address: selectedAddress, challengeBase64 })).toString('base64');
      Linking.openURL(link);
    } else {
      const concat = callback.includes('?') ? '&' : '?';
      const link = decodeURIComponent(callback) + concat + 'signature=' + signature + '&address=' + selectedAddress + '&challengeBase64=' + challengeBase64;
      Linking.openURL(link);
    }
  };

  useEffect(() => {
    const updateAddress = async () => {
      const address = await getAddress();
      setSelectedAddress(address);
    };
    updateAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet]);

  useEffect(() => {
    if (walletsInitialized && selectedAddress) {
      handleSign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, walletsInitialized]);

  const getAddress = async () => {
    const address = await mlWallets[selectedWallet].getAddressAsync();
    return address;
  };

  const handleBackToMain = () => {
    navigation.navigate('WalletsList');
  };

  if (walletsInitialized && mlWallets.length === 0) {
    return (
      <View style={styles.container}>
        <View>
          <View style={styles.heading}>
            <Text style={styles.headingText}>Sign challenge</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.infoText}>Challenge is a message that needs to be signed by the user. The signed message is then sent to the callback. It is used to verify the user's identity.</Text>
          </View>
        </View>
        <Text>No wallets found. First you have to create Mintlayer wallet</Text>
        <View style={styles.buttons}>
          <BlueButton title="Go to main screen" onPress={handleBackToMain} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View>
          <View style={styles.heading}>
            <Text style={styles.headingText}>Sign challenge</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.infoText}>Challenge is a message that needs to be signed by the user. The signed message is then sent to the callback. It is used to verify the user's identity.</Text>
          </View>
          <View style={styles.previewBlocks}>
            {address ? (
              <View style={styles.item}>
                <View style={styles.label}>
                  <Text style={styles.labelText}>Address:</Text>
                </View>
                <View style={styles.value}>
                  <Text style={styles.valueText}>{address}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.item}>
                <View style={styles.label}>
                  <Text style={styles.labelText}>Address:</Text>
                </View>
                <View style={styles.value}>
                  <Text style={styles.valueText}>{selectedAddress}</Text>
                </View>
              </View>
            )}
            <View style={styles.item}>
              <View style={styles.label}>
                <Text style={styles.labelText}>Message</Text>
              </View>
              <View style={styles.value}>
                <Text style={styles.valueText}>{challengeDecoded}</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={styles.label}>
                <Text style={styles.labelText}>Callback</Text>
              </View>
              <View style={styles.value}>
                <Text style={styles.valueText}>{callback}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <BlueButton title="Submit" onPress={handleSubmit} />
      </View>
    </View>
  );
};

export default SignChallenge;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 20,
  },
  heading: {
    marginBottom: 20,
  },
  headingText: {
    fontWeight: 'bold',
    fontSize: 24,
    color: 'black',
  },
  info: {
    marginBottom: 20,
    borderLeftColor: 'gray',
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 5,
    paddingRight: 10,
    backgroundColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 16,
  },
  buttons: {
    marginTop: 20,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  previewBlocks: {
    marginBottom: 20,
  },
  item: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 5,
  },
  labelText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'black',
  },
  value: {
    marginBottom: 5,
  },
  valueText: {
    fontSize: 14,
  },
});

SignChallenge.navigationOptions = navigationStyleTx({}, (options) => ({
  ...options,
  title: loc.challenge.header,
}));
