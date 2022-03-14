import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import ComingSoon from './ComingSoon';

const MLSAsset = (props) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.parentElement, props.style]}>
      <Text style={[styles.textElement, { color: colors.shadowColor }]}>{props.text}</Text>
      <ComingSoon text={props.comSoon} />
    </View>
  );
};
const styles = StyleSheet.create({
  parentElement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    marginHorizontal: 15,
  },
  textElement: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
export default MLSAsset;
