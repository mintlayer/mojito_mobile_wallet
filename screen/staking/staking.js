import { navigationStyleTx } from '../../components/navigationStyle';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BlueButton, BlueDismissKeyboardInputAccessory } from '../../BlueComponents';
import InputAccessoryAllFunds from '../../components/InputAccessoryAllFunds';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { stakingStyles as styles } from './styles';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import WalletGradient from '../../class/wallet-gradient';
import Button from '../../components/Button';
import BottomModal from '../../components/BottomModal';
import dayjs from 'dayjs';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import AddressInput from '../../components/AddressInput';
import { getStyles } from '../send/details/styles';
import { useCreateTransaction, useRecalcFee } from '../send/details/hooks';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { HDSegwitBech32Wallet } from '../../class';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { MintLayerWallet } from '../../class/wallets/mintlayer-wallet';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import MlNetworkTransactionFees, { MlNetworkTransactionFee } from '../../models/mlNetworkTransactionFees';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import { ML_ATOMS_PER_COIN } from '../../blue_modules/Mintlayer';
import { FButton, FContainer } from '../../components/FloatButtons';
import { Icon } from 'react-native-elements';
import { COLORS } from '../../theme/Colors';

const Staking = () => {
  const navigation = useNavigation();

  const { wallets, saveToDisk, setSelectedWallet, isTestMode } = useContext(BlueStorageContext);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(15);
  const [pageSize, setPageSize] = useState(20);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [itemPriceUnit, setItemPriceUnit] = useState('');
  const [dataSource, setDataSource] = useState([]);

  const [addDelegationModalVisible, setAddDelegationModalVisible] = useState(false);

  const [units, setUnits] = useState([MintlayerUnit.ML]);

  const [customFee, setCustomFee] = useState(null);
  const [amountUnit, setAmountUnit] = useState();
  const [feeUnit, setFeeUnit] = useState();
  const [addresses, setAddresses] = useState([]);
  const [changeAddress, setChangeAddress] = useState();
  const [utxo, setUtxo] = useState(null);
  const [feePrecalc, setFeePrecalc] = useState({ current: null, slowFee: null, mediumFee: null, fastestFee: null });
  const [networkTransactionFees, setNetworkTransactionFees] = useState(new NetworkTransactionFee(3, 2, 1));
  const [networkTransactionFeesIsLoading, setNetworkTransactionFeesIsLoading] = useState(false);

  const [dumb, setDumb] = useState(false);

  const balance = utxo ? utxo.reduce((prev, curr) => prev + curr.value, 0) : wallet?.getBalance();

  const [poolId, setPoolId] = useState('');

  const { walletID } = useRoute().params;
  const { name } = useRoute();
  const wallet = wallets.find((w) => w.getID() === walletID);

  const handleClickAddDelegation = () => {
    setAddDelegationModalVisible(true);
  };

  const recalcFee = async () => {
    if (!wallet) {
      return null;
    }

    const utxo = wallet.getUtxo();
    const address = await wallet.getAddressAsync();
    const changeAddress = await wallet.getChangeAddressAsync();

    const fee = await wallet.calculateFee({
      utxosTotal: utxo,
      address,
      changeAddress,
      amountToUse: 1,
      feeRate: 100000000,
      poolId,
    });

    setFeePrecalc({ current: fee });
  };

  useEffect(() => {
    recalcFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId]);

  useEffect(() => {
    // check if we have a suitable wallet
    setUnits([MintlayerUnit.ML]);
    setFeeUnit(wallet.getPreferredBalanceUnit());
    setAmountUnit(wallet.preferredBalanceUnit); // default for whole screen

    // we are ready!
    setIsLoading(false);

    const NetworkTransactionFeeClass = MlNetworkTransactionFee;
    const NetworkTransactionFeesClass = MlNetworkTransactionFees;

    // load cached fees
    AsyncStorage.getItem(NetworkTransactionFeeClass.StorageKey)
      .then((res) => {
        const fees = JSON.parse(res);
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
      })
      .catch((e) => console.log('loading cached recommendedFees error', e));

    // load fresh fees from servers

    setNetworkTransactionFeesIsLoading(true);
    NetworkTransactionFeesClass.recommendedFees()
      .then(async (fees) => {
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
        await AsyncStorage.setItem(NetworkTransactionFeeClass.StorageKey, JSON.stringify(fees));
      })
      .catch((e) => console.log('loading recommendedFees error', e))
      .finally(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNetworkTransactionFeesIsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsLoading(true);
    setLimit(15);
    setPageSize(20);
    setTimeElapsed(0);
    setItemPriceUnit(wallet.getPreferredBalanceUnit());
    setIsLoading(false);
    setSelectedWallet(wallet.getID());
    setDataSource(wallet.getDelegations(15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, wallet, walletID]);

  const renderDelegationItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('Delegation', { delegation: item, walletID: wallet.getID() });
        }}
      >
        <View style={styles.delegationItem}>
          <View style={styles.info}>
            <View style={styles.delegationId}>
              <Text style={styles.delegationIdText}>{item.delegation_id.slice(0, 12) + '...' + item.delegation_id.slice(-12)}</Text>
            </View>
            <View style={styles.delegationPoolId}>
              <Text style={styles.delegationPoolIdText}>Pool ID: {item.pool_id.slice(0, 8) + '...' + item.pool_id.slice(-8)}</Text>
            </View>
            <View style={styles.delegationDate}>
              <Text style={styles.delegationDateText}>{dayjs(item.creation_time * 1000).format('YYYY-MM-DD HH:mm')}</Text>
            </View>
          </View>
          <View style={styles.delegationBalance}>
            <Text style={styles.delegationBalanceText}>{item.balance / 1e11} ML</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const processAddressData = (data) => {
    //
    console.log(data);
  };

  const formatFee = (fee) => formatBalance(fee, feeUnit, true);

  const getFeeRateVByte = (rate) => {
    const calculateFeeFailed = feePrecalc.slowFee === null;
    const finalRate = calculateFeeFailed ? networkTransactionFees.fastestFee : rate;
    return `${formatBalanceWithoutSuffix(finalRate, MintlayerUnit.ML)} ${isTestMode ? loc.units.tml_vbyte : loc.units.ml_vbyte}`;
  };

  // if cutomFee is not set, we need to choose highest possible fee for wallet balance
  // if there are no funds for even Slow option, use 1 sat/vbyte fee
  const feeRate = useMemo(() => {
    if (customFee) return customFee;
    // if (feePrecalc.slowFee === null) {
    //   console.log('fffff');
    //   return '1';
    // } // wait for precalculated fees
    let initialFee;
    if (feePrecalc.fastestFee !== null) {
      initialFee = String(networkTransactionFees.fastestFee);
    } else if (feePrecalc.mediumFee !== null) {
      initialFee = String(networkTransactionFees.mediumFee);
    } else {
      initialFee = String(networkTransactionFees.slowFee);
    }
    return initialFee;
  }, [customFee, feePrecalc, networkTransactionFees]);

  const stylesHook = StyleSheet.create(getStyles(colors));

  const createTransaction = async () => {
    if (!wallet) {
      return null;
    }

    const utxo = wallet.getUtxo();
    const address = await wallet.getAddressAsync();
    const changeAddress = await wallet.getChangeAddressAsync();

    const targets = [
      {
        poolId,
        address,
        value: 1,
      },
    ];

    const { tx, outputs, fee, requireUtxo } = await wallet.createTransaction(utxo, targets, 100000000, changeAddress);

    const recipients = outputs.filter(({ address }) => address !== changeAddress);

    navigation.navigate('Confirm', {
      action: 'CreateDelegation',
      fee: new BigNumber(fee).dividedBy(ML_ATOMS_PER_COIN).toNumber(),
      walletID: wallet.getID(),
      tx,
      recipients,
      requireUtxo,
    });
  };

  useRecalcFee({ wallet, networkTransactionFees, feeRate, utxo, addresses, changeAddress, dumb, feePrecalc, setFeePrecalc, balance });

  const renderAddDelegationModal = () => {
    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={addDelegationModalVisible} onClose={() => setAddDelegationModalVisible(false)}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.addDelegationModal}>
            <View style={styles.addDelegationModalContent}>
              <Text>Enter pool ID</Text>
            </View>
            <AddressInput
              placeholder="Pool ID"
              onChangeText={(text) => {
                setPoolId(text);
              }}
              onBarScanned={processAddressData}
              address={poolId}
              isLoading={isLoading}
              inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              // launchedBy={name}
              editable
            />

            <View style={styles.addDelegationModalContent}>
              <TouchableOpacity testID="chooseFee" accessibilityRole="button" style={styles.fee}>
                <Text style={[styles.feeLabel, stylesHook.feeLabel]}>{loc.send.create_fee}</Text>

                {networkTransactionFeesIsLoading ? (
                  <ActivityIndicator />
                ) : (
                  <View style={[styles.feeRow, stylesHook.feeRow]}>
                    <Text style={stylesHook.feeValue}>{feePrecalc.current ? formatFee(feePrecalc.current) : getFeeRateVByte(feeRate)}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.createButton}>{isLoading ? <ActivityIndicator /> : <BlueButton onPress={createTransaction} title={loc.send.details_next} testID="CreateTransactionButton" />}</View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  useEffect(() => {
    handleFetchDelegations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchDelegations = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await wallet.fetchDelegations();
      const newDelegations = wallet.getDelegations();
      setDataSource(newDelegations);
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <StatusBar barStyle="light-content" />
      <View>
        <FlatList
          // ListHeaderComponent={
          //   <View style={styles.listHeader}>
          //     <View style={styles.listHeaderTextRow}>
          //       <Text style={styles.listHeaderText}>Your delegation list</Text>
          //     </View>
          //   </View>
          // }
          ListFooterComponent={<View style={styles.listFooter} />}
          onEndReachedThreshold={0.3}
          onEndReached={async () => {
            //
          }}
          ListEmptyComponent={
            <ScrollView style={styles.flex} contentContainerStyle={styles.emptyItem}>
              <Text>Your delegations will be displayed here</Text>
            </ScrollView>
          }
          data={dataSource}
          // extraData={[timeElapsed, dataSource, wallets]}
          keyExtractor={(item) => item.delegation_id}
          renderItem={renderDelegationItem}
          contentInset={{ top: 0, left: 0, bottom: 90, right: 0 }}
          onRefresh={handleFetchDelegations}
          refreshing={isLoading}
        />

        <FContainer>
          <FButton
            testID="ReceiveButton"
            text={loc.stake.add_delegation}
            onPress={handleClickAddDelegation}
            icon={
              <View>
                <Icon name="plus" size={20} type="font-awesome" color={COLORS.white} />
              </View>
            }
          />
        </FContainer>
        {renderAddDelegationModal()}
      </View>
      <BlueDismissKeyboardInputAccessory />
    </View>
  );
};

export default Staking;

Staking.navigationOptions = navigationStyleTx({}, (options) => ({
  ...options,
  title: loc.stake.header,
}));
