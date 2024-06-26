import * as bip39 from 'bip39';
import * as ML from '../../blue_modules/mintlayer/mintlayer';
import { AbstractHDWallet } from './abstract-hd-wallet';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import { broadcastTransaction, getAddressData, getAddressUtxo, getTokenData, getTransactionData, ML_NETWORK_TYPES, TransactionType } from '../../blue_modules/Mintlayer';
import { range } from '../../utils/Array';
import { getArraySpead, getEncodedWitnesses, getOptUtxos, getOutpointedSourceIds, getTransactionHex, getTransactionsBytes, getTransactionUtxos, getTxInputs, getTxOutput, getUtxoAddress, getUtxoAvailable, getUtxoTransactions, totalUtxosAmount } from '../../utils/ML/transaction';
import * as ExchangeRates from '../../models/exchangeRates';
import { removeTrailingZeros } from '../../loc';

export class MintLayerWallet extends AbstractHDWallet {
  static type = 'ML_HDsegwitBech32';
  static typeReadable = 'Mintlayer Wallet';
  static segwitType = 'p2wpkh';
  static derivationPath = "m/84'/0'/0'";

  constructor(opts) {
    super(opts);
    this._balances_by_external_index = {};
    this._balances_by_internal_index = {};

    this._txs_by_external_index = {};
    this._txs_by_internal_index = {};

    this._unconfirmedTxs = [];

    this.gapLimit = 20;
    this.network = (opts && opts.network) || ML_NETWORK_TYPES.MAINNET;
    this.preferredBalanceUnit = this.network === ML_NETWORK_TYPES.MAINNET ? MintlayerUnit.ML : MintlayerUnit.TML;
  }

  getPreferredBalanceUnit() {
    for (const value of Object.values(MintlayerUnit)) {
      if (value === this.preferredBalanceUnit) {
        return this.preferredBalanceUnit;
      }
    }
    return this.network === ML_NETWORK_TYPES.MAINNET ? MintlayerUnit.ML : MintlayerUnit.TML;
  }

  changePreferredBalanceUnit() {
    if (this.getPreferredBalanceUnit() === MintlayerUnit.ML || this.getPreferredBalanceUnit() === MintlayerUnit.TML) {
      this.preferredBalanceUnit = MintlayerUnit.LOCAL_CURRENCY;
    } else {
      this.preferredBalanceUnit = this.network === ML_NETWORK_TYPES.MAINNET ? MintlayerUnit.ML : MintlayerUnit.TML;
    }
  }

  async generateMnemonicFromEntropy(entropy) {
    this.secret = bip39.entropyToMnemonic(entropy);
  }

  getLockedBalance() {
    let lockedBalance = 0;
    for (const bal of Object.values(this._balances_by_external_index)) {
      lockedBalance += bal.l;
    }
    for (const bal of Object.values(this._balances_by_internal_index)) {
      lockedBalance += bal.l;
    }

    return lockedBalance;
  }

