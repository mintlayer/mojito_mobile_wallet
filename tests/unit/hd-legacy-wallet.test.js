import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDLegacyP2PKHWallet } from '../../class';

describe('Legacy HD (BIP44)', () => {
  it('works', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    // assert.strictEqual(hd.getXpub(), 'xpub6ByZUAv558PPheJgcPYHpxPLwz8M7TtueYMAik84NADeQcvbzS8W3WxxJ3C9NzfYkMoChiMAumWbeEvMWhTVpH75NqGv5c9wF3wKDbfQShb');
    assert.strictEqual(hd.getXpub(), 'xpub6DNH6FmL725rWuoSJLRVCUStQoTF3QoKkK2miGh6ReuCZgSkXsdXHCjbDcJo8FUTRgv3dqcSBqgaTjdwZ2tsgJ6VMVpQM5UCvTvxQYDMkSZ');

    // assert.strictEqual(hd._getExternalAddressByIndex(0), '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por');
    assert.strictEqual(hd._getExternalAddressByIndex(0), '1ANLgqoLWeti3WuATUtQEW9UXVWsjupUDb');

    // assert.strictEqual(hd._getInternalAddressByIndex(0), '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '1FaY9nXsGCipfmXMBuXeJE9P5uo7GbiaZC');

    // assert.strictEqual(hd._getInternalWIFByIndex(0), 'L4ojevRtK81A8Kof3qyLS2M7HvsVDbUDENNhJqU4vf79w9yGnQLb');
    assert.strictEqual(hd._getInternalWIFByIndex(0), 'KyFLccDgxL8p5iYfJJjcybPie9MNKDoCguHokYUeSBV8ingxq3vj');

    // assert.strictEqual(hd._getExternalWIFByIndex(0), 'Kz6kLhdyDfSbKuVH25XVqBRztjmFe8X22Xe1hnFzEv79gJNMkTAH');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KyvVsYXvzhFENZWRAW8zDg1awL1avpdWb4jaRQwfKBvQHtBsGk8W');

    // assert.ok(hd.getAllExternalAddresses().includes('186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por'));
    assert.ok(hd.getAllExternalAddresses().includes('1ANLgqoLWeti3WuATUtQEW9UXVWsjupUDb'));

    // assert.ok(!hd.getAllExternalAddresses().includes('1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj')); // not internal
    assert.ok(!hd.getAllExternalAddresses().includes('1FaY9nXsGCipfmXMBuXeJE9P5uo7GbiaZC')); // not internal

    // assert.strictEqual(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'), '0316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667');
    assert.strictEqual(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'), '0382ee103fdacd45bb70438e1502581551f4b8f05883355350d091959ba4955283');

    // assert.strictEqual(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'), '02ad7b2216f3a2b38d56db8a7ee5c540fd12c4bbb7013106eff78cc2ace65aa002');
    assert.strictEqual(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'), '0252ad53fe22409f4eb730f597550d2aa0dfa3e352fe43a36765d770bf69a15ada');

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/44'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/44'/0'/0'/1/0");
  });

  it('can create TX', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    const utxo = [
      {
        height: 554830,
        value: 700,
        // address: '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por',
        // address: '1ANLgqoLWeti3WuATUtQEW9UXVWsjupUDb',
        address: '1FaY9nXsGCipfmXMBuXeJE9P5uo7GbiaZC',
        txId: '69519e72ac433e3c823e1273cce6f55221ec366a2a54e56e779edd4b8b850e2c',
        vout: 0,
        txid: '69519e72ac433e3c823e1273cce6f55221ec366a2a54e56e779edd4b8b850e2c',
        amount: 700,
        wif: 'KyFLccDgxL8p5iYfJJjcybPie9MNKDoCguHokYUeSBV8ingxq3vj',
        confirmations: 1,
        txhex: '0200000000010172a95d5410450c312634eb746d384a91355186d78ee76223d70d55afe1477a9600000000000000008002bc020000000000001976a9149fe97ddc88d33faf1664ee2b864e5366c0ceb19588acbf06000000000000160014c8fedf6887451f1555adc57b923546b5e0697ab302483045022100c2aa6d9c467a30fdc7f94d047946f7afba57942e54eab0dc35255bfda9769cfb0220517dedca45dafaa4df08ff3fd258267f1d7c5a3f55532f2fa584ce14087d2ffc012102069aa04e428df6bd54e1f1fc61e505f8d67c522e5cc97f45721ad96c5aa817e400000000',
      },
      {
        height: 554830,
        value: 1000,
        // address: '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj',
        address: '1ANLgqoLWeti3WuATUtQEW9UXVWsjupUDb',
        txId: '8c32fd366b2131e3cca11caaf5ad8c09cc3e443a2e934c29ac939a5e6cdfdda2',
        vout: 0,
        txid: '8c32fd366b2131e3cca11caaf5ad8c09cc3e443a2e934c29ac939a5e6cdfdda2',
        amount: 1000,
        wif: 'KyvVsYXvzhFENZWRAW8zDg1awL1avpdWb4jaRQwfKBvQHtBsGk8W',
        confirmations: 1,
        txhex: '020000000001016ae8246da586d0799a428a68d6031721e6f855f6c9730921c4ab6d484fb415fe00000000000000008002e8030000000000001976a91466c24d1295144c62eb3c4c054ecd493cd341557a88ac04220000000000001600141493ad0bf756993c7c206b812dd04bfa6aace98202483045022100fec3361c5e916e8a719fb972dda1ea9cd461c7067edb5208acf2bae4d1815559022064fbb4532f215255099950453c43b6a8f25fffe032806bc4c6797de6222eceff0121028bcb980e4ee8cd8351de72444ab449719af2e07bba4adb952034d52690ce2b7400000000',
      },
      // {
      //   height: 554830,
      //   value: 30000,
      //   // address: '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por',
      //   address: '1ANLgqoLWeti3WuATUtQEW9UXVWsjupUDb',
      //   txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      //   vout: 2,
      //   txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      //   amount: 30000,
      //   wif: 'KyvVsYXvzhFENZWRAW8zDg1awL1avpdWb4jaRQwfKBvQHtBsGk8W',
      //   confirmations: 1,
      //   txhex:
      //     '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
      // },
      // {
      //   height: 554830,
      //   value: 40000,

      //   // address: '1J9zoJz5LsAJ361SQHYnLTWg46Tc2AXUCj',
      //   address: '1FaY9nXsGCipfmXMBuXeJE9P5uo7GbiaZC',
      //   txId: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      //   vout: 3,
      //   txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
      //   amount: 40000,
      //   wif: 'KyFLccDgxL8p5iYfJJjcybPie9MNKDoCguHokYUeSBV8ingxq3vj',
      //   confirmations: 1,
      //   txhex:
      //     '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
      // },
    ];

    console.log('hd.next_free_change_address_index  : ', hd.next_free_change_address_index);
    // let txNew = hd.createTransaction(utxo, [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', value: 80000 }], 1, hd._getInternalAddressByIndex(hd.next_free_change_address_index));
    let txNew = hd.createTransaction(utxo, [{ address: 'bc1qmvt3r3hvy4m9j27fw5fgne8ewl5zsvmm6ucuq4', value: 1010 }], 1, hd._getInternalAddressByIndex(hd.next_free_change_address_index));

    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 2);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual(tx.outs[0].value, 1010); // payee
    assert.strictEqual(tx.outs[1].value, 316); // change
    // 374 is the fees
    let toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
    const changeAddress = bitcoin.address.fromOutputScript(tx.outs[1].script);
    assert.strictEqual('bc1qmvt3r3hvy4m9j27fw5fgne8ewl5zsvmm6ucuq4', toAddress);
    assert.strictEqual(hd._getInternalAddressByIndex(hd.next_free_change_address_index), changeAddress);

    // testing sendMax
    txNew = hd.createTransaction(utxo, [{ address: 'bc1qmvt3r3hvy4m9j27fw5fgne8ewl5zsvmm6ucuq4' }], 1, hd._getInternalAddressByIndex(hd.next_free_change_address_index));
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 2);
    assert.strictEqual(tx.outs.length, 1);
    toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
    assert.strictEqual('bc1qmvt3r3hvy4m9j27fw5fgne8ewl5zsvmm6ucuq4', toAddress);
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'H5J8DbqvuBy8lqRW7+LTVrrtrsaqLSwRDyj+5XtCrZpdCgPlxKM4EKRD6qvdKeyEh1fiSfIVB/edPAum3gKcJZo=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature), true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    assert.strictEqual(signature, 'H98hmvtyPFUbR6E5Tcsqmc+eSjlYhP2vy41Y6IyHS9DVKEI5n8VEMpIEDtvlMARVce96nOqbRHXo9nD05WXH/Eo=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature), true);
  });

  it('can show fingerprint', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(mnemonic);
    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');
  });

  // from electrum tests https://github.com/spesmilo/electrum/blob/9c1a51547a301e765b9b0f9935c6d940bb9d658e/electrum/tests/test_wallet_vertical.py#L292
  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'treat dwarf wealth gasp brass outside high rent blood crowd make initial';
    const UNICODE_HORROR = '₿ 😀 😈     う けたま わる w͢͢͝h͡o͢͡ ̸͢k̵͟n̴͘ǫw̸̛s͘ ̀́w͘͢ḩ̵a҉̡͢t ̧̕h́o̵r͏̵rors̡ ̶͡͠lį̶e͟͟ ̶͝in͢ ͏t̕h̷̡͟e ͟͟d̛a͜r̕͡k̢̨ ͡h̴e͏a̷̢̡rt́͏ ̴̷͠ò̵̶f̸ u̧͘ní̛͜c͢͏o̷͏d̸͢e̡͝?͞';
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(UNICODE_HORROR);

    assert.strictEqual(hd.getXpub(), 'xpub6D85QDBajeLe2JXJrZeGyQCaw47PWKi3J9DPuHakjTkVBWCxVQQkmMVMSSfnw39tj9FntbozpRtb1AJ8ubjeVSBhyK4M5mzdvsXZzKPwodT');

    assert.strictEqual(hd._getExternalAddressByIndex(0), '1F88g2naBMhDB7pYFttPWGQgryba3hPevM');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '1H4QD1rg2zQJ4UjuAVJr5eW1fEM8WMqyxh');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'L3HLzdVcwo4711gFiZG4fiLzLVNJpR6nejfo6J85wuYn9YF2G5zk');
  });

  it('can create with custom derivation path', async () => {
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    hd.setDerivationPath("m/44'/0'/1'");

    assert.strictEqual(hd.getXpub(), 'xpub6BosfCnifzxcJJ1wYuntGJfF2zPJkDeG9ELNHcKNjezuea4tumswN9sH1psMdSVqCMoJC21Bv8usSeqSP4Sp1tLzW7aY59fGn9GCYzx5UTo');

    assert.strictEqual(hd._getExternalAddressByIndex(0), '15qucUWKf95Fo58FdCBhUTSAtsm22HHE2Q');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '1DgjtFUiXvqxGic9A9fiDPrHNyKC4cGtTH');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KzReLDRfwGJ7bBH6WjLQ36e2WxjHob3d61EKnZQT86nutd5tpkvC');

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/44'/0'/1'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/44'/0'/1'/1/0");
  });
});
