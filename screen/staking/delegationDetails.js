import { navigationStyleTx } from '../../components/navigationStyle';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BlueButton, BlueDismissKeyboardInputAccessory } from '../../BlueComponents';
import InputAccessoryAllFunds from '../../components/InputAccessoryAllFunds';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { stakingStyles as styles } from './styles';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Button from '../../components/Button';
import BottomModal from '../../components/BottomModal';
import dayjs from 'dayjs';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { getStyles } from '../send/details/styles';
import { useRecalcFee } from '../send/details/hooks';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { MintLayerWallet } from '../../class/wallets/mintlayer-wallet';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import MlNetworkTransactionFees, { MlNetworkTransactionFee } from '../../models/mlNetworkTransactionFees';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BigNumber from 'bignumber.js';
import { ML_ATOMS_PER_COIN } from '../../blue_modules/Mintlayer';
import currency from '../../blue_modules/currency';
import AmountInputML from '../../components/amount_input/AmountInputML';
import BigInt from 'big-integer';
import { FButton, FContainer } from '../../components/FloatButtons';
import { Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import { COLORS } from '../../theme/Colors';
import { WatchOnlyWallet } from '../../class';

const StakingDelegationDetails = () => {
  const navigation = useNavigation();

  const { wallets, saveToDisk, setSelectedWallet, isTestMode } = useContext(BlueStorageContext);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [itemPriceUnit, setItemPriceUnit] = useState('');
  const [dataSource, setDataSource] = useState([]);

  const [addFundsModalVisible, setAddFundsModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  const [units, setUnits] = useState([MintlayerUnit.ML]);

  const [customFee, setCustomFee] = useState(null);
  const [amount, setAmount] = useState('');
  const [feeUnit, setFeeUnit] = useState();
  const [addresses, setAddresses] = useState([]);
  const [changeAddress, setChangeAddress] = useState();
  const [utxo, setUtxo] = useState(null);
  const [feePrecalc, setFeePrecalc] = useState({ current: null, slowFee: null, mediumFee: null, fastestFee: null });
  const [networkTransactionFees, setNetworkTransactionFees] = useState(new NetworkTransactionFee(3, 2, 1));
  const [networkTransactionFeesIsLoading, setNetworkTransactionFeesIsLoading] = useState(false);

  const [dumb, setDumb] = useState(false);

  const amountUnit = MintlayerUnit.ML;

  const balance = utxo ? utxo.reduce((prev, curr) => prev + curr.value, 0) : wallet?.getBalance();

  const [poolId, setPoolId] = useState('');

  const { walletID, delegation } = useRoute().params;
  const { name } = useRoute();
  const wallet = wallets.find((w) => w.getID() === walletID);

  const handleClickAddFunds = () => {
    setAddFundsModalVisible(true);
  };

  const handleClickWithdraw = () => {
    setWithdrawModalVisible(true);
  };

  const recalcFee = async () => {
    if (!wallet) {
      return null;
    }

    const utxo = wallet.getUtxo();
    const address = await wallet.getAddressAsync();
    const changeAddress = await wallet.getChangeAddressAsync();

    let fee;

    if (addFundsModalVisible) {
      fee = await wallet.calculateFee({
        utxosTotal: utxo,
        address,
        changeAddress,
        amountToUse: BigInt(amount * 100000000000),
        feeRate: 100000000,
        delegationId: delegation.delegation_id,
      });
    }

    if (withdrawModalVisible) {
      fee = await wallet.calculateFee({
        amountToUse: BigInt(amount * 100000000000),
        feeRate: 100000000,
        delegationId: delegation.delegation_id,
        delegationWithdraw: true,
        delegation,
      });
    }

    setFeePrecalc({ current: fee });
  };

  useEffect(() => {
    recalcFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  useEffect(() => {
    if (!wallet) {
      return;
    }
    // check if we have a suitable wallet
    setUnits([MintlayerUnit.ML]);
    setFeeUnit(wallet.getPreferredBalanceUnit());

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
    if (!wallet) {
      return null;
    }
    setIsLoading(true);
    setTimeElapsed(0);
    setItemPriceUnit(wallet.getPreferredBalanceUnit());
    setIsLoading(false);
    setSelectedWallet(wallet.getID());
    setDataSource(wallet.getDelegations(15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, wallet, walletID]);

  const renderDelegationItem = ({ item }) => {
    return (
      <View style={styles.delegationItem}>
        <View>
          <Text>Balance: {item.balance / 1e11} ML</Text>
        </View>
        <View>
          <Text>Delegation ID: {item.delegation_id}</Text>
        </View>
        <View>
          <Text>Pool ID: {item.pool_id}</Text>
        </View>
        <View>
          <Text>Created: {dayjs(item.creation_time * 1000).format('YYYY-MM-DD HH:mm:ss')}</Text>
        </View>
      </View>
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

  const createAddFundsTransaction = async () => {
    if (!wallet) {
      return null;
    }

    setIsLoading(true);

    try {
      const utxo = wallet.getUtxo();
      const address = await wallet.getAddressAsync();
      const changeAddress = await wallet.getChangeAddressAsync();

      const targets = [
        {
          delegationId: delegation.delegation_id,
          value: BigInt(amount * 100000000000),
        },
      ];

      const { tx, outputs, fee, requireUtxo } = await wallet.createTransaction(utxo, targets, 100000000, changeAddress);

      const recipients = outputs.filter(({ address }) => address !== changeAddress);

      navigation.navigate('Confirm', {
        action: 'addFunds',
        fee: new BigNumber(fee).dividedBy(ML_ATOMS_PER_COIN).toNumber(),
        walletID: wallet.getID(),
        tx,
        recipients,
        requireUtxo,
        delegation,
      });
      setIsLoading(false);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  };

  const createWithdrawTransaction = async () => {
    if (!wallet) {
      return null;
    }

    setIsLoading(true);

    try {
      const utxo = wallet.getUtxo();
      const address = await wallet.getAddressAsync();
      const changeAddress = await wallet.getChangeAddressAsync();

      const targets = [
        {
          delegationId: delegation.delegation_id,
          value: BigInt(amount * 100000000000),
        },
      ];

      const { tx, fee } = await wallet.withdrawDelegation({
        delegation,
        amount: BigInt(amount * 100000000000),
        feeRate: 100000000,
      });

      const recipients = [
        {
          address: delegation.spend_destination,
          value: BigInt(amount * 100000000000),
        },
      ];

      navigation.navigate('Confirm', {
        delegation,
        action: 'withdrawFunds',
        fee: new BigNumber(fee).dividedBy(ML_ATOMS_PER_COIN).toNumber(),
        walletID: wallet.getID(),
        recipients,
        tx,
      });
      setIsLoading(false);
    } catch (e) {
      console.log(e);
      setIsLoading(false);
    }
  };

  useRecalcFee({ wallet, networkTransactionFees, feeRate, utxo, addresses, changeAddress, dumb, feePrecalc, setFeePrecalc, balance });

  const renderAddFundsModal = () => {
    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={addFundsModalVisible} onClose={() => setAddFundsModalVisible(false)}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.addDelegationModal}>
            <View style={styles.addDelegationModalContent}>
              <Text>Enter amount you want to delegate</Text>
            </View>

            <AmountInputML
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={(unit) => {
                // TODO: implement unit change
              }}
              onChangeText={(text) => {
                console.log(text);
                setAmount(text);
              }}
              unit={amountUnit}
              editable
              inputAccessoryViewID={InputAccessoryAllFunds.InputAccessoryViewID}
              isTestMode={isTestMode}
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

              <View style={styles.createButton}>{isLoading ? <ActivityIndicator /> : <BlueButton disabled={amount < 1} onPress={createAddFundsTransaction} title={loc.send.details_next} testID="CreateTransactionButton" />}</View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderWithdrawModal = () => {
    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={withdrawModalVisible} onClose={() => setWithdrawModalVisible(false)}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.addDelegationModal}>
            <View style={styles.addDelegationModalContent}>
              <Text>Enter amount you want to withdraw</Text>
            </View>
            <AmountInputML
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={(unit) => {
                // TODO: implement unit change
              }}
              onChangeText={(text) => {
                setAmount(text);
              }}
              unit={amountUnit}
              editable
              inputAccessoryViewID={InputAccessoryAllFunds.InputAccessoryViewID}
              isTestMode={isTestMode}
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

              <View style={styles.createButton}>{isLoading ? <ActivityIndicator /> : <BlueButton disabled={amount > delegation.balance / 1e11 - feePrecalc.current / 1e11} onPress={createWithdrawTransaction} title={loc.send.details_next} testID="CreateTransactionButton" />}</View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  return (
    <View style={[styles.root]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <StatusBar barStyle="light-content" />
      <View>
        <View style={styles.infoDetails}>
          <View>
            <Text style={styles.listHeaderText}>Delegation details</Text>
          </View>
          <View style={styles.delegationDetailsData}>
            <Text>Delegation ID:</Text>
            <Text>{delegation.delegation_id}</Text>
          </View>
          <View style={styles.delegationPoolDetailsData}>
            <Text>Pool Id:</Text>
            <Text>{delegation.pool_id}</Text>
          </View>
          <View style={styles.delegationPoolSummaryData}>
            <Text>Pool Summary:</Text>

            <View>
              <Text>Cost per block: {delegation.pool_data.cost_per_block.decimal} ML</Text>
            </View>
            <View>
              <Text>Margin ratio: {delegation.pool_data.margin_ratio_per_thousand}</Text>
            </View>
            <View>
              <Text>Pool pledge: {delegation.pool_data.staker_balance.decimal} ML</Text>
            </View>
          </View>

          <View style={styles.balance}>
            <Text style={styles.balanceLabel}>Your balance:</Text>
            <Text style={styles.balanceValue}>{delegation.balance / 1e11} ML</Text>
          </View>
        </View>

        <FContainer>
          <FButton
            testID="ReceiveButton"
            text={loc.stake.add_funds}
            onPress={handleClickAddFunds}
            icon={
              <View style={styles.receiveIcon}>
                <Icon name="arrow-down" size={20} type="font-awesome" color={COLORS.white} />
              </View>
            }
          />
          <FButton
            onLongPress={handleClickWithdraw}
            onPress={handleClickWithdraw}
            text={loc.stake.withdraw}
            testID="SendButton"
            icon={
              <View style={styles.sendIcon}>
                <Icon name="arrow-down" size={20} type="font-awesome" color={COLORS.white} />
              </View>
            }
          />
        </FContainer>

        {renderAddFundsModal()}
        {renderWithdrawModal()}
      </View>
      <BlueDismissKeyboardInputAccessory />
    </View>
  );
};

export default StakingDelegationDetails;

StakingDelegationDetails.navigationOptions = navigationStyleTx({}, (options) => ({
  ...options,
  title: loc.stake.header,
}));
