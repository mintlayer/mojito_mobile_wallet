import * as ML from '../../blue_modules/mintlayer/mintlayer';

const getUtxoBalance = (utxo) => {
  return utxo.reduce((sum, item) => sum + Number(item.utxo.value.amount.atoms), 0);
};

const getUtxoAvailable = (utxo) => {
  const available = utxo
    .flatMap((utxo) => [...utxo])
    .filter((item) => item.utxo.value)
    .reduce((acc, item) => {
      acc.push(item);
      return acc;
    }, []);

  return available.map((item) => [item]);
};

const getUtxoTransaction = (utxo) => {
  return utxo.map((item) => ({
    transaction: item.outpoint.source_id,
    index: item.outpoint.index,
  }));
};

const getUtxoTransactionsBytes = (transactions) => {
  return transactions.map((transaction) => {
    return {
      bytes: Buffer.from(transaction.transaction, 'hex'),
      index: transaction.index,
    };
  });
};

const getOutpointedSourceId = async (transactionsBytes) => {
  return await Promise.all(
    transactionsBytes.map(async (transaction) => {
      return {
        sourcedID: await ML.getEncodedOutpointSourceId(transaction.bytes),
        index: transaction.index,
      };
    }),
  );
};

const getTxInput = async (outpointSourceId) => {
  return await Promise.all(
    outpointSourceId.map((outpoint) => {
      return ML.getTxInput(outpoint.sourcedID, outpoint.index);
    }),
  );
};

const getTransactionUtxos = (utxos, amountToUse, fee = 0) => {
  let balance = 0;
  const utxosToSpend = [];

  for (let i = 0; i < utxos.length; i++) {
    const utxoBalance = getUtxoBalance(utxos[i]);
    if (balance < Number(amountToUse) + fee) {
      balance += utxoBalance;
      utxosToSpend.push(utxos[i]);
    } else {
      break;
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

const getTxOutput = async (amount, address, networkType, poolId, delegationId) => {
  return await ML.getOutputs({
    amount,
    address,
    networkType,
  });
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

const totalUtxosAmount = (utxosToSpend) => {
  return utxosToSpend
    .flatMap((utxo) => [...utxo])
    .reduce((acc, utxo) => {
      const amount = utxo.utxo.value ? Number(utxo.utxo.value.amount.atoms) : 0;
      return acc + amount;
    }, 0);
};

const getUtxoAddress = (utxosToSpend) => {
  return utxosToSpend.flatMap((utxo) => [...utxo]).map((utxo) => utxo.utxo.destination);
};

export { getUtxoBalance, getUtxoTransaction, getUtxoTransactionsBytes, getOutpointedSourceId, getTransactionUtxos, getUtxoTransactions, getTransactionsBytes, getOutpointedSourceIds, getTxInputs, getTxOutput, getTransactionHex, getOptUtxos, getEncodedWitnesses, getArraySpead, getUtxoAvailable, totalUtxosAmount, getUtxoAddress };
