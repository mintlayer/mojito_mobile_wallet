import BigInt from 'big-integer';

import * as ML from '../../blue_modules/mintlayer/mintlayer';

const getUtxoBalance = (item) => {
  return BigInt(item.utxo.value.amount.atoms);
};

const getUtxoAvailable = (utxo) => {
  const available = utxo
    .flatMap((utxo) => [...utxo])
    .filter((item) => item.utxo.value)
    .reduce((acc, item) => {
      acc.push(item);
      return acc;
    }, []);

  return available;
};

const getUtxoTransaction = (item) => {
  return {
    transaction: item.outpoint.source_id,
    index: item.outpoint.index,
  };
};

const getUtxoTransactionsBytes = (transaction) => {
  return {
    bytes: Buffer.from(transaction.transaction, 'hex'),
    index: transaction.index,
  };
};

const getOutpointedSourceId = async (transactionsBytes) => {
  return {
    sourcedID: await ML.getEncodedOutpointSourceId(transactionsBytes.bytes),
    index: transactionsBytes.index,
  };
};

const getTxInput = async (outpoint) => {
  return ML.getTxInput(outpoint.sourcedID, outpoint.index);
};

/**
 * Get utxos to spend
 * NOTE: This function require optimization to get UTXOs with the lowest amounts first or 50% lowest and 50% highest, see: https://arxiv.org/pdf/2311.01113.pdf
 * At this point there is a risk of not having enough UTXOs to spend because first picked UTXOs is equal to the amount to spend without fee
 * In that case backend will return error with proper fee amount wich is parsed and passed as override fee value.
 * Need to add some "backup" additional UTXO is AMOUNT is equal of UTXOs amount so that server error less likely to happen but I'm leaving it just to be sure
 * @param utxos
 * @param amount
 * @param tokenId
 * @returns {*[]}
 */
const getTransactionUtxos = ({ utxos, amount, tokenId }) => {
  let balance = BigInt(0);
  const utxosToSpend = [];
  let lastIndex = 0;

  for (let i = 0; i < utxos.length; i++) {
    lastIndex = i;
    const utxoBalance = getUtxoBalance(utxos[i], tokenId);
    if (utxoBalance && balance < BigInt(amount)) {
      balance += utxoBalance;
      utxosToSpend.push(utxos[i]);
    } else {
      break;
    }
  }

  if (balance === BigInt(amount)) {
    // pick up extra UTXO
    if (utxos[lastIndex + 1]) {
      utxosToSpend.push(utxos[lastIndex + 1]);
    }
  }

  return utxosToSpend;
};

const getUtxoTransactions = (utxos) => {
  const txTransactions = utxos.map((utxo) => {
    return getUtxoTransaction(utxo);
  });
  return txTransactions;
};

const getTransactionsBytes = (transactions) => {
  const transactionsBytes = transactions.map((transaction) => {
    return getUtxoTransactionsBytes(transaction);
  });
  return transactionsBytes;
};

const getOutpointedSourceIds = async (transactionBytes) => {
  const outpointSourceIds = await Promise.all(
    transactionBytes.map((transaction) => {
      return getOutpointedSourceId(transaction);
    }),
  );
  return outpointSourceIds;
};

const getTxInputs = async (outpointSourceIds) => {
  const txInputs = await Promise.all(
    outpointSourceIds.map((outpointSourceId) => {
      return getTxInput(outpointSourceId);
    }),
  );
  return txInputs;
};

const getTxOutput = ({ amount, address, networkType, poolId, delegationId, chainTip, tokenId }) => {
  let txOutput;
  if (poolId) {
    txOutput = ML.getDelegationOutput({ poolId, address, networkType });
  } else {
    if (delegationId) {
      txOutput = ML.getStakingOutput({ amount, delegationId, networkType });
    } else {
      txOutput = ML.getOutputs({ amount, address, networkType, chainTip, tokenId });
    }
  }
  return txOutput;
};

const getTransactionHex = (encodedSignedTransaction) => {
  return encodedSignedTransaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
};

const getOptUtxos = async (utxos, network) => {
  const opt_utxos = await Promise.all(
    utxos.map((item) => {
      return ML.getOutputs({
        amount: item.utxo.value.amount.atoms,
        address: item.utxo.destination,
        networkType: network,
        type: item.utxo.type,
        lock: item.utxo.lock,
        tokenId: item.utxo.value.token_id,
      });
    }),
  );

  const result = [];
  for (let i = 0; i < opt_utxos.length; i++) {
    result.push(1);
    result.push(...opt_utxos[i]);
  }

  return result;
};

const getEncodedWitnesses = async (
  utxos,
  keysList,
  transaction,
  opt_utxos,
  network,
  // eslint-disable-next-line max-params
) => {
  const data = utxos.flat();
  const encodedWitnesses = await Promise.all(
    data.map((utxo, index) => {
      const address = utxo.utxo.destination;
      const addressPrivkey = keysList[address];
      return ML.getEncodedWitness(addressPrivkey, address, transaction, opt_utxos, index, network);
    }),
  );
  return encodedWitnesses;
};

const getArraySpead = (inputs) => {
  const inputsArray = [];
  inputs.flat().forEach((input) => {
    input.forEach((item) => {
      inputsArray.push(item);
    });
  });
  return inputsArray;
};

const totalUtxosAmount = (utxosToSpend, token) => {
  return utxosToSpend.reduce((acc, utxo) => {
    const requiredToken = token ? utxo.utxo.value.token_id === token : utxo.utxo.value.type === 'Coin';
    const amount = utxo?.utxo?.value?.amount && requiredToken ? BigInt(utxo.utxo.value.amount.atoms) : BigInt(0);
    return acc + amount;
  }, BigInt(0));
};

const getUtxoAddress = (utxosToSpend) => {
  return utxosToSpend.map((utxo) => utxo.utxo.destination);
};

export { getUtxoBalance, getUtxoTransaction, getUtxoTransactionsBytes, getOutpointedSourceId, getTransactionUtxos, getUtxoTransactions, getTransactionsBytes, getOutpointedSourceIds, getTxInputs, getTxOutput, getTransactionHex, getOptUtxos, getEncodedWitnesses, getArraySpead, getUtxoAvailable, totalUtxosAmount, getUtxoAddress };
