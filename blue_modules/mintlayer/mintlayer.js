import bigInt from 'big-integer';
import { SignatureHashType, SourceId } from './@mintlayerlib-js/wasm_crypto.js';
import webviewEventBus from '../../class/webview-event-bus';

const NETWORKS = {
  mainnet: 0,
  testnet: 1,
  regtest: 2,
  signet: 3,
};

const wasmMethods = {
  public_key_from_private_key: 'public_key_from_private_key',
  make_receiving_address: 'make_receiving_address',
  pubkey_to_string: 'pubkey_to_string',
  make_default_account_privkey: 'make_default_account_privkey',
  make_change_address: 'make_change_address',
  encode_outpoint_source_id: 'encode_outpoint_source_id',
  encode_input_for_utxo: 'encode_input_for_utxo',
  encode_output_transfer: 'encode_output_transfer',
  encode_transaction: 'encode_transaction',
  encode_witness: 'encode_witness',
  encode_signed_transaction: 'encode_signed_transaction',
  estimate_transaction_size: 'estimate_transaction_size',
};

export const getPrivateKeyFromMnemonic = async (mnemonic, networkType) => {
  const networkIndex = NETWORKS[networkType];
  const arr = await webviewEventBus.exec(wasmMethods.make_default_account_privkey, [mnemonic, networkIndex]);
  return new Uint8Array(arr);
};

export const getReceivingAddress = async (defAccPrivateKey, keyIndex) => {
  const arr = await webviewEventBus.exec(wasmMethods.make_receiving_address, [defAccPrivateKey, keyIndex]);
  return new Uint8Array(arr);
};

export const getChangeAddress = async (defAccPrivateKey, keyIndex) => {
  const arr = await webviewEventBus.exec(wasmMethods.make_change_address, [defAccPrivateKey, keyIndex]);
  return new Uint8Array(arr);
};

export const getPublicKeyFromPrivate = async (privateKey) => {
  const arr = await webviewEventBus.exec(wasmMethods.public_key_from_private_key, [privateKey]);
  return new Uint8Array(arr);
};

export const getPubKeyString = (pubkey, network) => {
  return webviewEventBus.exec(wasmMethods.pubkey_to_string, [pubkey, network]);
};

export const getAddressFromPubKey = (pubKey, networkType) => {
  const networkIndex = NETWORKS[networkType];
  return getPubKeyString(pubKey, networkIndex);
};

export const getEncodedOutpointSourceId = async (txId) => {
  return webviewEventBus.exec(wasmMethods.encode_outpoint_source_id, [txId, SourceId.Transaction]);
};

export const getTxInput = async (outpointSourceId, index) => {
  return webviewEventBus.exec(wasmMethods.encode_input_for_utxo, [outpointSourceId, index]);
};

export const getOutputs = async ({ amount, address, networkType }) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.encode_output_transfer, [amount, address, networkIndex]);
};

export const getTransaction = async (inputs, outputs) => {
  const flags = bigInt(0);
  return webviewEventBus.exec(wasmMethods.encode_transaction, [inputs, outputs, flags]);
};

export const getEncodedWitness = async (
  privateKey,
  address,
  transaction,
  inputs,
  index,
  networkType,
  // eslint-disable-next-line max-params
) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.encode_witness, [SignatureHashType.ALL, privateKey, address, transaction, inputs, index, networkIndex]);
};

export const getEncodedSignedTransaction = async (transaction, witness) => {
  return webviewEventBus.exec(wasmMethods.encode_signed_transaction, [transaction, witness]);
};

export const getEstimatetransactionSize = async (inputs, optUtxos, outputs) => {
  return webviewEventBus.exec(wasmMethods.estimate_transaction_size, [inputs, optUtxos, outputs]);
};
