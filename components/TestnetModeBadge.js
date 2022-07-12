import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlueStorageContext } from '../blue_modules/storage-context';

function TestnetModeBadge() {
  const [isTestnet, setIsTestnet] = useState(false);
  const { isTestModeEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    (async () => {
      setIsTestnet(await isTestModeEnabled());
    })();
  });

  if (!isTestnet) return <></>;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Testnet</Text>
    </View>
  );
}

export default TestnetModeBadge;

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: '#ffdd00',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 100,
    width: '100%',
    paddingBottom: 2,
  },
  text: {
    color: '#000',
  },
});
