import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { type } from '../theme/Fonts';
import { useTheme } from '@react-navigation/native';

const ComingSoon = (props) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.touchOpacityElement, { backgroundColor: colors.buttonBackgroundColor }]}>
      <Text style={[styles.touchOpacityTextElement, { color: colors.brandingColor }]}>{props.text}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  touchOpacityElement: {
    borderRadius: 15,
    marginRight: 10,
  },
  touchOpacityTextElement: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    fontFamily: type.semiBold,
  },
});

export default ComingSoon;
