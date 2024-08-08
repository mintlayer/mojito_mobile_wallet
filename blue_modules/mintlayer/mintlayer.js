import BigInt from 'big-integer';
import { SignatureHashType, SourceId } from './@mintlayerlib-js/wasm_wrappers';
import webviewEventBus from '../../class/webview-event-bus';
import * as Mintlayer from '../Mintlayer';

const NETWORKS = {
  mainnet: 0,
  testnet: 1,
  regtest: 2,
  signet: 3,
};

const wasmMethods = {
  public_key_from_private_key: 'public_key_from_private_key',
  make_receiving_address: 'make_receiving_address',
  pubkey_to_pubkeyhash_address: 'pubkey_to_pubkeyhash_address',
  make_default_account_privkey: 'make_default_account_privkey',
  make_change_address: 'make_change_address',
  encode_outpoint_source_id: 'encode_outpoint_source_id',
  encode_input_for_utxo: 'encode_input_for_utxo',
  encode_output_transfer: 'encode_output_transfer',
  encode_output_token_transfer: 'encode_output_token_transfer',
  encode_transaction: 'encode_transaction',
  encode_witness: 'encode_witness',
  encode_signed_transaction: 'encode_signed_transaction',
  estimate_transaction_size: 'estimate_transaction_size',
  encode_lock_until_time: 'encode_lock_until_time',
  encode_lock_until_height: 'encode_lock_until_height',
  encode_output_lock_then_transfer: 'encode_output_lock_then_transfer',
  staking_pool_spend_maturity_block_count: 'staking_pool_spend_maturity_block_count',
  encode_lock_for_block_count: 'encode_lock_for_block_count',
  encode_output_create_delegation: 'encode_output_create_delegation',
  encode_output_delegate_staking: 'encode_output_delegate_staking',
  encode_input_for_withdraw_from_delegation: 'encode_input_for_withdraw_from_delegation',
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
  return webviewEventBus.exec(wasmMethods.pubkey_to_pubkeyhash_address, [pubkey, network]);
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

export const getOutputs = async ({ amount, address, networkType, type = 'Transfer', lock, chainTip, tokenId, poolId, delegationId }) => {
  if (type === 'LockThenTransfer' && !lock) {
    throw new Error('LockThenTransfer requires a lock');
  }

  const networkIndex = NETWORKS[networkType];
  if (type === 'Transfer') {
    if (tokenId) {
      return webviewEventBus.exec(wasmMethods.encode_output_token_transfer, [amount, address, tokenId, networkIndex]);
    } else {
      return webviewEventBus.exec(wasmMethods.encode_output_transfer, [amount, address, networkIndex]);
    }
  }
  if (type === 'LockThenTransfer') {
    let lockEncoded;
    if (lock.type === 'UntilTime') {
      lockEncoded = await webviewEventBus.exec(wasmMethods.encode_lock_until_time, [BigInt(lock.content.timestamp)]);
    }
    if (lock.type === 'ForBlockCount') {
      lockEncoded = await webviewEventBus.exec(wasmMethods.encode_lock_for_block_count, [BigInt(lock.content)]);
    }

    return webviewEventBus.exec(wasmMethods.encode_output_lock_then_transfer, [amount, address, lockEncoded, networkIndex]);
  }
  if (type === 'spendFromDelegation') {
    const chainTip = await Mintlayer.getChainTip(networkType);
    const blockHeight = JSON.parse(chainTip).block_height;
    const stakingMaturity = await webviewEventBus.exec(wasmMethods.staking_pool_spend_maturity_block_count, [BigInt(blockHeight), networkIndex]);
    const encodedLockForBlock = await webviewEventBus.exec(wasmMethods.encode_lock_for_block_count, [BigInt(stakingMaturity)]);
    return webviewEventBus.exec(wasmMethods.encode_output_lock_then_transfer, [amount, address, encodedLockForBlock, networkIndex]);
  }
  if (type === 'CreateDelegationId') {
    if (!poolId) {
      throw new Error('Pool ID is required for CreateDelegationId');
    }
    return webviewEventBus.exec(wasmMethods.encode_output_create_delegation, [poolId, address, networkIndex]);
  }
  if (type === 'DelegateStaking') {
    if (!delegationId) {
      throw new Error('Delegation ID is required for CreateDelegationId');
    }
    return webviewEventBus.exec(wasmMethods.encode_output_delegate_staking, [amount, delegationId, networkIndex]);
  }
};

export const getDelegationOutput = async ({ poolId, address, networkType }) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.encode_output_create_delegation, [poolId, address, networkIndex]);
};

export const getStakingOutput = async ({ amount, delegationId, networkType }) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.encode_output_delegate_staking, [amount, delegationId, networkIndex]);
};

export const getStakingMaturity = async (blockHeight, networkType) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.staking_pool_spend_maturity_block_count, [BigInt(Number(blockHeight)), networkIndex]);
};

export const getTransaction = async (inputs, outputs) => {
  const flags = BigInt(0);
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

export const getEstimatetransactionSize = async (inputs, inputAddresses, outputs, networkType) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.estimate_transaction_size, [inputs, inputAddresses, outputs, networkIndex]);
};

export const getAccountOutpointInput = async (delegationId, amount, nonce, networkType) => {
  const networkIndex = NETWORKS[networkType];
  return webviewEventBus.exec(wasmMethods.encode_input_for_withdraw_from_delegation, [delegationId, amount, BigInt(Number(nonce)), networkIndex]);
};
