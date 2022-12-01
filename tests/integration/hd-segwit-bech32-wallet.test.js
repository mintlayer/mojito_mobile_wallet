import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Bech32 Segwit HD (BIP84)', () => {
  it.each([false, true])('can fetch balance, transactions & utxo, disableBatching=%p', async function (disableBatching) {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    if (disableBatching) BlueElectrum.setBatchingDisabled();

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    // assert.strictEqual('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP', hd.getXpub());
    assert.strictEqual(hd.getXpub(), 'zpub6qxbUmJYt5ZSzscp17EtoewP6xXpvsjrjQ9Evvr9EaNfawisALZrFofuNUVEtnw5kJ2gALD9k4g45SsWdY89dRCFpEo67U4ShDapR5eYUWM');
    console.log('hd.getXpub() ******** : ', hd.getXpub());

    // assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p');
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qwv22t0sv3757l86esvd0frysf8y8wd7u5gzpr8');

    // assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qjs4u7m32ke4znm38y7kakp78t695wetnugap7l');

    // assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qerld76y8g50324ddc4aeyd2xkhsxj74nfacjtr');

    // assert.strictEqual(hd._getInternalAddressByIndex(1), 'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r');
    assert.strictEqual(hd._getInternalAddressByIndex(1), 'bc1q30mrwrnd9zc69ludsjgh6decynzrhnpcs32enq');

    // assert.ok(hd.weOwnAddress('bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p'));
    // assert.ok(hd.weOwnAddress('bc1qwv22t0sv3757l86esvd0frysf8y8wd7u5gzpr8'));

    // assert.ok(hd.weOwnAddress('BC1QVD6W54SYDC08Z3802SVKXR7297EZ7CUSD6266P'));
    // assert.ok(hd.weOwnAddress('bc1qwv22t0sv3757l86esvd0frysf8y8wd7u5gzpr8'));

    // assert.ok(hd.weOwnAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'));
    // assert.ok(!hd.weOwnAddress('1HjsSTnrwWzzEV2oi4r5MsAYENkTkrCtwL'));
    // assert.ok(!hd.weOwnAddress('garbage'));
    // assert.ok(!hd.weOwnAddress(false));

    assert.strictEqual(hd.timeToRefreshBalance(), true);
    assert.ok(hd._lastTxFetch === 0);
    assert.ok(hd._lastBalanceFetch === 0);

    await hd.fetchBalance();
    assert.ok(hd.getBalance() > 0);
    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(7));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(8));
    assert.strictEqual(hd.next_free_address_index, 7);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 7);
    assert.strictEqual(hd.next_free_change_address_index, 8);

    // now fetch txs
    await hd.fetchTransactions();
    assert.ok(hd._lastTxFetch > 0);
    assert.ok(hd._lastBalanceFetch > 0);
    assert.strictEqual(hd.timeToRefreshBalance(), false);
    assert.strictEqual(hd.getTransactions().length, 17);

    for (const tx of hd.getTransactions()) {
      assert.ok(tx.hash);
      // assert.strictEqual(tx.value, 608);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }

    // assert.ok(hd.weOwnTransaction('5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'));
    // assert.ok(hd.weOwnTransaction('ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d'));
    // assert.ok(!hd.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881'));

    // now fetch UTXO
    await hd.fetchUtxo();
    const utxo = hd.getUtxo();
    assert.strictEqual(utxo.length, 5);
    assert.ok(utxo[0].txId);
    assert.ok(utxo[0].vout === 0 || utxo[0].vout === 1);
    assert.ok(utxo[0].value);
    assert.ok(utxo[0].address);

    // now, reset HD wallet, and find free addresses from scratch:
    hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);

    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(7));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(8));
    assert.strictEqual(hd.next_free_address_index, 7);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 7);
    assert.strictEqual(hd.next_free_change_address_index, 8);
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });

  it('can catch up with externally modified wallet', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());

    await hd.fetchBalance();
    const oldBalance = hd.getBalance();

    await hd.fetchTransactions();
    const oldTransactions = hd.getTransactions();

    // now, mess with internal state, make it 'obsolete'

    // hd._txs_by_external_index['2'].pop();
    // hd._txs_by_internal_index['16'].pop();
    hd._txs_by_internal_index['2'] = [];
    hd._txs_by_external_index['2'] = [];
    console.log('hd._txs_by_external_index : ', hd._txs_by_external_index);
    console.log('hd._txs_by_internal_index : ', hd._txs_by_internal_index);

    for (let c = 17; c < 100; c++) hd._balances_by_internal_index[c] = { c: 0, u: 0 };
    hd._balances_by_external_index['2'].c = 1000000;

    assert.ok(hd.getBalance() !== oldBalance);
    assert.ok(hd.getTransactions().length !== oldTransactions.length);

    // now, refetch! should get back to normal

    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), oldBalance);
    await hd.fetchTransactions();
    assert.strictEqual(hd.getTransactions().length, oldTransactions.length);
  });

  it.skip('can work with faulty zpub', async () => {
    // takes too much time, skipped
    if (!process.env.FAULTY_ZPUB) {
      console.error('process.env.FAULTY_ZPUB not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = process.env.FAULTY_ZPUB;

    await hd.fetchBalance();
    await hd.fetchTransactions();

    assert.ok(hd.getTransactions().length >= 76);
  });

  it('can fetchBalance, fetchTransactions, fetchUtxo and create transactions', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());
    // assert.strictEqual(hd.getXpub(), 'zpub6qoWjSiZRHzSYPGYJ6EzxEXJXP1b2Rj9syWwJZFNCmupMwkbSAWSBk3UvSkJyQLEhQpaBAwvhmNj3HPKpwCJiTBB9Tutt46FtEmjL2DoU3J');
    assert.strictEqual(hd.getXpub(), 'zpub6qxbUmJYt5ZSzscp17EtoewP6xXpvsjrjQ9Evvr9EaNfawisALZrFofuNUVEtnw5kJ2gALD9k4g45SsWdY89dRCFpEo67U4ShDapR5eYUWM');

    let start = +new Date();
    await hd.fetchBalance();
    let end = +new Date();
    end - start > 5000 && console.warn('fetchBalance took', (end - start) / 1000, 'sec');

    assert.ok(hd.next_free_change_address_index > 0);
    assert.ok(hd.next_free_address_index > 0);
    assert.ok(hd.getNextFreeAddressIndex() > 0);

    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 15000 && console.warn('fetchTransactions took', (end - start) / 1000, 'sec');

    start = +new Date();
    await hd.fetchBalance();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchBalance took', (end - start) / 1000, 'sec');

    global.debug = true;
    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchTransactions took', (end - start) / 1000, 'sec');

    let txFound = 0;
    for (const tx of hd.getTransactions()) {
      if (tx.hash === '33dacb6a77d5e1b728cd5dc4ad252dcd94a84cbf26dd4675a0e729c26a5d05a3') {
        assert.strictEqual(tx.value, -846);
        assert.strictEqual(tx.inputs[0].addresses[0], 'bc1q30mrwrnd9zc69ludsjgh6decynzrhnpcs32enq');
        // assert.strictEqual(tx.inputs[1].addresses[0], 'bc1qtvh8mjcfdg9224nx4wu3sw7fmmtmy2k3jhdeul');
        // assert.strictEqual(tx.inputs[2].addresses[0], 'bc1qhe03zgvq4fmfw8l2qq2zu4dxyhgyukcz6k2a5w');
        txFound++;
      }
      // if (tx.hash === 'e112771fd43962abfe4e4623bf788d6d95ff1bd0f9b56a6a41fb9ed4dacc75f1') {
      //   assert.strictEqual(tx.value, 1000000);
      //   assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
      //   assert.strictEqual(tx.inputs[1].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
      //   txFound++;
      // }
      // if (tx.hash === 'c94bdec21c72d3441245caa164b00315b131f6b72513369f4be1b00b9fb99cc5') {
      //   assert.strictEqual(tx.inputs[0].addresses[0], '16Nf5X77RbFz9Mb6t2GFqxs3twQN1joBkD');
      //   txFound++;
      // }
      // if (tx.hash === '51fc225ddf24f7e124f034637f46442645ca7ea2c442b28124d4bcdd04e30195') {
      //   assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
      //   txFound++;
      // }
    }
    assert.strictEqual(txFound, 1);

    await hd.fetchUtxo();
    assert.ok(hd.getUtxo().length > 0);
    assert.strictEqual(hd.getDerivedUtxoFromOurTransaction().length, 5);
    const u1 = hd.getUtxo().find((utxo) => utxo.txid === '6d7d9dff147f04012b654e5c607a19c4871b9927cd914231dfb6f6a93e031da1');
    const u2 = hd.getDerivedUtxoFromOurTransaction().find((utxo) => utxo.txid === '6d7d9dff147f04012b654e5c607a19c4871b9927cd914231dfb6f6a93e031da1');
    delete u1.confirmations;
    delete u2.confirmations;
    delete u1.height;
    delete u2.height;
    assert.deepStrictEqual(u1, u2);
    const changeAddress = await hd.getChangeAddressAsync();
    assert.ok(changeAddress && changeAddress.startsWith('bc1'));

    const { tx, inputs, outputs, fee } = hd.createTransaction(hd.getUtxo(), [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 51000 }], 13, changeAddress);

    assert.strictEqual(Math.round(fee / tx.virtualSize()), 13);

    let totalInput = 0;
    for (const inp of inputs) {
      totalInput += inp.value;
    }

    assert.strictEqual(outputs.length, 2);
    let totalOutput = 0;
    for (const outp of outputs) {
      totalOutput += outp.value;
    }

    assert.strictEqual(totalInput - totalOutput, fee);
    assert.strictEqual(outputs[outputs.length - 1].address, changeAddress);
  });

  it('wasEverUsed() works', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(await hd.wasEverUsed());

    hd = new HDSegwitBech32Wallet();
    await hd.generate();
    assert.ok(!(await hd.wasEverUsed()), hd.getSecret());
  });
});
