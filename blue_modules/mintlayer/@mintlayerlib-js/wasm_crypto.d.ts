/* tslint:disable */
/* eslint-disable */
/**
 * @returns {Uint8Array}
 */
export function make_private_key(): Uint8Array;
/**
 * Create the default account's extended private key for a given mnemonic
 * derivation path: 44'/mintlayer_coin_type'/0'
 * @param {string} mnemonic
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function make_default_account_privkey(mnemonic: string, network: Network): Uint8Array;
/**
 * From an extended private key create a receiving private key for a given key index
 * derivation path: 44'/mintlayer_coin_type'/0'/0/key_index
 * @param {Uint8Array} private_key_bytes
 * @param {number} key_index
 * @returns {Uint8Array}
 */
export function make_receiving_address(private_key_bytes: Uint8Array, key_index: number): Uint8Array;
/**
 * From an extended private key create a change private key for a given key index
 * derivation path: 44'/mintlayer_coin_type'/0'/1/key_index
 * @param {Uint8Array} private_key_bytes
 * @param {number} key_index
 * @returns {Uint8Array}
 */
export function make_change_address(private_key_bytes: Uint8Array, key_index: number): Uint8Array;
/**
 * @param {Uint8Array} public_key_bytes
 * @param {Network} network
 * @returns {string}
 */
export function pubkey_to_string(public_key_bytes: Uint8Array, network: Network): string;
/**
 * @param {Uint8Array} private_key
 * @returns {Uint8Array}
 */
export function public_key_from_private_key(private_key: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} private_key
 * @param {Uint8Array} message
 * @returns {Uint8Array}
 */
export function sign_message(private_key: Uint8Array, message: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} public_key
 * @param {Uint8Array} signature
 * @param {Uint8Array} message
 * @returns {boolean}
 */
export function verify_signature(public_key: Uint8Array, signature: Uint8Array, message: Uint8Array): boolean;
/**
 * @param {string} amount
 * @param {string} address
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_transfer(amount: string, address: string, network: Network): Uint8Array;
/**
 * @param {bigint} current_block_height
 * @param {Network} network
 * @returns {bigint}
 */
export function staking_pool_spend_maturity_block_count(current_block_height: bigint, network: Network): bigint;
/**
 * @param {bigint} num
 * @returns {Uint8Array}
 */
export function encode_lock_for_block_count(num: bigint): Uint8Array;
/**
 * @param {bigint} num
 * @returns {Uint8Array}
 */
export function encode_lock_for_seconds(num: bigint): Uint8Array;
/**
 * @param {bigint} num
 * @returns {Uint8Array}
 */
export function encode_lock_until_time(num: bigint): Uint8Array;
/**
 * @param {bigint} num
 * @returns {Uint8Array}
 */
export function encode_lock_until_height(num: bigint): Uint8Array;
/**
 * @param {string} amount
 * @param {string} address
 * @param {Uint8Array} lock
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_lock_then_transfer(amount: string, address: string, lock: Uint8Array, network: Network): Uint8Array;
/**
 * @param {string} amount
 * @returns {Uint8Array}
 */
export function encode_output_burn(amount: string): Uint8Array;
/**
 * @param {string} pool_id
 * @param {string} address
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_create_delegation(pool_id: string, address: string, network: Network): Uint8Array;
/**
 * @param {string} amount
 * @param {string} delegation_id
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_delegate_staking(amount: string, delegation_id: string, network: Network): Uint8Array;
/**
 * @param {string} value
 * @param {string} staker
 * @param {string} vrf_public_key
 * @param {string} decommission_key
 * @param {number} margin_ratio_per_thousand
 * @param {string} cost_per_block
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_stake_pool_data(value: string, staker: string, vrf_public_key: string, decommission_key: string, margin_ratio_per_thousand: number, cost_per_block: string, network: Network): Uint8Array;
/**
 * @param {string} pool_id
 * @param {Uint8Array} pool_data
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_create_stake_pool(pool_id: string, pool_data: Uint8Array, network: Network): Uint8Array;
/**
 * @param {string} authority
 * @param {Uint8Array} token_ticker
 * @param {Uint8Array} metadata_uri
 * @param {number} number_of_decimals
 * @param {TotalSupply} total_supply
 * @param {string} supply_amount
 * @param {FreezableToken} is_token_freezable
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_output_issue_fungible_token(authority: string, token_ticker: Uint8Array, metadata_uri: Uint8Array, number_of_decimals: number, total_supply: TotalSupply, supply_amount: string, is_token_freezable: FreezableToken, network: Network): Uint8Array;
/**
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function encode_output_data_deposit(data: Uint8Array): Uint8Array;
/**
 * @param {Uint8Array} id
 * @param {SourceId} source
 * @returns {Uint8Array}
 */
