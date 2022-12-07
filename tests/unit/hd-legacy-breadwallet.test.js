import assert from 'assert';
import { HDLegacyBreadwalletWallet } from '../../class';

it('Legacy HD Breadwallet works', async () => {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }
  const hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret(process.env.HD_MNEMONIC_BREAD);

  assert.strictEqual(hdBread.validateMnemonic(), true);

  assert.strictEqual(hdBread._getExternalAddressByIndex(0), '14hskPnMnPvGURBsNKikWFM52Wr76QkdYV');
  assert.strictEqual(hdBread._getInternalAddressByIndex(0), '1EC8oFUsFJrhZ4KvLQtWRbZjyFEvWFdWLM');

  hdBread._internal_segwit_index = 2;
  hdBread._external_segwit_index = 2;
  assert.ok(hdBread._getExternalAddressByIndex(0).startsWith('1'));
  assert.ok(hdBread._getInternalAddressByIndex(0).startsWith('1'));
  assert.strictEqual(hdBread._getExternalAddressByIndex(2), 'bc1q8d4gt09me7x4npjvthrthvagpmu74h7cv8kmyd');

  assert.strictEqual(hdBread._getInternalAddressByIndex(2), 'bc1qxlyxh2g0z5f0wkjuhkalfagpt28vj48kgn05kj');
  assert.strictEqual(hdBread._getDerivationPathByAddress('14hskPnMnPvGURBsNKikWFM52Wr76QkdYV'), "m/0'/0/0");

  assert.strictEqual(hdBread._getDerivationPathByAddress('bc1qxlyxh2g0z5f0wkjuhkalfagpt28vj48kgn05kj'), "m/0'/1/2");
  assert.strictEqual(hdBread._getPubkeyByAddress(hdBread._getExternalAddressByIndex(0)).toString('hex'), '022332bb6169e9d2b146c89b0dab94dd706ec4dab18991980e58c3304fdf90513e');
  assert.strictEqual(hdBread._getPubkeyByAddress(hdBread._getInternalAddressByIndex(0)).toString('hex'), '03e24dfcc87267df49aabf2f079125985dfb81ceabb6208961d353fb443d43567e');

  assert.strictEqual(hdBread.getXpub(), 'xpub69SZRrs6HqmoG1evTZg4nGAsLhoa22t4K1bVCLGBTirffiwBacPJMDpxK53bEh5Bf5ChvErGEuX1xA4L6zGxRZqmGo6yY9WMrABXR96S1Vk');
  assert.ok(hdBread.getAllExternalAddresses().includes('14hskPnMnPvGURBsNKikWFM52Wr76QkdYV'));
  assert.ok(hdBread.getAllExternalAddresses().includes('bc1q8d4gt09me7x4npjvthrthvagpmu74h7cv8kmyd'));
});
