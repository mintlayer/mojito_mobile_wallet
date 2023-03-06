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

    assert.strictEqual(hd.getXpub(), 'zpub6qxbUmJYt5ZSzscp17EtoewP6xXpvsjrjQ9Evvr9EaNfawisALZrFofuNUVEtnw5kJ2gALD9k4g45SsWdY89dRCFpEo67U4ShDapR5eYUWM');

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qwv22t0sv3757l86esvd0frysf8y8wd7u5gzpr8');

    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qjs4u7m32ke4znm38y7kakp78t695wetnugap7l');

    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qerld76y8g50324ddc4aeyd2xkhsxj74nfacjtr');

    assert.strictEqual(hd._getInternalAddressByIndex(1), 'bc1q30mrwrnd9zc69ludsjgh6decynzrhnpcs32enq');

    assert.strictEqual(hd.timeToRefreshBalance(), true);
    assert.ok(hd._lastTxFetch === 0);
    assert.ok(hd._lastBalanceFetch === 0);

    await hd.fetchBalance();
    assert.ok(hd.getBalance() > 0);
    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(7));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(9));
    assert.strictEqual(hd.next_free_address_index, 7);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 7);
    assert.strictEqual(hd.next_free_change_address_index, 9);

    // now fetch txs
    await hd.fetchTransactions();
    assert.ok(hd._lastTxFetch > 0);
    assert.ok(hd._lastBalanceFetch > 0);
    assert.strictEqual(hd.timeToRefreshBalance(), false);
    assert.strictEqual(hd.getTransactions().length, 18);

    for (const tx of hd.getTransactions()) {
      assert.ok(tx.hash);
      // ! FIX: cannot guarantee order
      // assert.strictEqual(tx.value, 608);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }

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
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(9));
    assert.strictEqual(hd.next_free_address_index, 7);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 7);
    assert.strictEqual(hd.next_free_change_address_index, 9);
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
    hd._txs_by_internal_index['2'] = [];
    hd._txs_by_external_index['2'] = [];

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
        txFound++;
      }
    }
    assert.strictEqual(txFound, 1);

    await hd.fetchUtxo();
    assert.ok(hd.getUtxo().length > 0);
    assert.strictEqual(hd.getDerivedUtxoFromOurTransaction().length, 5);
    const u1 = hd.getUtxo().find((utxo) => utxo.txid === '13ecc899d09000658ac41e9e740dc38ddb1b8bada412841b714066a3d17ef3d7');
    const u2 = hd.getDerivedUtxoFromOurTransaction().find((utxo) => utxo.txid === '13ecc899d09000658ac41e9e740dc38ddb1b8bada412841b714066a3d17ef3d7');
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
