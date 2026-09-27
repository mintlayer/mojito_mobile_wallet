const prefix = '/api/v2';

const MINTLAYER_ENDPOINTS = {
  GET_ADDRESS_DATA: '/address/:address',
  GET_TRANSACTION_DATA: '/transaction/:txid',
  GET_ADDRESS_UTXO: '/address/:address/spendable-utxos',
  POST_TRANSACTION: '/transaction',
  GET_FEES_ESTIMATES: '/feerate',
  GET_ADDRESS_DELEGATIONS: '/address/:address/delegations',
  GET_DELEGATION: '/delegation/:delegation',
  GET_CHAIN_TIP: '/chain/tip',
  GET_TOKEN_DATA: '/token/:token',
  GET_BLOCK_HASH: '/chain/:height',
  GET_BLOCK_DATA: '/block/:hash',
  GET_POOL_DATA: '/pool/:pool_id',
};

const ML_NETWORK_TYPES = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet',
};

const TransactionType = {
  Transfer: 'Transfer',
  LockThenTransfer: 'LockThenTransfer',
  CreateDelegationId: 'CreateDelegationId',
  DelegateStaking: 'DelegateStaking',
  CreateStakePool: 'CreateStakePool',
  TokenTransfer: 'TokenTransfer',
};

const ML_ATOMS_PER_COIN = 100000000000;

const MAINNET_MINTLAYER_SERVERS = ['https://api-server.mintlayer.org'];
const TESTNET_MINTLAYER_SERVERS = ['https://api-server-lovelace.mintlayer.org'];

const requestMintlayer = async (url, body = null, request = fetch) => {
  const method = body ? 'POST' : 'GET';

  const result = await request(url, { method, body });
  if (!result.ok) {
    const error = await result.json();

    if (error.error === 'Address not found') {
      return Promise.resolve(JSON.stringify({ coin_balance: { atoms: '0', decimal: '0' }, transaction_history: [] }));
    }

    // handle RPC error
    if (error.error.includes('Mempool error:')) {
      const errorMessage = error.error.split('Mempool error: ')[1].split('(')[0];
      throw new Error(errorMessage);
    }

    if (error.error) {
      console.error(error.error);
    }

    throw new Error('Request not successful');
  }
  const content = await result.text();
  return Promise.resolve(content);
};

const tryServers = async ({ endpoint, body = null, network }) => {
  const mintlayerServers = network === ML_NETWORK_TYPES.TESTNET ? TESTNET_MINTLAYER_SERVERS : MAINNET_MINTLAYER_SERVERS;
  for (let i = 0; i < mintlayerServers.length; i++) {
    try {
      const response = await requestMintlayer(mintlayerServers[i] + prefix + endpoint, body);
      return response;
    } catch (error) {
      console.warn(`${mintlayerServers[i] + prefix + endpoint} request failed: `, error);
      if (i === mintlayerServers.length - 1) {
        throw error;
      }
    }
  }
};

const getAddressData = (address, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_ADDRESS_DATA.replace(':address', address);
  return tryServers({ endpoint, network });
};

const getTransactionData = async (txid, network) => {
  try {
    const endpoint = MINTLAYER_ENDPOINTS.GET_TRANSACTION_DATA.replace(':txid', txid);
    const response = await tryServers({ endpoint, network });
    const data = JSON.parse(response);
    return { txid, ...data };
  } catch (error) {
    console.warn(`Failed to get data for transaction ${txid}: `, error);
    throw error;
  }
};

const getAddressUtxo = (address, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_ADDRESS_UTXO.replace(':address', address);
  return tryServers({ endpoint, network });
};

const getWalletUtxos = (addresses) => {
  const utxosPromises = addresses.map((address) => getAddressUtxo(address));
  return Promise.all(utxosPromises);
};

const getAddressDelegations = (address, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_ADDRESS_DELEGATIONS.replace(':address', address);
  return tryServers({ endpoint, network });
};

const getDelegation = (delegation, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_DELEGATION.replace(':delegation', delegation);
  return tryServers({ endpoint, network });
};

const getBlockDataByHeight = (height, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_BLOCK_HASH.replace(':height', height);
  return tryServers({ endpoint, network })
    .then(JSON.parse)
    .then((response) => {
      const endpoint = MINTLAYER_ENDPOINTS.GET_BLOCK_DATA.replace(':hash', response);
      return tryServers({ endpoint, network });
    });
};

const getWalletDelegations = (addresses, network) => {
  const delegationsPromises = addresses.map((address) => getAddressDelegations(address, network));
  return Promise.all(delegationsPromises).then((results) => results.flatMap(JSON.parse));
};
const getDelegationDetails = (delegations, network) => {
  const delegationsPromises = delegations.map((delegation) => getDelegation(delegation, network));
  return Promise.all(delegationsPromises).then((results) => results.flatMap(JSON.parse));
};
const getBlocksData = (heights, network) => {
  const heightsPromises = heights.map((height) => getBlockDataByHeight(height, network));
  return Promise.all(heightsPromises).then((results) => results.flatMap(JSON.parse));
};

const getChainTip = async (network) => {
  return tryServers({ endpoint: MINTLAYER_ENDPOINTS.GET_CHAIN_TIP, network });
};

const getFeesEstimates = async (network) => {
  return tryServers({ endpoint: MINTLAYER_ENDPOINTS.GET_FEES_ESTIMATES, network });
};

const broadcastTransaction = (transaction, network) => {
  return tryServers({ endpoint: MINTLAYER_ENDPOINTS.POST_TRANSACTION, body: transaction, network });
};

const getTokenData = async (token, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_TOKEN_DATA.replace(':token', token);
  return tryServers({ endpoint, network });
};

const getPool = async (pool_id, network) => {
  const endpoint = MINTLAYER_ENDPOINTS.GET_POOL_DATA.replace(':pool_id', pool_id);
  return tryServers({ endpoint, network });
};

const getPoolsData = async (pool_ids, network) => {
  const poolsPromises = pool_ids.map((pool_id) => getPool(pool_id, network));
  return Promise.all(poolsPromises).then((results) => results.flatMap(JSON.parse));
};

export { TransactionType, getAddressData, getTransactionData, getAddressUtxo, getWalletUtxos, broadcastTransaction, getFeesEstimates, getChainTip, getTokenData, getWalletDelegations, getBlocksData, getDelegationDetails, getPoolsData, MINTLAYER_ENDPOINTS, ML_NETWORK_TYPES, ML_ATOMS_PER_COIN };
