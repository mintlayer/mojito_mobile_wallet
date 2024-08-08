import React, { useEffect, useContext } from 'react';
import { InteractionManager, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useRoute, useNavigation } from '@react-navigation/native';

import WalletGradient from '../../class/wallet-gradient';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import TransactionsNavigationHeader from '../../components/TransactionsNavigationHeader';

const WalletTransactionsHeader = () => {
  const { wallets, saveToDisk, walletTransactionUpdateStatus } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = wallets.find((w) => w.getID() === walletID);
  const { setParams, setOptions, navigate } = useNavigation();

  useEffect(() => {
    setOptions({ headerTitle: walletTransactionUpdateStatus === walletID ? loc.transactions.updating : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTransactionUpdateStatus]);

  useEffect(() => {
    setOptions({
      headerStyle: {
        backgroundColor: WalletGradient.headerColorFor(wallet.type),
        borderBottomWidth: 0,
        elevation: 0,
        shadowOffset: { height: 0, width: 0 },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, wallet, walletID]);

  useEffect(() => {
    const newWallet = wallets.find((w) => w.getID() === walletID);
    if (newWallet) {
      setParams({ walletID, isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={WalletGradient.headerColorFor(wallet.type)} animated />
      <TransactionsNavigationHeader
        wallet={wallet}
        onWalletUnitChange={(passedWallet) =>
          InteractionManager.runAfterInteractions(async () => {
            // setItemPriceUnit(passedWallet.getPreferredBalanceUnit());
            saveToDisk();
          })
        }
      />
    </View>
  );
};

export default WalletTransactionsHeader;

WalletTransactionsHeader.navigationOptions = navigationStyle({}, (options, { theme, navigation, route }) => {
  return {
    headerRight: () => (
      <TouchableOpacity
        accessibilityRole="button"
        testID="WalletDetails"
        disabled={route.params.isLoading === true}
        style={styles.walletDetails}
        onPress={() =>
          navigation.navigate('WalletDetails', {
            walletID: route.params.walletID,
          })
        }
      >
        <Icon name="kebab-horizontal" type="octicon" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    ),
    title: '',
    headerStyle: {
      backgroundColor: WalletGradient.headerColorFor(route.params.walletType),
      borderBottomWidth: 0,
      elevation: 0,
      // shadowRadius: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerTintColor: '#FFFFFF',
    headerBackTitleVisible: false,
  };
});

const styles = StyleSheet.create({
  flex: {
    // flex: 1,
  },
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
