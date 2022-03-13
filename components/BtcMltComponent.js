/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { forwardRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import loc from '../loc';
import { type } from '../theme/Fonts';
import ComingSoon from './../components/ComingSoon';
export const BtcMlcComponent = forwardRef((props, ref) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[{ backgroundColor: colors.aquaHaze }, styles.TouchableTags]}>
      <View style={styles.container}>
        <View style={[styles.doubleEle]}>
          <View style={[styles.arrowContainer]}>
            <Image source={props.source} />
          </View>
          <View>
            {props.title && <Text style={[styles.titleText, { color: colors.walletBalanceBgColor }]}>{props.title}</Text>}
            {props.title && <Text style={[styles.detailText, { color: colors.walletBalanceBgColor }]}>{props.detail}</Text>}
          </View>
        </View>
        <View style={[styles.secondDoubleEle]}>
          {props.amount > 383.0 ? (
            <ComingSoon text={loc.addresses.comming_soon} />
          ) : (
            <View style={[styles.secondDoubleEle]}>
              <Text style={[styles.amountText, { color: colors.walletBalanceBgColor }]}>{props.amount}</Text>

              <View style={[styles.doubleEle]}>
                <Text style={[styles.dateText, { color: colors.walletBalanceBgColor }]}>{props.date}</Text>
                <Text style={[styles.dateText]}>{props.title}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  TouchableTags: {
    flex: 1,
    borderWidth: 0.7,
    borderColor: 'transparent',
    minHeight: 70,
    height: 70,
    maxHeight: 70,
    borderRadius: 10,
    justifyContent: 'center',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowContainer: {
    padding: 5,
  },
  titleText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: type.bold,
    lineHeight: 30,
  },
  detailText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontFamily: type.light,
    lineHeight: 20,
  },
  amountText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontFamily: type.semiBold,
    lineHeight: 35,
  },
  dateText: {
    marginHorizontal: 5,
    fontSize: 12,
    fontFamily: type.semiBold,
  },
  doubleEle: { flex: 1, flexDirection: 'row' },
  secondDoubleEle: { alignItems: 'flex-end' },
});
