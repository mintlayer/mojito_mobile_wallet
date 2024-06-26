import React, { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRoute, useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';

import { BlueListItem, MlCoinLogo, TokenLogo } from '../../BlueComponents';
import WalletGradient from '../../class/wallet-gradient';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import currency from '../../blue_modules/currency';

const MLWalletTokens = () => {
  const { wallets, saveToDisk, setSelectedWallet, walletTransactionUpdateStatus, isTestMode } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(false);
  const { walletID } = useRoute().params;
  const wallet = wallets.find((w) => w.getID() === walletID);
  const [tokenBalances, setTokenBalances] = useState(wallet.getTokenBalances());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const { setParams, setOptions, navigate } = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    const tokenBalances = wallet.getTokenBalances();
    const ml = {
      balance: formatBalanceWithoutSuffix(wallet.getBalance(), MintlayerUnit.ML),
      usdBalance: currency.mlCoinsToLocalCurrency(wallet.getBalance(), false),
      token_info: {
        token_ticker: {
          string: 'Mintlayer',
          symbol: isTestMode ? 'TML' : 'ML',
        },
      },
    };

    setTokenBalances({ ml, ...tokenBalances });
  }, [isTestMode, wallet]);

  const stylesHook = StyleSheet.create({
    list: {
      backgroundColor: colors.background,
    },
    rowTitle: { color: colors.foregroundColor },
  });

  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed((prev) => prev + 1), 60000);
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions({ headerTitle: walletTransactionUpdateStatus === walletID ? loc.transactions.updating : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTransactionUpdateStatus]);

  useEffect(() => {
    setIsLoading(true);
    setTimeElapsed(0);
    setIsLoading(false);
    setSelectedWallet(wallet.getID());
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

  // refresh transactions if it never hasn't been done. It could be a fresh imported wallet
  useEffect(() => {
    if (wallet.getLastTxFetch() === 0) {
      refreshTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // if description of transaction has been changed we want to show new one
  useFocusEffect(
    useCallback(() => {
      setTimeElapsed((prev) => prev + 1);
    }, []),
  );

  /**
   * Forcefully fetches TXs, tokens and balance for wallet
   */
  const refreshTransactions = async () => {
    if (isLoading) return;
    setIsLoading(true);
    let noErr = true;
    let smthChanged = false;
    try {
      const balanceStart = +new Date();
      const oldBalance = wallet.getBalance();
      await wallet.fetchBalance();
      if (oldBalance !== wallet.getBalance()) smthChanged = true;

      const balances = wallet?.getTokenBalances();
      setTokenBalances(balances);

      const balanceEnd = +new Date();
      console.log(wallet.getLabel(), 'fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
      const start = +new Date();
      const oldTx = wallet.getTransactions();
      await wallet.fetchTransactions();
      if (wallet.fetchPendingTransactions) {
        await wallet.fetchPendingTransactions();
      }
      if (wallet.fetchUserInvoices) {
        await wallet.fetchUserInvoices();
      }
      const newTx = wallet.getTransactions();
      if (oldTx.length !== newTx.length) smthChanged = true;
      if (!smthChanged) {
        const maxConfirmationsForUpdate = 7;
        smthChanged = oldTx.length && oldTx[0].confirmations < maxConfirmationsForUpdate && oldTx[0].confirmations !== newTx[0].confirmations;
      }
      const end = +new Date();
      console.log(wallet.getLabel(), 'fetch tx took', (end - start) / 1000, 'sec');
    } catch (err) {
      noErr = false;
      alert(err.message);
      setIsLoading(false);
      setTimeElapsed((prev) => prev + 1);
    }
    if (noErr && smthChanged) {
      console.log('saving to disk');
      await saveToDisk(); // caching
    }
    setIsLoading(false);
    setTimeElapsed((prev) => prev + 1);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const containerStyle = useMemo(
    () => ({
      borderBottomColor: colors.lightBorder,
      paddingTop: 16,
      paddingBottom: 16,
      paddingRight: 0,
    }),
    [colors.lightBorder],
  );

  const renderToken = (item) => {
    const { token_info, balance, usdBalance } = item.item;
    const onItemPress = () => {
      navigate('WalletTransactions', { token_info, walletID });
    };

    const usdBalanceFormatted = usdBalance && `=${usdBalance}$`;

    const logo = token_info.token_ticker.string === 'Mintlayer' ? <MlCoinLogo /> : <TokenLogo text={token_info.token_ticker.string.substring(0, 3)} />;
    return (
      <View style={styles.tokenWrapper}>
        <TouchableOpacity onPress={onItemPress}>
          <BlueListItem leftAvatar={logo} leftAvatarProps={{ size: 42 }} title={token_info.token_ticker.string} contentStyle={styles.contentStyle} subtitleNumberOfLines={1} rightSubtitle={usdBalanceFormatted} Component={View} chevron={false} rightTitle={`${balance} ${token_info.token_ticker.symbol || token_info.token_ticker.string}`} rightContentStyle={styles.rightContentStyle} rightTitleStyle={[styles.rowTitleStyle, stylesHook.rowTitle]} containerStyle={containerStyle} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.list, stylesHook.list]}>
        <FlatList
          ListEmptyComponent={
            <ScrollView style={styles.flex} contentContainerStyle={styles.scrollViewContent}>
              <Text numberOfLines={0} style={styles.emptyTxs}>
                {loc.wallets.list_empty_tokens}
              </Text>
            </ScrollView>
          }
          refreshing={isLoading}
          onRefresh={refreshTransactions}
          data={Object.values(tokenBalances || {}) || []}
          extraData={[timeElapsed, wallets]}
          keyExtractor={_keyExtractor}
          renderItem={renderToken}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
      </View>
    </View>
  );
};

export default MLWalletTokens;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  tokenWrapper: {
    marginHorizontal: 4,
  },
  scrollViewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  list: {
    flex: 1,
  },
  emptyTxs: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    marginVertical: 16,
  },
  contentStyle: {
    flex: 0,
  },
  rightContentStyle: {
    flexGrow: 1,
  },
  rowTitleStyle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
