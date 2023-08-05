import React, { useContext, useEffect, useState } from 'react';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../../loc';
import { BlueCard, BlueListItem, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import { ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { BlueStorageContext } from '../../../blue_modules/storage-context';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  warning: {
    color: 'red',
  },
});

const TestMode = () => {
  const { isTestModeEnabled, setIsTestModeEnabled } = useContext(BlueStorageContext);
  const [modeChanged, setModeChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestModeSwitchEnabled, setIsTestModeSwitchEnabled] = useState(false);
  const { colors } = useTheme();
  const onTestModeSwitch = async (value) => {
    await setIsTestModeEnabled(value);
    setIsTestModeSwitchEnabled(value);
    setModeChanged(!modeChanged);
  };

  useEffect(() => {
    (async () => {
      setIsTestModeSwitchEnabled(await isTestModeEnabled());
      setIsLoading(false);
    })();
  });

  const stylesWithThemeHook = {
    root: {
      ...styles.root,
      backgroundColor: colors.background,
    },
    scroll: {
      ...styles.scroll,
      backgroundColor: colors.background,
    },
    scrollBody: {
      ...styles.scrollBody,
      backgroundColor: colors.background,
    },
  };

  return isLoading ? (
    <BlueLoading />
  ) : (
    <ScrollView style={stylesWithThemeHook.scroll}>
      <BlueListItem Component={TouchableWithoutFeedback} title={loc.settings.testmode} switch={{ onValueChange: onTestModeSwitch, value: isTestModeSwitchEnabled, testID: 'AdvancedMode' }} />
      <BlueCard>
        <BlueText>{loc.settings.testmode_e}</BlueText>
      </BlueCard>
      {modeChanged && (
        <BlueCard>
          <BlueText style={styles.warning}>{loc.settings.testmode_e_warn}</BlueText>
        </BlueCard>
      )}
      <BlueSpacing20 />
    </ScrollView>
  );
};

TestMode.navigationOptions = navigationStyle({}, (opts) => ({ ...opts, title: loc.settings.testmode }));

export default TestMode;
