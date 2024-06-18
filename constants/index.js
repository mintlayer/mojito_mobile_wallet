import { page1, page2, page3, page4 } from '../theme/Images';
export const introductionContent = [
  {
    title: 'A Bitcoin Sidechain',
    subtitle: 'Mintlayer enables Bitcoin for use in DeFi applications by using Atomic Swaps to eliminate the need for wrapped tokens. Our sidechain unlocks Bitcoin to Decentralized Finance, Real World Asset Tokenization, Smart Contracts, Atomic Swaps, NFTs, and more. We give devs the tools to build on Bitcoin and holder’s the ability to achieve more with their BTC',
    image: page1,
    index: 0,
  },
  {
    title: 'Your Mintlayer Wallet',
    subtitle: 'You can create a new Bitcoin wallet or import an existing one. Your Mintlayer wallet will automatically be derived from your Bitcoin mnemonics, provided it is a BIP39 seed. Inside your wallet, you will find multiple ledgers corresponding to various coins or tokens within the Mintlayer ecosystem',
    image: page2,
    index: 1,
  },
  {
    title: 'The Token Ecosystem',
    subtitle: 'BTC and ML are the native assets of your wallet, with ML representing "Mintlayer Coin," the governance coin of the sidechain. Additionally, there are MLS ("Mintlayer Standard") tokens. You can add as many MLS tokens as you wish to your wallet by specifying their token address, similar to how ERC20 tokens are added in wallets like MetaMask',
    image: page3,
    index: 2,
  },
  {
    title: "It's Just The Beginning",
    subtitle: "With this update, we're excited to roll out support for our Mainet native ML coin. It's fantastic to have you with us from the early stages of the Mintlayer revolution. Mintlayer is designed to stand the test of time, and you are an integral part of this pioneering journey",
    image: page4,
    index: 3,
  },
];

export const androidLevel = 28;

export const amountValueRegex = `^[1-9]\\d*(\\,\\d+)?$`;

export const recieveDescriptionRegex = `^[\\d@a-zA-Z._+-\\s]+$`;
