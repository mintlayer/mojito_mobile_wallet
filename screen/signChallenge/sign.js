import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { navigationStyleTx } from '../../components/navigationStyle';
import loc from '../../loc';
import { signChallenge } from '../../blue_modules/mintlayer/mintlayer';
import { Button } from 'react-native-elements';
import { BlueButton } from '../../BlueComponents';

const SignChallenge = ({ route, navigation }) => {
  // get params
  const { challengeBase64, callback } = route.params;
  const [signature, setSignature] = useState('');
  const [challegneShowMode, setChallengeShowMode] = useState('base64');

  const challengeDecoded = Buffer.from(challengeBase64, 'base64').toString('utf-8');

  useEffect(() => {
    handleSign();
  }, []);

  const handleSign = async () => {
    // sign challenge
    // get signature
    // send signature to callback
    const signedMessage = await signChallenge('privateKey', challengeBase64);
    console.log('signedMessage', signedMessage);
    setSignature(signedMessage);
  };

  const handleSubmit = () => {
    // send signed message to callback
    console.log('signature', signature);
    // open url in external browser
    Linking.openURL(callback + '?signature=' + signature);
  };

  console.log('route', route);
  console.log('navigation', navigation);
  return (
    <View style={styles.container}>
      <View>
        <View style={styles.heading}>
          <Text style={styles.headingText}>Sign challenge</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.infoText}>Challenge is a message that needs to be signed by the user. The signed message is then sent to the callback. It is used to verify the user's identity and also can be amended with additional data, like a nonce, to prevent replay attacks.</Text>
        </View>
        <View style={styles.previewBlocks}>
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
          <View style={styles.item}>
            <View style={styles.label}>
              <Text style={styles.labelText}>Signature</Text>
            </View>
            <View style={styles.value}>
              <Text style={styles.valueText}>{signature || 'To display signature press "Sign"'}</Text>
            </View>
          </View>
        </View>
      </View>

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
