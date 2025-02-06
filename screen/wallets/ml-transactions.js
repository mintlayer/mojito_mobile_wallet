import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, PixelRatio, Platform, ScrollView, StyleSheet, Text, findNodeHandle, View, I18nManager } from 'react-native';
import { Icon } from 'react-native-elements';
import { useRoute, useNavigation, useTheme, useFocusEffect } from '@react-navigation/native';

import { Chain } from '../../models/bitcoinUnits';
import WalletGradient from '../../class/wallet-gradient';
import { WatchOnlyWallet } from '../../class';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isMacCatalina } from '../../blue_modules/environment';
import BlueClipboard from '../../blue_modules/clipboard';
import { TransactionListItem } from '../../components/TransactionListItem';
import alert from '../../components/Alert';
import { COLORS } from '../../theme/Colors';

const fs = require('../../blue_modules/fs');

const buttonFontSize = PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22 ? 22 : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const MLWalletTransactions = () => {
  const { wallets, saveToDisk, setSelectedWallet, walletTransactionUpdateStatus, isElectrumDisabled } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRoute();
  const { name } = router;
  const { walletID } = useRoute().params;
  const wallet = wallets.find((w) => w.getID() === walletID);
  const [itemPriceUnit, setItemPriceUnit] = useState(wallet.getPreferredBalanceUnit());
  const [dataSource, setDataSource] = useState(wallet.getTransactions(15));
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const { setParams, setOptions, navigate } = useNavigation();
  const { colors } = useTheme();
  const walletActionButtonsRef = useRef();

  const stylesHook = StyleSheet.create({
    list: {
      backgroundColor: colors.background,
    },
  });

  /**
   * Simple wrapper for `wallet.getTransactions()`, where `wallet` is current wallet.
   * Sorts. Provides limiting.
   *
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @returns {Array}
   */
  const getTransactionsSliced = (limit = Infinity) => {
    let txs = wallet.getTransactions();
    for (const tx of txs) {
      tx.sort_ts = +new Date(tx.received);
    }
    txs = txs.sort(function (a, b) {
      return b.sort_ts - a.sort_ts;
    });
    return txs.slice(0, limit);
  };

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
    setLimit(15);
    setPageSize(20);
    setTimeElapsed(0);
    setItemPriceUnit(wallet.getPreferredBalanceUnit());
    setIsLoading(false);
    setSelectedWallet(wallet.getID());
    setDataSource(wallet.getTransactions(15));
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

  const isLightning = () => {
    const w = wallet;
    if (w && w.chain === Chain.OFFCHAIN) {
      return true;
    }

    return false;
  };

  /**
   * Forcefully fetches TXs and balance for wallet
   */
  const refreshTransactions = async () => {
    if (isElectrumDisabled) return setIsLoading(false);
    if (isLoading) return;
    setIsLoading(true);
    let noErr = true;
    let smthChanged = false;
    try {
      const balanceStart = +new Date();
      const oldBalance = wallet.getBalance();
      await wallet.fetchBalance();
      if (oldBalance !== wallet.getBalance()) smthChanged = true;
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
      setDataSource([...getTransactionsSliced(limit)]);
    }
    setIsLoading(false);
    setTimeElapsed((prev) => prev + 1);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const renderListFooterComponent = () => {
    // if not all txs rendered - display indicator
    return (getTransactionsSliced(Infinity).length > limit && <ActivityIndicator style={styles.activityIndicator} />) || <View />;
  };

  const navigateToSendScreen = () => {
    navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID: wallet.getID(),
      },
    });
  };

  const renderItem = (item) => <TransactionListItem item={item.item} itemPriceUnit={itemPriceUnit} timeElapsed={timeElapsed} walletID={walletID} />;

  const onBarCodeRead = (ret) => {
    if (!isLoading) {
      setIsLoading(true);
      const params = {
        walletID: wallet.getID(),
        uri: ret.data ? ret.data : ret,
      };
      if (wallet.chain === Chain.ONCHAIN) {
        navigate('SendDetailsRoot', { screen: 'SendDetails', params });
      } else {
        navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params });
      }
    }
    setIsLoading(false);
  };

  const choosePhoto = () => {
    fs.showImagePickerAndReadImage().then(onBarCodeRead);
  };

  const copyFromClipboard = async () => {
    onBarCodeRead({ data: await BlueClipboard.getClipboardContent() });
  };

  const sendButtonPress = () => {
    if (wallet.chain === Chain.OFFCHAIN) {
      return navigate('ScanLndInvoiceRoot', { screen: 'ScanLndInvoice', params: { walletID: wallet.getID() } });
    }

    if (wallet.type === WatchOnlyWallet.type && wallet.isHd() && !wallet.useWithHardwareWalletEnabled()) {
      return Alert.alert(
        loc.wallets.details_title,
        loc.transactions.enable_offline_signing,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              wallet.setUseWithHardwareWalletEnabled(true);
              await saveToDisk();
              navigateToSendScreen();
            },
            style: 'default',
          },

          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    }

    navigateToSendScreen();
  };

  const sendButtonLongPress = async () => {
    if (isMacCatalina) {
      fs.showActionSheet({ anchor: walletActionButtonsRef.current }).then(onBarCodeRead);
    } else {
      const isClipboardEmpty = (await BlueClipboard.getClipboardContent()).trim().length === 0;
      if (Platform.OS === 'ios') {
        const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
        if (!isClipboardEmpty) {
          options.push(loc.wallets.list_long_clipboard);
        }
        ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0, anchor: findNodeHandle(walletActionButtonsRef.current) }, (buttonIndex) => {
          if (buttonIndex === 1) {
            choosePhoto();
          } else if (buttonIndex === 2) {
            navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: name,
                onBarScanned: onBarCodeRead,
                showFileImportButton: false,
              },
            });
          } else if (buttonIndex === 3) {
            copyFromClipboard();
          }
        });
      } else if (Platform.OS === 'android') {
        const buttons = [
          {
            text: loc._.cancel,
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: loc.wallets.list_long_choose,
            onPress: choosePhoto,
          },
          {
            text: loc.wallets.list_long_scan,
            onPress: () =>
              navigate('ScanQRCodeRoot', {
                screen: 'ScanQRCode',
                params: {
                  launchedBy: name,
                  onBarScanned: onBarCodeRead,
                  showFileImportButton: false,
                },
              }),
          },
        ];
        if (!isClipboardEmpty) {
          buttons.push({
            text: loc.wallets.list_long_clipboard,
            onPress: copyFromClipboard,
          });
        }
        ActionSheet.showActionSheetWithOptions({
          title: '',
          message: '',
          buttons,
        });
      }
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.list, stylesHook.list]}>
        <FlatList
          onEndReached={async () => {
            // pagination in works. in this block we will add more txs to FlatList
            // so as user scrolls closer to bottom it will render mode transactions

            if (getTransactionsSliced(Infinity).length < limit) {
              // all list rendered. nop
              return;
            }

            setDataSource(getTransactionsSliced(limit + pageSize));
            setLimit((prev) => prev + pageSize);
            setPageSize((prev) => prev * 2);
          }}
          ListFooterComponent={renderListFooterComponent}
          ListEmptyComponent={
            <ScrollView style={styles.flex} contentContainerStyle={styles.scrollViewContent}>
              <Text numberOfLines={0} style={styles.emptyTxs}>
                {(isLightning() && loc.wallets.list_empty_txs1_lightning) || loc.wallets.list_empty_txs1}
              </Text>
              {isLightning() && <Text style={styles.emptyTxsLightning}>{loc.wallets.list_empty_txs2_lightning}</Text>}
            </ScrollView>
          }
          {...(isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh: refreshTransactions })}
          data={dataSource}
          extraData={[timeElapsed, dataSource, wallets]}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
        />
      </View>
      <FContainer ref={walletActionButtonsRef}>
        {wallet.allowReceive() && (
          <FButton
            testID="ReceiveButton"
            text={loc.receive.header}
            onPress={() => {
              if (wallet.chain === Chain.OFFCHAIN) {
                navigate('LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID: wallet.getID() } });
              } else {
                navigate('ReceiveDetailsRoot', { screen: 'ReceiveDetails', params: { walletID: wallet.getID() } });
              }
            }}
            icon={
              <View style={styles.receiveIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={COLORS.white} />
              </View>
            }
          />
        )}
        {(wallet.allowSend() || (wallet.type === WatchOnlyWallet.type && wallet.isHd())) && (
          <FButton
            onLongPress={sendButtonLongPress}
            onPress={sendButtonPress}
            text={loc.send.header}
            testID="SendButton"
            icon={
              <View style={styles.sendIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={COLORS.white} />
              </View>
            }
          />
        )}
      </FContainer>
    </View>
  );
};

export default MLWalletTransactions;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollViewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  activityIndicator: {
    marginVertical: 20,
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
  emptyTxsLightning: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    fontWeight: '600',
  },
  sendIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '-225deg' : '225deg' }],
  },
  receiveIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '45deg' : '-45deg' }],
  },
});
