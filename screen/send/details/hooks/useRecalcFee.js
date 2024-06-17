import BigInt from 'big-integer';

import { BitcoinUnit } from '../../../../models/bitcoinUnits';
import currency from '../../../../blue_modules/currency';
import React, { useEffect } from 'react';
import { WatchOnlyWallet } from '../../../../class';
import { AbstractHDElectrumWallet } from '../../../../class/wallets/abstract-hd-electrum-wallet';
import { MintLayerWallet } from '../../../../class/wallets/mintlayer-wallet';

export const useRecalcFee = ({ wallet, networkTransactionFees, feeRate, utxo, addresses, changeAddress, poolId, delegationId, dumb, feePrecalc, setFeePrecalc, balance, tokenInfo }) => {
  // recalc fees in effect so we don't block render
  useEffect(() => {
    function recalcBtcFees() {
      if (!wallet) return; // wait for it
      const fees = networkTransactionFees;
      const changeAddress = getChangeAddressFast();
      const requestedSatPerByte = Number(feeRate);
      const lutxo = utxo || wallet.getUtxo();

      const options = [
        { key: 'current', fee: requestedSatPerByte },
        { key: 'slowFee', fee: fees.slowFee },
        { key: 'mediumFee', fee: fees.mediumFee },
        { key: 'fastestFee', fee: fees.fastestFee },
      ];
      const newFeePrecalc = { ...feePrecalc };

      for (const opt of options) {
        let targets = [];
        for (const transaction of addresses) {
          if (transaction.amount === BitcoinUnit.MAX) {
            // single output with MAX
            targets = [{ address: transaction.address }];
            break;
          }
          const value = parseInt(transaction.amountInCoins);
          if (value > 0) {
            targets.push({ address: transaction.address, value });
          } else if (transaction.amount) {
            if (currency.btcToSatoshi(transaction.amount) > 0) {
              targets.push({ address: transaction.address, value: currency.btcToSatoshi(transaction.amount) });
            }
          }
        }

        // if targets is empty, insert dust
        if (targets.length === 0) {
          targets.push({ address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV', value: 546 });
        }

        // replace wrong addresses with dump
        targets = targets.map((t) => {
          if (!wallet.isAddressValid(t.address)) {
            return { ...t, address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV' };
          } else {
            return t;
          }
        });

        let flag = false;
        while (true) {
          try {
            const { fee } = wallet.coinselect(lutxo, targets, opt.fee, changeAddress);

            newFeePrecalc[opt.key] = fee;
            break;
          } catch (e) {
            if (e.message.includes('Not enough') && !flag) {
              flag = true;
              // if we don't have enough funds, construct maximum possible transaction
              targets = targets.map((t, index) => (index > 0 ? { ...t, value: 546 } : { address: t.address }));
              continue;
            }

            newFeePrecalc[opt.key] = null;
            break;
          }
        }
      }

      setFeePrecalc(newFeePrecalc);
    }

    async function recalcMlFees() {
      if (!wallet) return;
      const fees = networkTransactionFees;
      console.log('fees', fees);
      const changeAddress = getChangeAddressFast();
      const requestedSatPerByte = Number(feeRate);
      const lutxo = utxo || wallet.getUtxo();

      const options = [
        { key: 'current', fee: requestedSatPerByte },
        { key: 'slowFee', fee: fees.slowFee },
        { key: 'mediumFee', fee: fees.mediumFee },
        { key: 'fastestFee', fee: fees.fastestFee },
      ];

      const newFeePrecalc = { ...feePrecalc };

      console.log('newFeePrecalc', newFeePrecalc);

      for (const opt of options) {
        const targets = [];

        console.log('addresses', addresses);

        for (const transaction of addresses) {
          if (transaction.amount === BitcoinUnit.MAX) {
            // output with MAX
            targets.push({ address: transaction.address, value: balance });
            continue;
          }
          const value = parseInt(transaction.amountInCoins);

          if (value === 0) {
            targets.push({ address: transaction.address, value: 0 });
          }

          if (tokenInfo) {
            const atoms = tokenInfo.number_of_decimals;
            const tokenValue = BigInt(Math.round(transaction.amount * Math.pow(10, atoms)));
            targets.push({ address: transaction.address, value: tokenValue });
          } else if (value > 0) {
            targets.push({ address: transaction.address, value });
          } else if (transaction.amount) {
            const amount = currency.mlToCoins(transaction.amount);
            if (amount > 0) {
              targets.push({ address: transaction.address, value: amount });
            }
          }
        }

        console.log('targets', targets);

        try {
          // only one target available now
          const { value: amountToUse, address } = targets[0];
          const fee = await wallet.calculateFee({ utxosTotal: lutxo, address: address, changeAddress: changeAddress, amountToUse, feeRate: opt.fee, poolId, delegationId, tokenId: tokenInfo?.token_id });
          newFeePrecalc[opt.key] = fee;
        } catch (e) {
          newFeePrecalc[opt.key] = null;
        }
      }

      setFeePrecalc(newFeePrecalc);
    }

    if (!wallet) return;
    const recalcFees = wallet.type === MintLayerWallet.type ? recalcMlFees : recalcBtcFees;
    recalcFees();
  }, [wallet, networkTransactionFees, utxo, addresses, feeRate, dumb]); // eslint-disable-line react-hooks/exhaustive-deps

  const getChangeAddressFast = () => {
    if (changeAddress) return changeAddress; // cache

    let change;
    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      change = wallet.getAddress();
    } else if (MintLayerWallet.type === wallet.type || WatchOnlyWallet.type === wallet.type || wallet instanceof AbstractHDElectrumWallet) {
      change = wallet._getInternalAddressByIndex(wallet.getNextFreeChangeAddressIndex());
    } else {
      // legacy wallets
      change = wallet.getAddress();
    }

    return change;
  };

  return { feePrecalc, setFeePrecalc };
};