export function encode_outpoint_source_id(id: Uint8Array, source: SourceId): Uint8Array;
/**
 * @param {Uint8Array} outpoint_source_id
 * @param {number} output_index
 * @returns {Uint8Array}
 */
export function encode_input_for_utxo(outpoint_source_id: Uint8Array, output_index: number): Uint8Array;
/**
 * @param {string} delegation_id
 * @param {string} amount
 * @param {bigint} nonce
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_input_for_account_outpoint(delegation_id: string, amount: string, nonce: bigint, network: Network): Uint8Array;
/**
 * @param {Uint8Array} inputs
 * @param {Uint8Array} opt_utxos
 * @param {Uint8Array} outputs
 * @returns {number}
 */
export function estimate_transaction_size(inputs: Uint8Array, opt_utxos: Uint8Array, outputs: Uint8Array): number;
/**
 * @param {Uint8Array} inputs
 * @param {Uint8Array} outputs
 * @param {bigint} flags
 * @returns {Uint8Array}
 */
export function encode_transaction(inputs: Uint8Array, outputs: Uint8Array, flags: bigint): Uint8Array;
/**
 * @returns {Uint8Array}
 */
export function encode_witness_no_signature(): Uint8Array;
/**
 * @param {SignatureHashType} sighashtype
 * @param {Uint8Array} private_key_bytes
 * @param {string} address
 * @param {Uint8Array} transaction_bytes
 * @param {Uint8Array} inputs
 * @param {number} input_num
 * @param {Network} network
 * @returns {Uint8Array}
 */
export function encode_witness(sighashtype: SignatureHashType, private_key_bytes: Uint8Array, address: string, transaction_bytes: Uint8Array, inputs: Uint8Array, input_num: number, network: Network): Uint8Array;
/**
 * @param {Uint8Array} transaction_bytes
 * @param {Uint8Array} signatures
 * @returns {Uint8Array}
 */
export function encode_signed_transaction(transaction_bytes: Uint8Array, signatures: Uint8Array): Uint8Array;
/**
 */
export enum FreezableToken {
  No = 0,
  Yes = 1,
}
/**
 */
export enum SourceId {
  Transaction = 0,
  BlockReward = 1,
}
/**
 */
export enum Network {
  Mainnet = 0,
  Testnet = 1,
  Regtest = 2,
  Signet = 3,
}
/**
 */
export enum SignatureHashType {
  ALL = 0,
  NONE = 1,
  SINGLE = 2,
  ANYONECANPAY = 3,
}
/**
 */
export enum TotalSupply {
  Lockable = 0,
  Unlimited = 1,
  Fixed = 2,
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly make_private_key: (a: number) => void;
  readonly make_default_account_privkey: (a: number, b: number, c: number, d: number) => void;
  readonly make_receiving_address: (a: number, b: number, c: number, d: number) => void;
  readonly make_change_address: (a: number, b: number, c: number, d: number) => void;
  readonly pubkey_to_string: (a: number, b: number, c: number, d: number) => void;
  readonly public_key_from_private_key: (a: number, b: number, c: number) => void;
  readonly sign_message: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly verify_signature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly encode_output_transfer: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly staking_pool_spend_maturity_block_count: (a: number, b: number) => number;
  readonly encode_lock_for_block_count: (a: number, b: number) => void;
  readonly encode_lock_for_seconds: (a: number, b: number) => void;
  readonly encode_lock_until_time: (a: number, b: number) => void;
  readonly encode_lock_until_height: (a: number, b: number) => void;
  readonly encode_output_lock_then_transfer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly encode_output_burn: (a: number, b: number, c: number) => void;
  readonly encode_output_create_delegation: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly encode_output_delegate_staking: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly encode_stake_pool_data: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
  readonly encode_output_create_stake_pool: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly encode_output_issue_fungible_token: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
  readonly encode_output_data_deposit: (a: number, b: number, c: number) => void;
  readonly encode_outpoint_source_id: (a: number, b: number, c: number, d: number) => void;
  readonly encode_input_for_utxo: (a: number, b: number, c: number, d: number) => void;
  readonly encode_input_for_account_outpoint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly estimate_transaction_size: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly encode_transaction: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly encode_witness_no_signature: (a: number) => void;
  readonly encode_witness: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => void;
  readonly encode_signed_transaction: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly rustsecp256k1_v0_9_2_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_9_2_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_9_2_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_9_2_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {SyncInitInput} module
 *
 * @returns {InitOutput}
 */
export function initSync(module: SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {InitInput | Promise<InitInput>} module_or_path
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