  getBalance() {
    let ret = 0;
    for (const bal of Object.values(this._balances_by_external_index)) {
      ret += bal.c;
    }
    for (const bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.c;
    }

    const balance = ret + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0);
    return balance;
  }

  getUnconfirmedBalance() {
    let ret = 0;
    for (const bal of Object.values(this._balances_by_external_index)) {
      ret += bal.u;
    }
    for (const bal of Object.values(this._balances_by_internal_index)) {
      ret += bal.u;
    }
    return ret;
  }

  async fetchBalance() {
    try {
      if (this.next_free_change_address_index === 0 && this.next_free_address_index === 0) {
        // doing binary search for last used address:
        this.next_free_change_address_index = await this._binarySearchIterationForAddress(1000, (index) => this._getNodeAddressByIndexAsync(1, index));
        this.next_free_address_index = await this._binarySearchIterationForAddress(1000, (index) => this._getNodeAddressByIndexAsync(0, index));
      } // end rescanning fresh wallet

      // finally fetching balance
      const prefetchAddressesStart = +new Date();
      await this._prefetchAddresses();
      const prefetchAddressesEnd = +new Date();
      console.log('_prefetchAddresses', (prefetchAddressesEnd - prefetchAddressesStart) / 1000, 'sec');
      const fetchBalanceStart = +new Date();
      await this._fetchBalance();
      const fetchBalanceEnd = +new Date();
      console.log('_fetchBalance', (fetchBalanceEnd - fetchBalanceStart) / 1000, 'sec');
      const fetchUtxoStart = +new Date();
      await this.fetchUtxo();
      const fetchUtxoEnd = +new Date();
      console.log('fetchUtxo', (fetchUtxoEnd - fetchUtxoStart) / 1000, 'sec');
      const fetchTokenBalancesStart = +new Date();
      await this.fetchTokenBalances();
      const fetchTokenBalancesEnd = +new Date();
      console.log('fetchTokenBalances', (fetchTokenBalancesEnd - fetchTokenBalancesStart) / 1000, 'sec');
    } catch (err) {
      console.error(err);
    }
  }

  async _prefetchAddresses() {
    const addresses2FetchPrms = [];

    const externalIndexes = range(this.next_free_address_index, this.next_free_address_index + this.gap_limit);
    for (const c of externalIndexes) {
      addresses2FetchPrms.push(this._getExternalAddressByIndexAsync(c));
    }
    const internalIndexes = range(this.next_free_change_address_index, this.next_free_change_address_index + this.gap_limit);
    for (const c of internalIndexes) {
      addresses2FetchPrms.push(this._getInternalAddressByIndexAsync(c));
    }

    await Promise.all(addresses2FetchPrms);
  }

  async _fetchBalance() {
    // probing future addressess in hierarchy whether they have any transactions, in case
    // our 'next free addr' pointers are lagging behind
    // for that we are gona batch fetch history for all addresses between last used and last used + gap_limit

    const lagAddressesToFetch = [];
    for (let c = this.next_free_address_index; c < this.next_free_address_index + this.gap_limit; c++) {
      lagAddressesToFetch.push(this._getExternalAddressByIndex(c));
    }
    for (let c = this.next_free_change_address_index; c < this.next_free_change_address_index + this.gap_limit; c++) {
      lagAddressesToFetch.push(this._getInternalAddressByIndex(c));
    }

    const txs = await this._multiGetHistoryByAddress(lagAddressesToFetch);

    const nextFreeAddressIndex = this.next_free_address_index;
    const nextFreeChangeAddressIndex = this.next_free_change_address_index;

    for (let c = nextFreeAddressIndex; c < nextFreeAddressIndex + this.gap_limit; c++) {
      const address = this._getExternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_address_index = c + 1;
      }
    }

    for (let c = nextFreeChangeAddressIndex; c < nextFreeChangeAddressIndex + this.gap_limit; c++) {
      const address = this._getInternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_change_address_index = c + 1;
      }
    }

    if (nextFreeAddressIndex < this.next_free_address_index || nextFreeChangeAddressIndex < this.next_free_change_address_index) {
      await this._prefetchAddresses();
    }

    // next, business as usuall. fetch balances

    const addresses2fetch = [];

    // generating all involved addresses.
    // external(receiving)
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      addresses2fetch.push(this._getExternalAddressByIndex(c));
    }

    // internal(changing)
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      addresses2fetch.push(this._getInternalAddressByIndex(c));
    }

    const balances = await this._multiGetBalanceByAddress(addresses2fetch);
    // converting to a more compact internal format

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      const addr = this._getExternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        // first, if balances differ from what we store - we delete transactions for that
        // address so next fetchTransactions() will refetch everything
        if (this._balances_by_external_index[c]) {
          if (this._balances_by_external_index[c].c !== Number(balances.addresses[addr].confirmed) || this._balances_by_external_index[c].u !== Number(balances.addresses[addr].unconfirmed)) {
            delete this._txs_by_external_index[c];
          }
        }
        // update local representation of balances on that address:
        this._balances_by_external_index[c] = {
          c: Number(balances.addresses[addr].confirmed),
          u: Number(balances.addresses[addr].unconfirmed),
          l: Number(balances.addresses[addr].locked),
        };
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      const addr = this._getInternalAddressByIndex(c);
      if (balances.addresses[addr]) {
        // first, if balances differ from what we store - we delete transactions for that
        // address so next fetchTransactions() will refetch everything
        if (this._balances_by_internal_index[c]) {
          if (this._balances_by_internal_index[c].c !== Number(balances.addresses[addr].confirmed) || this._balances_by_internal_index[c].u !== Number(balances.addresses[addr].unconfirmed)) {
            delete this._txs_by_internal_index[c];
          }
        }
        // update local representation of balances on that address:
        this._balances_by_internal_index[c] = {
          c: Number(balances.addresses[addr].confirmed),
          u: Number(balances.addresses[addr].unconfirmed),
          l: Number(balances.addresses[addr].locked),
        };
      }
    }

    this._lastBalanceFetch = +new Date();
  }

  async _binarySearchIterationForAddress(index, getAddressByIndexFn) {
    const generateChunkAddresses = (chunkNum) => {
      const ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(getAddressByIndexFn(c));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    const arr = [];
    for (let c = 0; c < Math.round(index / this.gap_limit); c++) {
      arr.push(c);
    }
    for (const c of arr) {
      const addressesPrms = generateChunkAddresses(c);
      const addresses = await Promise.all(addressesPrms);
      const histories = await this._multiGetHistoryByAddress(addresses);
      if (this._getTransactionsFromHistories(histories).length > 0) {
        // in this particular chunk we have used addresses
        lastChunkWithUsedAddressesNum = c;
        lastHistoriesWithUsedAddresses = histories;
      } else {
        // empty chunk. no sense searching more chunks
        break;
      }
    }

    let lastUsedIndex = 0;

    if (lastHistoriesWithUsedAddresses) {
      // now searching for last used address in batch lastChunkWithUsedAddressesNum

      const arr = [];

      for (let c = lastChunkWithUsedAddressesNum * this.gap_limit; c < lastChunkWithUsedAddressesNum * this.gap_limit + this.gap_limit; c++) {
        arr.push(c);
      }

      for (const c of arr) {
        const address = await getAddressByIndexFn(c);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unsued
        }
      }
    }

    return lastUsedIndex;
  }

  _getTransactionsFromHistories(histories) {
    const txs = [];
    for (const history of Object.values(histories)) {
      for (const tx of history) {
        txs.push(tx);
      }
    }
    return txs;
  }

  addUnconfirmedTx(unconfirmedTx) {
    this._unconfirmedTxs.push(unconfirmedTx);
  }

  getTransactions() {
    let txs = [];
    for (const addressTxs of Object.values(this._txs_by_external_index)) {
      txs = txs.concat(addressTxs);
    }
    for (const addressTxs of Object.values(this._txs_by_internal_index)) {
      txs = txs.concat(addressTxs);
    }

    if (txs.length === 0) return []; // guard clause; so we wont spend time calculating addresses
    // its faster to pre-build hashmap of owned addresses than to query `this.weOwnAddress()`, which in turn
    // iterates over all addresses in hierarchy
    const ownedAddressesHashmap = {};
    for (let c = 0; c < this.next_free_address_index + 1; c++) {
      ownedAddressesHashmap[this._getExternalAddressByIndex(c)] = true;
    }
    for (let c = 0; c < this.next_free_change_address_index + 1; c++) {
      ownedAddressesHashmap[this._getInternalAddressByIndex(c)] = true;
    }

    const ret = [];
    for (const tx of txs) {
      tx.received = tx.timestamp * 1000;
      tx.sortKey = tx.timestamp * 1000;
      if (!tx.timestamp) tx.received = +new Date() - 30 * 1000; // unconfirmed
      tx.confirmations = Number(tx.confirmations) || 0; // unconfirmed
      tx.hash = tx.txid;
      tx.value = 0;
      tx.type = TransactionType.Transfer;

      const isDelegateStaking = tx.outputs.some((vout) => vout.type === TransactionType.DelegateStaking);
      const isCreateStakePool = tx.outputs.some((vout) => vout.type === TransactionType.CreateStakePool);
      const isTokenOut = tx.outputs.some((vout) => vout.type === TransactionType.Transfer && vout.value.type === 'TokenV1' && vout.value.token_id);
      let tokenValue = 0;

      for (const vin of tx.inputs) {
        // if input (spending) goes from our address - we are loosing!
        if (vin.utxo?.destination && ownedAddressesHashmap[vin.utxo.destination]) {
          const isTokenIn = vin.utxo.type === TransactionType.Transfer && vin.utxo.value.type === 'TokenV1' && vin.utxo.value.token_id;

          if (isTokenOut) {
            tx.type = TransactionType.TokenTransfer;

            if (isTokenIn) {
              tokenValue -= Number(vin.utxo.value.amount.decimal) || 0;
            }
          }

          if (isDelegateStaking) {
            tx.type = TransactionType.DelegateStaking;
          } else if (isCreateStakePool) {
            tx.type = TransactionType.CreateStakePool;
          }

          tx.value -= Number(vin.utxo.value.amount.atoms);
        }
      }

      for (const vout of tx.outputs) {
        // when output goes to our address - this means we are gaining!
        if (vout.destination && ownedAddressesHashmap[vout.destination]) {
          if (vout.type === TransactionType.Transfer && vout.value.type === 'TokenV1' && vout.value.token_id) {
            tx.type = TransactionType.TokenTransfer;
            tx.token_id = vout.value.token_id;
            tokenValue += Number(vout.value?.amount.decimal) || 0;
          } else if (vout.type === TransactionType.Transfer) {
            tx.value += Number(vout.value?.amount.atoms) || 0;
          } else if (vout.type === TransactionType.CreateDelegationId) {
            tx.type = TransactionType.CreateDelegationId;
            tx.poolId = vout.pool_id;
          } else if (vout.type === TransactionType.LockThenTransfer) {
            tx.type = TransactionType.LockThenTransfer;
            tx.value += Number(vout.value?.amount.atoms) || 0;
          } else if (vout.type === TransactionType.DelegateStaking) {
            tx.type = TransactionType.DelegateStaking;
            tx.delegationId = vout.delegation_id;
            tx.value += Number(vout?.amount.atoms);
          } else {
            tx.value += Number(vout.value?.amount.atoms) || 0;
          }
        }
      }

      if (isTokenOut) {
        tx.value = removeTrailingZeros(tokenValue.toFixed(2));
      }

      ret.push(tx);
    }

    ret.push(...this._unconfirmedTxs);

    // now, deduplication:
    const usedTxIds = {};
    const ret2 = [];
    for (const tx of ret) {
      if (!usedTxIds[tx.id]) ret2.push(tx);
      usedTxIds[tx.id] = 1;
    }

    return ret2.sort(function (a, b) {
      return b.sortKey - a.sortKey;
    });
  }

  async fetchTransactions() {
    // if txs are absent for some internal address in hierarchy - this is a sign
    // we should fetch txs for that address
    // OR if some address has unconfirmed balance - should fetch it's txs
    // OR some tx for address is unconfirmed
    // OR some tx has < 7 confirmations

    const addresses2fetch = [];

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      // external(receiving) addresses first
      let hasUnconfirmed = false;
      let usedInCreateDelegation = false;
      this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
      for (const tx of this._txs_by_external_index[c]) {
        hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;
        usedInCreateDelegation = tx.outputs.some((vout) => vout.type === TransactionType.CreateDelegationId);
      }

      if (hasUnconfirmed || usedInCreateDelegation || this._txs_by_external_index[c].length === 0 || this._balances_by_external_index[c].u !== 0) {
        addresses2fetch.push(this._getExternalAddressByIndex(c));
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      // next, internal addresses
      let hasUnconfirmed = false;
      this._txs_by_internal_index[c] = this._txs_by_internal_index[c] || [];
      for (const tx of this._txs_by_internal_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_internal_index[c].length === 0 || this._balances_by_internal_index[c].u !== 0) {
        addresses2fetch.push(this._getInternalAddressByIndex(c));
      }
    }

    const txdatas = await this._getWalletTransactions(addresses2fetch);

    // now purge all unconfirmed txs from internal hashmaps, since some may be evicted from mempool because they became invalid
    // or replaced. hashmaps are going to be re-populated anyways, since we fetched TXs for addresses with unconfirmed TXs
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      this._txs_by_external_index[c] = this._txs_by_external_index[c].filter((tx) => !!tx.confirmations);
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      this._txs_by_internal_index[c] = this._txs_by_internal_index[c].filter((tx) => !!tx.confirmations);
    }

    function replaceOrPushTx(tx, txs_by_index, index) {
      txs_by_index[index] = txs_by_index[index] || [];

      // trying to replace tx if it exists already (because it has lower confirmations, for example)
      let replaced = false;
      for (let txIndex = 0; txIndex < txs_by_index[index].length; txIndex++) {
        if (txs_by_index[index][txIndex].id === tx.id) {
          replaced = true;
          txs_by_index[index][txIndex] = tx;
        }
      }
      if (!replaced) txs_by_index[index].push(tx);
    }

    // now, we need to put transactions in all relevant `cells` of internal hashmaps: this._txs_by_internal_index && this._txs_by_external_index
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      for (const tx of Object.values(txdatas)) {
        for (const vin of tx.inputs) {
          if (vin.utxo?.destination && vin.utxo.destination === this._getExternalAddressByIndex(c)) {
            replaceOrPushTx(tx, this._txs_by_external_index, c);
          }
        }
        for (const vout of tx.outputs) {
          if (vout.destination && vout.destination === this._getExternalAddressByIndex(c)) {
            replaceOrPushTx(tx, this._txs_by_external_index, c);
          }
        }
      }
    }

    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      for (const tx of Object.values(txdatas)) {
        for (const vin of tx.inputs) {
          if (vin.utxo?.destination && vin.utxo.destination === this._getInternalAddressByIndex(c)) {
            replaceOrPushTx(tx, this._txs_by_internal_index, c);
          }
        }
        for (const vout of tx.outputs) {
          if (vout.destination && vout.destination === this._getInternalAddressByIndex(c)) {
            replaceOrPushTx(tx, this._txs_by_internal_index, c);
          }
        }
      }
    }

    for (let i = 0; i < this._unconfirmedTxs.length; i++) {
      const found = Object.values(txdatas).some(({ id }) => id === this._unconfirmedTxs[i].id);

      if (found) {
        this._unconfirmedTxs = this._unconfirmedTxs.filter(({ id }) => id !== this._unconfirmedTxs[i].id);
      }
    }

    this._lastTxFetch = +new Date();
  }

  async fetchUtxo() {
    // fetching utxo of addresses that only have some balance
    let addressess = [];

    // todo uncomment when address endpoint will return token balance
    // considering confirmed balance:
    // for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
    //   if (this._balances_by_external_index[c] && this._balances_by_external_index[c].c && this._balances_by_external_index[c].c > 0) {
    //     addressess.push(this._getExternalAddressByIndex(c));
    //   }
    // }
    // for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
    //   if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].c && this._balances_by_internal_index[c].c > 0) {
    //     addressess.push(this._getInternalAddressByIndex(c));
    //   }
    // }
    //
    // // considering Unconfirmed balance:
    // for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
    //   if (this._balances_by_external_index[c] && this._balances_by_external_index[c].u && this._balances_by_external_index[c].u > 0) {
    //     addressess.push(this._getExternalAddressByIndex(c));
    //   }
    // }
    // for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
    //   if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].u && this._balances_by_internal_index[c].u > 0) {
    //     addressess.push(this._getInternalAddressByIndex(c));
    //   }
    // }

    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      addressess.push(this._getExternalAddressByIndex(c));
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      addressess.push(this._getInternalAddressByIndex(c));
    }

    addressess = [...new Set(addressess)]; // deduplicate just for any case
    const fetchedUtxo = await this._multiGetUtxoByAddress(addressess);
    const parsedUtxos = fetchedUtxo.map((utxo) => JSON.parse(utxo)).filter((utxo) => utxo.length > 0);

    this._utxo = parsedUtxos;
  }

  getUtxo(respectFrozen = false) {
    let ret = [];

    if (this._utxo?.length !== 0) {
      const usedUtxo = this._unconfirmedTxs.flatMap(({ usedUtxo }) => usedUtxo);
      const unusedUtxo = this._utxo.map((utxo) => {
        return utxo.filter(({ outpoint: { source_id, index } }) => {
          return !usedUtxo.some(({ outpoint }) => outpoint.source_id === source_id && outpoint.index === index);
        });
      });

      ret = unusedUtxo;
    }
    if (!respectFrozen) {
      ret = ret.filter(({ txid, vout }) => !this.getUTXOMetadata(txid, vout).frozen);
    }
    return ret;
  }

  async fetchTokenBalances() {
    const available = this._utxo
      .flatMap((utxo) => [...utxo])
      .filter((item) => item.utxo.value)
      .reduce((acc, item) => {
        acc.push(item);
        return acc;
      }, []);

    const tokenBalances = {};
    available.forEach((item) => {
      const { value } = item.utxo;
      const token = value.token_id;

      if (token && value.type === 'TokenV1') {
        if (tokenBalances[token]) {
          tokenBalances[token] += parseFloat(value.amount.decimal);
        } else {
          tokenBalances[token] = parseFloat(value.amount.decimal);
        }
      }
    });

    const tokensData = {};
    const tokens = Object.keys(tokenBalances);
    tokens.forEach((token) => {
      tokensData[token] = {};
    });
    const tokensPromises = tokens.map((token) => {
      return getTokenData(token, this.network)
        .then(JSON.parse)
        .then((data) => {
          tokensData[token] = data;
        });
    });
    await Promise.all(tokensPromises);
    this._tokenData = tokensData;

    const tokensUsdRate = {};
    const tokensUsdPromises = tokens.map((token) => {
      const tokenString = tokensData[token].token_ticker.string;
      return ExchangeRates.getRate(tokenString, 'usd')
        .then((data) => {
          tokensUsdRate[token] = data[`${tokenString}-usd`];
        })
        .catch((e) => {
          console.log(e);
        });
    });
    await Promise.all(tokensUsdPromises);

    const merged = Object.keys(tokenBalances).reduce((acc, key) => {
      acc[key] = {
        balance: tokenBalances[key],
        usdBalance: tokensUsdRate[key],
        token_info: {
          number_of_decimals: tokensData[key].number_of_decimals,
          token_ticker: tokensData[key].token_ticker,
          token_id: key,
        },
      };
      return acc;
    }, {});

    this._tokenBalances = merged;
  }

  getTokenData(key) {
    return this._tokenData[key];
  }

  getTokenBalances() {
    return this._tokenBalances || {};
  }

  async _multiGetUtxoByAddress(addresses) {
    const utxosPromises = addresses.map((address) => getAddressUtxo(address, this.network));
    const receivingUtxos = Promise.all(utxosPromises);
    return receivingUtxos;
  }

  async coinselect({ utxosTotal, targets, feeRate, changeAddress, tokenId, poolId }) {
    const { value: amountToUse, address } = targets[0];
    const utxos = getUtxoAvailable(utxosTotal);
    const fee = await this.calculateFee(utxosTotal, address, changeAddress, amountToUse, feeRate, tokenId);

    const amountToUseFinaleCoin = !tokenId ? BigInt(amountToUse) + BigInt(fee) : BigInt(fee);
    const amountToUseFinaleToken = tokenId ? BigInt(amountToUse) : BigInt(0);
    const totalAmountCoin = !poolId ? totalUtxosAmount(utxos) : BigInt(0);
    const totalAmountToken = tokenId ? totalUtxosAmount(utxos, tokenId) : BigInt(0);
    if (totalAmountCoin < BigInt(amountToUseFinaleCoin) && !poolId) {
      throw new Error('Insufficient ML');
    }
    if (totalAmountToken < BigInt(amountToUseFinaleToken)) {
      throw new Error('Insufficient Tokens');
    }

    const utxoCoin = utxos.filter((utxo) => utxo.utxo.value.type === 'Coin');
    const utxoToken = tokenId ? utxos.filter((utxo) => utxo.utxo.value.token_id === tokenId) : [];

    const { inputs, outputs, optUtxos, requireUtxo } = await this._buildInputsAndOutputs({ tokenId, utxoCoin, utxoToken, amountToUseFinaleCoin, amountToUseFinaleToken, address, changeAddress, fee });

    return { inputs, outputs, optUtxos, requireUtxo, fee, amount: amountToUse };
  }

  async calculateFee(utxosTotal, address, changeAddress, amountToUse, feeRate, tokenId) {
    const utxos = getUtxoAvailable(utxosTotal);

    let amountToUseFinaleCoin = !tokenId ? BigInt(amountToUse) : BigInt(0);
    const amountToUseFinaleToken = tokenId ? BigInt(amountToUse) : BigInt(0);
    const totalAmountCoin = totalUtxosAmount(utxos);
    const totalAmountToken = tokenId ? totalUtxosAmount(utxos, tokenId) : BigInt(0);
    if (totalAmountCoin < BigInt(amountToUseFinaleCoin)) {
      throw new Error('Insufficient ML');
    }
    if (totalAmountToken < BigInt(amountToUseFinaleToken)) {
      throw new Error('Insufficient Tokens');
    }

    const utxoCoin = utxos.filter((utxo) => utxo.utxo.value.type === 'Coin');
    const utxoToken = tokenId ? utxos.filter((utxo) => utxo.utxo.value.token_id === tokenId) : [];

    const { inputs, outputs, requireUtxo } = await this._buildInputsAndOutputs({ tokenId, utxoCoin, utxoToken, amountToUseFinaleCoin, amountToUseFinaleToken, address, changeAddress });
    const addressList = getUtxoAddress(requireUtxo);
    const size = await ML.getEstimatetransactionSize(inputs, addressList, outputs, this.network);
    const fee = Math.ceil(feeRate * size);

    amountToUseFinaleCoin = !tokenId ? BigInt(amountToUse) + BigInt(fee) : BigInt(fee);
    const { inputs: newInputs, outputs: newOutputs, requireUtxo: newRequireUtxo } = await this._buildInputsAndOutputs({ tokenId, utxoCoin, utxoToken, amountToUseFinaleCoin, amountToUseFinaleToken, address, changeAddress, fee });
    const newAddressList = getUtxoAddress(newRequireUtxo);
    const newSize = await ML.getEstimatetransactionSize(newInputs, newAddressList, newOutputs, this.network);
    const newFee = Math.ceil(feeRate * newSize);
    return newFee;
  }

  async _buildInputsAndOutputs({ tokenId, utxoCoin, utxoToken, amountToUseFinaleCoin, amountToUseFinaleToken, address, changeAddress, fee = 0 }) {
    const requireUtxoCoin = getTransactionUtxos({ utxos: utxoCoin, amount: amountToUseFinaleCoin });
    const requireUtxoToken = tokenId ? getTransactionUtxos({ utxos: utxoToken, amount: amountToUseFinaleToken, tokenId }) : [];
    const requireUtxo = [...requireUtxoCoin, ...requireUtxoToken];
    const transactionStrings = getUtxoTransactions(requireUtxo);
    const transactionBytes = getTransactionsBytes(transactionStrings);
    const outpointedSourceIds = await getOutpointedSourceIds(transactionBytes);
    const inputs = await getTxInputs(outpointedSourceIds);
    const inputsArray = inputs.flat();
    const txOutput = await getTxOutput({
      amount: tokenId ? amountToUseFinaleToken.toString() : (amountToUseFinaleCoin - BigInt(fee)).toString(),
      address,
      networkType: this.network,
      // poolId,
      // delegationId,
      tokenId,
    });

    const changeAmountCoin = (totalUtxosAmount(requireUtxoCoin) - Number(amountToUseFinaleCoin)).toString();
    const txChangeOutputCoin = await getTxOutput({
      amount: changeAmountCoin,
      address: changeAddress,
      networkType: this.network,
    });

    const changeAmountToken = (totalUtxosAmount(requireUtxoToken, tokenId) - Number(amountToUseFinaleToken)).toString();

    const txChangeOutputToken = tokenId
      ? await getTxOutput({
          amount: changeAmountToken,
          address: changeAddress,
          networkType: this.network,
          tokenId,
        })
      : [];
    const txChangeOutput = [...txChangeOutputCoin, ...txChangeOutputToken];

    const outputs = [...txOutput, ...txChangeOutput];
    const optUtxos = await getOptUtxos(requireUtxo.flat(), this.network);

    return { inputs: inputsArray, outputs, optUtxos, requireUtxo };
  }

  async broadcastTx(transactionHex) {
    const result = await broadcastTransaction(transactionHex, this.network);
    return result;
  }

  async createTransaction(utxos, targets, feeRate, changeAddress, tokenId, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');

    try {
      const { inputs, outputs, optUtxos, requireUtxo, fee, amount } = await this.coinselect({ utxosTotal: utxos, targets, feeRate, changeAddress, tokenId });
      const transaction = await ML.getTransaction(inputs, outputs);
      const walletPrivKeys = await this._getWalletPrivKeysList();
      const keysList = {
        ...walletPrivKeys.mlReceivingPrivKeys,
        ...walletPrivKeys.mlChangePrivKeys,
      };
      const encodedWitnesses = await getEncodedWitnesses(
        requireUtxo,
        keysList,
        transaction,
        optUtxos, // in fact that is transaction inputs
        this.network,
      );

      const encodeW = encodedWitnesses.map((arr) => new Uint8Array(arr));
      const finalWitnesses = getArraySpead(encodeW);
      const encodedSignedTransaction = await ML.getEncodedSignedTransaction(transaction, finalWitnesses);
      const transactionHex = getTransactionHex(encodedSignedTransaction);
      const outputsObj = [{ ...targets[0], value: amount }];
      return { tx: transactionHex, outputs: outputsObj, fee, requireUtxo };
    } catch (e) {
      console.error('createTransaction err', e);
      throw e;
    }
  }

  isAddressValid(address) {
    return true;
  }

  async wasEverUsed() {
    const txs = await this._getAddressTransactionIds(this._getExternalAddressByIndexAsync(0));
    return txs.length > 0;
  }

  async getAddressAsync() {
    // looking for free external address
    let freeAddress = '';
    let c = 0;
    for (c of range(0, this.gap_limit + 1)) {
      if (this.next_free_address_index + c < 0) continue;
      const address = await this._getExternalAddressByIndexAsync(this.next_free_address_index + c);
      this.external_addresses_cache[this.next_free_address_index + c] = address; // updating cache just for any case
      let txs = [];
      try {
        txs = await this._getAddressTransactionIds(address);
      } catch (err) {
        console.warn('_getAddressTransactionIds', err.message);
      }
      if (txs.length === 0) {
        // found free address
        freeAddress = address;
        this.next_free_address_index += c; // now points to _this one_
        break;
      }
    }

    if (!freeAddress) {
      // could not find in cycle above, give up
      freeAddress = await this._getExternalAddressByIndexAsync(this.next_free_address_index + c); // we didnt check this one, maybe its free
      this.next_free_address_index += c; // now points to this one
    }
    this._address = freeAddress;
    return freeAddress;
  }

  async getChangeAddressAsync() {
    // looking for free internal address
    let freeAddress = '';
    let c = 0;
    for (c of range(0, this.gap_limit + 1)) {
      if (this.next_free_change_address_index + c < 0) continue;
      const address = this._getInternalAddressByIndex(this.next_free_change_address_index + c);
      this.internal_addresses_cache[this.next_free_change_address_index + c] = address; // updating cache just for any case
      let txs = [];
      try {
        txs = await this._getAddressTransactionIds(address);
      } catch (err) {
        console.warn('_getAddressTransactionIds()', err.message);
      }
      if (txs.length === 0) {
        // found free address
        freeAddress = address;
        this.next_free_change_address_index += c; // now points to _this one_
        break;
      }
    }

    if (!freeAddress) {
      // could not find in cycle above, give up
      freeAddress = this._getInternalAddressByIndex(this.next_free_change_address_index + c); // we didnt check this one, maybe its free
      this.next_free_change_address_index += c; // now points to this one
    }
    this._address = freeAddress;
    return freeAddress;
  }

  _getExternalAddressByIndexAsync(index) {
    return this._getNodeAddressByIndexAsync(0, index);
  }

  _getInternalAddressByIndexAsync(index) {
    return this._getNodeAddressByIndexAsync(1, index);
  }

  async _getNodeAddressByIndexAsync(node, index) {
    index = index * 1; // cast to int

    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    let address;
    if (node === 0) {
      const privateKey = await ML.getPrivateKeyFromMnemonic(this.secret, this.network);
      const addressPrivateKey = await ML.getReceivingAddress(privateKey, index);
      const pubKey = await ML.getPublicKeyFromPrivate(addressPrivateKey);
      address = await ML.getAddressFromPubKey(pubKey, this.network);
      this.external_addresses_cache[index] = address;
    }

    if (node === 1) {
      const privateKey = await ML.getPrivateKeyFromMnemonic(this.secret, this.network);
      const addressPrivateKey = await ML.getChangeAddress(privateKey, index);
      const pubKey = await ML.getPublicKeyFromPrivate(addressPrivateKey);
      address = await ML.getAddressFromPubKey(pubKey, this.network);
      this.internal_addresses_cache[index] = address;
    }

    return address;
  }

  async _getWalletPrivKeysList() {
    const generatePrivKeys = async (privateKey, addressGenerator, length) => {
      const privKeys = await Promise.all(Array.from({ length }, (_, i) => addressGenerator(privateKey, i)));

      const publicKeys = await Promise.all(privKeys.map((privKey) => ML.getPublicKeyFromPrivate(privKey)));
      const addresses = await Promise.all(publicKeys.map((pubKey) => ML.getAddressFromPubKey(pubKey, this.network)));
      const addressPrivKeyPairs = addresses.reduce((acc, address, index) => {
        acc[address] = privKeys[index];
        return acc;
      }, {});

      return addressPrivKeyPairs;
    };

    const privateKey = await ML.getPrivateKeyFromMnemonic(this.secret, this.network);
    const generateReceivingPrivKeysPrms = generatePrivKeys(privateKey, ML.getReceivingAddress, this.next_free_address_index + 1);
    const generateChangePrivKeysPrms = generatePrivKeys(privateKey, ML.getChangeAddress, this.next_free_change_address_index + 1);
    const [mlReceivingPrivKeys, mlChangePrivKeys] = await Promise.all([generateReceivingPrivKeysPrms, generateChangePrivKeysPrms]);

    return { mlReceivingPrivKeys, mlChangePrivKeys };
  }

  _getExternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(0, index);
  }

  _getInternalAddressByIndex(index) {
    return this._getNodeAddressByIndex(1, index);
  }

  _getNodeAddressByIndex(node, index) {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) {
        return this.external_addresses_cache[index];
      }
      throw Error(`No external cached address #${index}`);
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) {
        return this.internal_addresses_cache[index];
      } else {
        throw Error(`No internal cached address #${index}`);
      }
    }
  }

  async _multiGetBalanceByAddress(addresses) {
    const balancePromises = addresses.map((address) => this._getAddressBalance(address));
    const balances = await Promise.all(balancePromises);
    return addresses.reduce(
      (acc, item, index) => {
        acc.addresses[item] = { confirmed: balances[index].balanceInAtoms, unconfirmed: 0, locked: balances[index].lockedBalanceInAtoms };
        return acc;
      },
      { addresses: {} },
    );
  }

  async _getAddressBalance(address) {
    try {
      const response = await getAddressData(address, this.network);
      const data = JSON.parse(response);
      const balance = {
        balanceInAtoms: data.coin_balance.atoms,
        lockedBalanceInAtoms: data.locked_coin_balance.atoms,
      };
      return balance;
    } catch (error) {
      return { balanceInAtoms: 0, lockedBalanceInAtoms: 0 };
    }
  }

  async _getWalletTransactions(addresses) {
    const txids = await this._getWalletTransactionIds(addresses);
    const transactionsPromises = txids.map((txid) => getTransactionData(txid, this.network));
    const transactionsData = await Promise.all(transactionsPromises);

    return txids.reduce((acc, txid, index) => {
      acc[txid] = transactionsData[index];
      return acc;
    }, {});
  }

  async _getWalletTransactionIds(addresses) {
    const receivingTransactionsPromises = addresses.map((address) => this._getAddressTransactionIds(address));
    const receivingTransactions = await Promise.all(receivingTransactionsPromises);
    return receivingTransactions.flat();
  }

  async _multiGetHistoryByAddress(addresses) {
    const receivingTransactionsPromises = addresses.map((address) => this._getAddressTransactionIds(address));
    const receivingTransactions = await Promise.all(receivingTransactionsPromises);
    return addresses.reduce((acc, item, index) => {
      acc[item] = receivingTransactions[index];
      return acc;
    }, {});
  }

  async _getAddressTransactionIds(address) {
    try {
      const response = await getAddressData(address, this.network);
      const data = JSON.parse(response);
      return data.transaction_history;
    } catch (error) {
      return [];
    }
  }

  allowSignVerifyMessage() {
    return false;
  }

  allowSend() {
    return true;
  }
}
