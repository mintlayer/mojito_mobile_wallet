import * as bip39 from 'bip39';
import * as ML from '../../blue_modules/mintlayer/mintlayer';
import { AbstractHDWallet } from './abstract-hd-wallet';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import { broadcastTransaction, getAddressData, getAddressUtxo, getTransactionData, ML_NETWORK_TYPES } from '../../blue_modules/Mintlayer';
import { range } from '../../utils/Array';
import { getArraySpead, getEncodedWitnesses, getOptUtxos, getOutpointedSourceIds, getTransactionHex, getTransactionsBytes, getTransactionUtxos, getTxInputs, getTxOutput, getUtxoAvailable, getUtxoTransactions, totalUtxosAmount } from '../../utils/ML/transaction';

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

    this.preferredBalanceUnit = MintlayerUnit.ML;
    this.gapLimit = 20;
    this.network = (opts && opts.network) || ML_NETWORK_TYPES.MAINNET;
  }

  getPreferredBalanceUnit() {
    for (const value of Object.values(MintlayerUnit)) {
      if (value === this.preferredBalanceUnit) {
        return this.preferredBalanceUnit;
      }
    }
    return MintlayerUnit.ML;
  }

  changePreferredBalanceUnit() {
    this.preferredBalanceUnit = this.getPreferredBalanceUnit() === MintlayerUnit.ML ? MintlayerUnit.LOCAL_CURRENCY : MintlayerUnit.ML;
  }

  async generateMnemonicFromEntropy(entropy) {
    this.secret = bip39.entropyToMnemonic(entropy);
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
      await this._prefetchAddresses();
      await this._fetchBalance();
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

    for (let c = this.next_free_address_index; c < this.next_free_address_index + this.gap_limit; c++) {
      const address = this._getExternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_address_index = c + 1;
      }
    }

    for (let c = this.next_free_change_address_index; c < this.next_free_change_address_index + this.gap_limit; c++) {
      const address = this._getInternalAddressByIndex(c);
      if (txs[address] && Array.isArray(txs[address]) && txs[address].length > 0) {
        // whoa, someone uses our wallet outside! better catch up
        this.next_free_change_address_index = c + 1;
      }
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
      if (!tx.timestamp) tx.received = +new Date() - 30 * 1000; // unconfirmed
      tx.confirmations = Number(tx.confirmations) || 0; // unconfirmed
      tx.hash = tx.txid;
      tx.value = 0;

      for (const vin of tx.inputs) {
        // if input (spending) goes from our address - we are loosing!
        if (vin.utxo.destination && ownedAddressesHashmap[vin.utxo.destination]) {
          tx.value -= Number(vin.utxo.value.amount.atoms);
        }
      }

      for (const vout of tx.outputs) {
        // when output goes to our address - this means we are gaining!
        if (vout.destination && ownedAddressesHashmap[vout.destination]) {
          tx.value += Number(vout.value.amount.atoms);
        }
      }
      ret.push(tx);
    }

    // now, deduplication:
    const usedTxIds = {};
    const ret2 = [];
    for (const tx of ret) {
      if (!usedTxIds[tx.id]) ret2.push(tx);
      usedTxIds[tx.id] = 1;
    }

    return ret2.sort(function (a, b) {
      return b.received - a.received;
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
      this._txs_by_external_index[c] = this._txs_by_external_index[c] || [];
      for (const tx of this._txs_by_external_index[c]) hasUnconfirmed = hasUnconfirmed || !tx.confirmations || tx.confirmations < 7;

      if (hasUnconfirmed || this._txs_by_external_index[c].length === 0 || this._balances_by_external_index[c].u !== 0) {
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
          if (vin.utxo.destination && vin.utxo.destination === this._getExternalAddressByIndex(c)) {
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
          if (vin.utxo.destination && vin.utxo.destination === this._getInternalAddressByIndex(c)) {
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

    this._lastTxFetch = +new Date();
  }

  async fetchUtxo() {
    // fetching utxo of addresses that only have some balance
    let addressess = [];

    // considering confirmed balance:
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._balances_by_external_index[c] && this._balances_by_external_index[c].c && this._balances_by_external_index[c].c > 0) {
        addressess.push(this._getExternalAddressByIndex(c));
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].c && this._balances_by_internal_index[c].c > 0) {
        addressess.push(this._getInternalAddressByIndex(c));
      }
    }

    // considering UNconfirmed balance:
    for (let c = 0; c < this.next_free_address_index + this.gap_limit; c++) {
      if (this._balances_by_external_index[c] && this._balances_by_external_index[c].u && this._balances_by_external_index[c].u > 0) {
        addressess.push(this._getExternalAddressByIndex(c));
      }
    }
    for (let c = 0; c < this.next_free_change_address_index + this.gap_limit; c++) {
      if (this._balances_by_internal_index[c] && this._balances_by_internal_index[c].u && this._balances_by_internal_index[c].u > 0) {
        addressess.push(this._getInternalAddressByIndex(c));
      }
    }

    addressess = [...new Set(addressess)]; // deduplicate just for any case
    const fetchedUtxo = await this._multiGetUtxoByAddress(addressess);
    const parsedUtxos = fetchedUtxo.map((utxo) => JSON.parse(utxo)).filter((utxo) => utxo.length > 0);

    this._utxo = parsedUtxos;
  }

  getUtxo(respectFrozen = false) {
    let ret = [];

    if (this._utxo?.length !== 0) {
      ret = this._utxo;
    }
    if (!respectFrozen) {
      ret = ret.filter(({ txid, vout }) => !this.getUTXOMetadata(txid, vout).frozen);
    }
    return ret;
  }

  async _multiGetUtxoByAddress(addresses) {
    const utxosPromises = addresses.map((address) => getAddressUtxo(address, this.network));
    const receivingUtxos = Promise.all(utxosPromises);
    return receivingUtxos;
  }

  async coinselect(utxosTotal, targets, feeRate, changeAddress) {
    const { value: amountToUse, address } = targets[0];
    const utxos = getUtxoAvailable(utxosTotal);
    const totalAmount = totalUtxosAmount(utxos);
    const fee = await this.calculateFee(utxosTotal, address, changeAddress, amountToUse, feeRate);

    let amount = amountToUse;
    if (totalAmount < Number(amountToUse) + fee) {
      amount = totalAmount - fee;
    }

    const { inputs, outputs, optUtxos, requireUtxo } = await this._buildInputsAndOutputs({ utxos, amount, address, changeAddress, fee });

    return { inputs, outputs, optUtxos, requireUtxo, fee, amount };
  }

  async calculateFee(utxosTotal, address, changeAddress, amountToUse, feeRate) {
    const utxos = getUtxoAvailable(utxosTotal);
    const totalAmount = totalUtxosAmount(utxos);
    if (totalAmount < Number(amountToUse)) {
      throw new Error('Insufficient funds');
    }
    const { inputs, outputs, optUtxos } = await this._buildInputsAndOutputs({ utxos, amount: amountToUse, address, changeAddress });
    const size = await ML.getEstimatetransactionSize(inputs, optUtxos, outputs);
    const fee = Math.ceil(feeRate * size);

    return fee;
  }

  async _buildInputsAndOutputs({ utxos, amount, address, changeAddress, fee = 0 }) {
    const requireUtxo = getTransactionUtxos(utxos, amount, fee);
    const transactionStrings = getUtxoTransactions(requireUtxo);
    const transactionBytes = getTransactionsBytes(transactionStrings);
    const outpointedSourceIds = await getOutpointedSourceIds(transactionBytes);
    const inputs = await getTxInputs(outpointedSourceIds);
    const inputsArray = getArraySpead(inputs);
    const txOutput = await getTxOutput(amount.toString(), address, this.network);
    const changeAmount = (totalUtxosAmount(requireUtxo) - Number(amount) - fee).toString();
    const txChangeOutput = await getTxOutput(changeAmount, changeAddress, this.network);
    const outputs = [...txOutput, ...txChangeOutput];
    const optUtxos = await getOptUtxos(requireUtxo.flat(), this.network);

    return { inputs: inputsArray, outputs, optUtxos, requireUtxo };
  }

  async broadcastTx(transactionHex) {
    const result = await broadcastTransaction(transactionHex, this.network);
    return result;
  }

  async createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    if (targets.length === 0) throw new Error('No destination provided');

    try {
      const { inputs, outputs, optUtxos, requireUtxo, fee, amount } = await this.coinselect(utxos, targets, feeRate, changeAddress);
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
      return { tx: transactionHex, outputs: outputsObj, fee };
    } catch (e) {
      console.log('coinselect err', e);
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
      throw Error('no cached address');
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) {
        return this.internal_addresses_cache[index];
      } else {
        throw Error('no cached address');
      }
    }
  }

  async _multiGetBalanceByAddress(addresses) {
    const balancePromises = addresses.map((address) => this._getAddressBalance(address));
    const balances = await Promise.all(balancePromises);
    return addresses.reduce(
      (acc, item, index) => {
        acc.addresses[item] = { confirmed: balances[index].balanceInAtoms, unconfirmed: 0 };
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
      };
      return balance;
    } catch (error) {
      return { balanceInAtoms: 0 };
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
