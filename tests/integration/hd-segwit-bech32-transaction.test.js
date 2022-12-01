import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitBech32Transaction, SegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

let _cachedHdWallet = false;

/**
 * @returns {Promise<HDSegwitBech32Wallet>}
 * @private
 */
async function _getHdWallet() {
  if (_cachedHdWallet) return _cachedHdWallet;
  _cachedHdWallet = new HDSegwitBech32Wallet();
  _cachedHdWallet.setSecret(process.env.HD_MNEMONIC_BIP84);
  await _cachedHdWallet.fetchBalance();
  await _cachedHdWallet.fetchTransactions();
  return _cachedHdWallet;
}

describe('HDSegwitBech32Transaction', () => {
  it('can decode & check sequence', async function () {
    let T = new HDSegwitBech32Transaction(null, 'e9ef58baf4cff3ad55913a360c2fa1fd124309c59dcd720cdb172ce46582097b');
    assert.strictEqual(await T.getMaxUsedSequence(), 0xffffffff);
    assert.strictEqual(await T.isSequenceReplaceable(), false);

    // 881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e
    T = new HDSegwitBech32Transaction(
      '02000000000102f1155666b534f7cb476a0523a45dc8731d38d56b5b08e877c968812423fbd7f3010000000000000000d8a2882a692ee759b43e6af48ac152dd3410cc4b7d25031e83b3396c16ffbc8900000000000000000002400d03000000000017a914e286d58e53f9247a4710e51232cce0686f16873c870695010000000000160014d3e2ecbf4d91321794e0297e0284c47527cf878b02483045022100d18dc865fb4d087004d021d480b983b8afb177a1934ce4cd11cf97b03e17944f02206d7310687a84aab5d4696d535bca69c2db4449b48feb55fff028aa004f2d1744012103af4b208608c75f38e78f6e5abfbcad9c360fb60d3e035193b2cd0cdc8fc0155c0247304402207556e859845df41d897fe442f59b6106c8fa39c74ba5b7b8e3268ab0aebf186f0220048a9f3742339c44a1e5c78b491822b96070bcfda3f64db9dc6434f8e8068475012102456e5223ed3884dc6b0e152067fd836e3eb1485422eda45558bf83f59c6ad09f00000000',
    );
    assert.strictEqual(await T.getMaxUsedSequence(), 0);
    assert.strictEqual(await T.isSequenceReplaceable(), true);

    assert.ok((await T.getRemoteConfirmationsNum()) >= 292);
  });

  it('can tell if its our transaction', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    // let tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);
    let tt = new HDSegwitBech32Transaction(null, 'e5cb56da729db598eee4dca8d45283562ff1cc95ca74dea21249da6e1df05b6f', hd);

    assert.ok(await tt.isOurTransaction());

    tt = new HDSegwitBech32Transaction(null, '881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e', hd);

    assert.ok(!(await tt.isOurTransaction()));
  });

  it('can tell tx info', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, 'e5cb56da729db598eee4dca8d45283562ff1cc95ca74dea21249da6e1df05b6f', hd);

    const { fee, feeRate, targets, changeAmount, utxos } = await tt.getInfo();
    assert.strictEqual(fee, 1898);
    assert.strictEqual(changeAmount, 3102);
    assert.strictEqual(feeRate, 13);
    assert.strictEqual(targets.length, 1);
    assert.strictEqual(targets[0].value, 15000);
    assert.strictEqual(targets[0].address, 'bc1qh30xlhgkk9nd5gmuzkw5pa06x5dwyqjzhc3j43');
    assert.strictEqual(
      JSON.stringify(utxos),
      JSON.stringify([
        {
          vout: 0,
          value: 20000,
          txId: 'b1adecfc4346c3e19d5f747b6707ac8a558e927ac132506935a944cda55aacf8',
          address: 'bc1qgjlh4fw5u6y9d82e2v9706fcyg2n0aflmjljkd',
        },
        // {
        //   vout: 0,
        //   value: 200000,
        //   txId: '89bcff166c39b3831e03257d4bcc1034dd52c18af46a3eb459e72e692a88a2d8',
        //   address: 'bc1qvh44cwd2v7zld8ef9ld5rs5zafmejuslp6yd73',
        // },
      ]),
    );
  });

  it('can do RBF - cancel tx', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, 'e5cb56da729db598eee4dca8d45283562ff1cc95ca74dea21249da6e1df05b6f', hd);

    assert.strictEqual(await tt.canCancelTx(), true);

    const { tx } = await tt.createRBFcancelTx(25);

    const createdTx = bitcoin.Transaction.fromHex(tx.toHex());
    assert.strictEqual(createdTx.ins.length, 1);
    assert.strictEqual(createdTx.outs.length, 1);
    const addr = SegwitBech32Wallet.scriptPubKeyToAddress(createdTx.outs[0].script);
    assert.ok(hd.weOwnAddress(addr));

    const actualFeerate = (20000 - createdTx.outs[0].value) / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 25);

    const tt2 = new HDSegwitBech32Transaction(tx.toHex(), null, hd);
    assert.strictEqual(await tt2.canCancelTx(), false); // newly created cancel tx is not cancellable anymore
  });

  it('can do RBF - bumpfees tx', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, 'a0ba0ec61c5cf021673233d03fa76fb039f42d8091e659c42d5d8b89e46d20c7', hd);

    assert.strictEqual(await tt.canCancelTx(), true);
    assert.strictEqual(await tt.canBumpTx(), true);

    const { tx } = await tt.createRBFbumpFee(27);

    const createdTx = bitcoin.Transaction.fromHex(tx.toHex());
    assert.strictEqual(createdTx.ins.length, 1);
    assert.strictEqual(createdTx.outs.length, 2);
    const addr0 = SegwitP2SHWallet.scriptPubKeyToAddress(createdTx.outs[0].script);
    assert.ok(!hd.weOwnAddress(addr0));
    console.log('addr0 ****** ', addr0);
    console.log('createdTx.outs[0].script ****** ', createdTx.outs[0].script);
    assert.strictEqual(addr0, '355Ky9yTAmHdk2F13XoAE6xCBBePJG72HX'); // dest address
    const addr1 = SegwitBech32Wallet.scriptPubKeyToAddress(createdTx.outs[1].script);
    assert.ok(hd.weOwnAddress(addr1));

    const actualFeerate = (129562 - (createdTx.outs[0].value + createdTx.outs[1].value)) / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 28);

    const tt2 = new HDSegwitBech32Transaction(tx.toHex(), null, hd);
    assert.strictEqual(await tt2.canCancelTx(), true); // new tx is still cancellable since we only bumped fees
  });

  it('can do CPFP - bump fees', async function () {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = await _getHdWallet();

    const tt = new HDSegwitBech32Transaction(null, 'b1adecfc4346c3e19d5f747b6707ac8a558e927ac132506935a944cda55aacf8', hd);
    assert.ok(await tt.isToUsTransaction());
    const { unconfirmedUtxos, fee: oldFee } = await tt.getInfo();

    assert.strictEqual(
      JSON.stringify(unconfirmedUtxos),
      JSON.stringify([
        {
          vout: 0,
          value: 20000,
          txId: 'b1adecfc4346c3e19d5f747b6707ac8a558e927ac132506935a944cda55aacf8',
          address: 'bc1qgjlh4fw5u6y9d82e2v9706fcyg2n0aflmjljkd',
        },
      ]),
    );

    const { tx, fee } = await tt.createCPFPbumpFee(20);
    const avgFeeRate = (oldFee + fee) / (tt._txDecoded.virtualSize() + tx.virtualSize());
    assert.ok(Math.round(avgFeeRate) >= 20);
  });
});
