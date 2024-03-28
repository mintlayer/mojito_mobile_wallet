import React from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import RNFetchBlob from 'rn-fetch-blob';
import injectedJavaScript from './webview';
import webViewEventBus from '../../class/webview-event-bus';
import PropTypes from 'prop-types';

const html = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Title</title>
</head>
<body>
<script>
</script>
</body>
</html>
`;

export const WasmWebView = ({ setWasmInitializationFinished }) => {
  const webviewRef = React.useRef(null);

  const onLoadEnd = async () => {
    try {
      const wasmFileName = 'wasm_wrappers_bg.wasm';
      const pathToWasm = Platform.OS === 'android' ? `custom/${wasmFileName}` : wasmFileName;
      const path = RNFetchBlob.fs.asset(pathToWasm);
      const wasmBinary = await RNFetchBlob.fs.readFile(path, 'base64').then();
      webViewEventBus.setWebViewRef(webviewRef);
      await webViewEventBus.exec('initWasm', [wasmBinary]);
    } catch (e) {
      Alert.alert('Wasm Init Error', e.message);
      console.error(e);
    } finally {
      setWasmInitializationFinished(true);
    }
  };

  const onError = (e) => {
    Alert.alert('Wasm Error', e.message);
    console.error(e);
  };

  return (
    <View style={styles.container}>
      <WebView ref={webviewRef} onError={onError} onLoadEnd={onLoadEnd} onMessage={(e) => webViewEventBus.onMessage(e)} injectedJavaScript={injectedJavaScript} source={{ html }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
});

WasmWebView.propTypes = {
  setWasmInitializationFinished: PropTypes.func,
};
