/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { forwardRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import { type } from '../../theme/Fonts';

export const SendReceiveCard = forwardRef((props, ref) => {
  const { colors } = useTheme();
  const backgroundColorArrow = props.arrowSign == loc.send.type_receive ? colors.btcPercentColor : colors.walletBalanceBgColor;
  const fontColorAmount = props.arrowSign == loc.send.type_receive ? colors.buttonBackgroundColor : colors.walletBalanceBgColor;
  return (
    <TouchableOpacity
      {...props}
      style={[
        {
          flex: 1,
          borderWidth: 0.7,
          borderColor: 'transparent',
          backgroundColor: colors.aquaHaze,
          minHeight: 70,
          height: 70,
          maxHeight: 70,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 10,
          marginHorizontal: 20,
        },
        props.style,
      ]}
      ref={ref}
      accessibilityRole="button"
    >
      <View style={styles.container}>
        <View style={[styles.arrowContainer, { backgroundColor: backgroundColorArrow }]}>
          <AntDesign name={props.arrowSign == loc.send.type_receive ? 'arrowdown' : 'arrowup'} size={20} color={colors.buttonTextColor} />
        </View>
        {props.title && <Text style={[styles.titleText, { color: colors.walletBalanceBgColor }]}>{props.title}</Text>}
        <View style={{ alignItems: 'flex-end' }}>
          {props.amount && <Text style={[styles.amountText, { color: fontColorAmount }]}>{props.amount}</Text>}
          {props.date && <Text style={[styles.dateText, { color: colors.lightGray }]}>{props.date}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowContainer: {
    padding: 12,
    borderRadius: 30,
  },
  titleText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontFamily: type.semiBold,
    flex: 1,
  },
  amountText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontFamily: type.semiBold,
    lineHeight: 30,
  },
  dateText: {
    marginHorizontal: 8,
    fontSize: 12,
    fontFamily: type.light,
  },
});
