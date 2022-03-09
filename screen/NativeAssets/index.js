import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, SafeAreaView } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { windowWidth } from '../../blue_modules/environment';

import navigationStyle from '../../components/navigationStyle';
import { COLORS } from '../../theme/Colors';
import { type } from '../../theme/Fonts';

const NativeAssets = () => {
  const [activePage, setActivePage] = useState(0);

  return (
    <SafeAreaView style={styles.root}>
      <Text>Native Assests Scress Labore pariatur quis enim do adipisicing voluptate adipisicing aliqua et officia.</Text>
    </SafeAreaView>
  );
};

export default NativeAssets;
NativeAssets.navigationOptions = navigationStyle({}, (opts) => ({
  ...opts,
  headerTitle: '',
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slide1: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 30,
  },
  text: {
    color: COLORS.black,
    fontSize: 18,
    marginVertical: 30,
    fontFamily: type.bold,
  },
  description: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontFamily: type.light,
    lineHeight: 18,
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  activeDot: {
    width: 30,
    height: 8,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  inActiveDot: {
    backgroundColor: COLORS.gray,
    width: 10,
  },
  startButton: {
    width: '80%',
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.white,
    fontFamily: type.light,
    fontSize: 14,
  },
  skipButton: {
    paddingVertical: 20,
    paddingHorizontal: 50,
  },
  skipButtonText: {
    color: COLORS.green,
    fontFamily: type.semiBold,
    fontSize: 14,
  },
  skipButtonPortion: {
    flex: 0.18,
    alignItems: 'center',
  },
});
