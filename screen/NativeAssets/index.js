import React from 'react';
import { View, FlatList, ScrollView, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import navigationStyle from '../../components/navigationStyle';
import { COLORS } from '../../theme/Colors';
import { type } from '../../theme/Fonts';
import { useTheme } from '@react-navigation/native';
import loc from '../../loc';
import MLSAsset from '../../components/MLSAsset';
import { BtcMlcComponent } from '../../components/BtcMltComponent';
import { create_wallet, bitcoin_small } from '../../theme/Images';

const NativeAssets = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
        <View>
          <View style={[styles.firstChildView, { backgroundColor: colors.backNative }]}>
            <View style={styles.childLogoView}>
              <Image source={create_wallet} />
              <Text style={[styles.childLogoText, { color: colors.walletBalanceBgColor }]}>{loc.native_assets.title_logo}</Text>
            </View>
            <View style={styles.secondChildView}>
              <Text style={[styles.walletText, { color: colors.walletBalanceBgColor }]}>{loc.native_assets.wallet_balance}</Text>
              <Text style={[styles.balanceAmount, { color: colors.walletBalanceBgColor }]}>{loc.native_assets.amount_balance}</Text>
              <View style={styles.thirdChildView}>
                <Text style={[styles.lastHoursText, { color: colors.walletBalanceBgColor }]}>{loc.native_assets.last_hours}</Text>
                <Text style={[styles.lastHoursAmount, { color: colors.buttonBackgroundColor }]}>{loc.native_assets.amount_hours}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.textNativeAssets, { color: colors.walletBalanceBgColor }]}>Native Asstes</Text>
          <BtcFlatItemFunc />
          <MLSFlatItemFunc />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const BtcFlatItemFunc = () => {
  const dataOfBtsComponent = [
    { key: 1, imageUrl: bitcoin_small, btc: 'BTC', bitcoin: 'Bitcoin', amount: '$3835.00', date: '15 Oct 2021 13:00' },
    { key: 2, imageUrl: create_wallet, btc: 'MLT', bitcoin: 'Mintlayer', amount: '385.00', date: '15 Oct 2021 13:00' },
  ];
  return (
    <FlatList
      data={dataOfBtsComponent}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => {
        return <BtcMlcComponent source={item.imageUrl} title={item.btc} detail={item.bitcoin} amount={item.amount} date={item.date} />;
      }}
    />
  );
};
const MLSFlatItemFunc = () => {
  const dataOfMLS = [
    { key: 3, name: 'MLS - 01 Assets', come: 'Coming Soon' },
    { key: 4, name: 'MLS - 02 Assets', come: 'Coming Soon' },
    { key: 5, name: 'MLS - 03 Assets', come: 'Coming Soon' },
  ];
  return (
    <FlatList
      keyExtractor={(item) => item.key}
      data={dataOfMLS}
      renderItem={(itemList) => {
        return <MLSAsset style={styles.mlsComponent} text={itemList.item.name} comSoon={itemList.item.come} />;
      }}
    />
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
  firstChildView: { flex: 1, padding: 10, maxHeight: 314, minHeight: 314 },
  childLogoView: { flexDirection: 'row', paddingVertical: 40, paddingHorizontal: 20 },
  childLogoText: { marginHorizontal: 10, fontSize: 28, fontFamily: type.bold },
  secondChildView: { flexDirection: 'column', padding: 20, alignContent: 'center', alignItems: 'center' },
  walletText: { marginBottom: 10, fontSize: 20, fontFamily: type.semiBold },
  balanceAmount: { fontSize: 36, fontFamily: type.bold },
  thirdChildView: { flexDirection: 'row', marginTop: 15 },
  lastHoursText: { fontSize: 18, fontFamily: type.semiBold },
  lastHoursAmount: { fontSize: 18, fontFamily: type.semiBold },
  mlsComponent: { marginTop: 10, padding: 10 },
  textNativeAssets: {
    fontFamily: type.bold,
    fontSize: 20,
    padding: 15,
  },
});
