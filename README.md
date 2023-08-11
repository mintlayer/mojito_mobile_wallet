# Mojito - A Bitcoin & Mintlayer Wallet

Built with React Native and Electrum, based on [BlueWallet](https://github.com/BlueWallet/BlueWallet)

Website: [mintlayer.org](https://www.mintlayer.org/)

Community: [telegram group](https://t.me/mintlayer)

- Private keys never leave your device
- SegWit-first. Replace-By-Fee support
- Encryption. Plausible deniability

Learn more about Mintlayer [here.](https://www.mintlayer.org/technology/)

## BUILD & RUN IT

### Node and Java versions

It is recommended to run everything with node `16.14.2` for Android build. But `npm run ios` uses node version `>18`, so in this case you will need two different node versions. We recommend NVM to make that easier.

The recommended `JDK` version is `11`.

### Dependencies

After installing the correct vesions of Java and Node, clone this repo and install dependencies:

```bash
git clone https://github.com/mintlayer/mobile_wallet
cd mobile_wallet
npm install
```

#### Possible Issues

##### Got an `EINTEGRITY` error on install

Remove lock file and node_modules and try installing again.

```bash
rm -rf node_modules package-lock.json
npm install
```

##### Got an `ERESOLVE unable ro resolve dependency tree` error on install

Try running the install with legacy deps flag:

```bash
npm install --legacy-peer-deps
```

### Running on Android:

You will now need to either connect an Android device to your computer or run an emulated Android device using AVD Manager which comes shipped with Android Studio. So first of all, install Android Studio.

Then verify if you have these env vars set on you OS:

```bash
export PATH=$PATH:$HOME/android-studio/bin
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Now run metro web server in one terminal with:

```bash
npm start
```

Then build, install it, and run on android emulator in another terminal:

```bash
npm run android
```

Once you launch the app it will take some time for all of the dependencies to load. Once everything loads up, you should have the built app running.

### Running on iOS:

Run `pod-install` (just on first run):

```bash
npx pod-install
```

Now run metro web server in one terminal with:

```bash
npm start
```

Then build, install it, and run on iOS emulator in another terminal:

```bash
npm run ios
```

#### Specifics

##### Run on macOS using Mac Catalyst:

```bash
npm run maccatalystpatches
```

Once the patches are applied, open Xcode and select "My Mac" as destination. If you are running macOS Catalina, you may need to remove all iOS 14 Widget targets.

## TESTS

```bash
npm run test
```

## TESTS CASES DELETED

multisig-hd-wallet.test.js
cosign.test.js
payjoin-transaction.test.js
“We should bring it back once Multisign wallet is back”

## BrowserStack

“This project is tested with BrowserStack.”

## LICENSE

MIT

## WANT TO CONTRIBUTE?

Grab an issue from [the backlog](https://github.com/mintlayer/mobile_wallet/issues), try to start or submit a PR, any doubts we will try to guide you.

## RESPONSIBLE DISCLOSURE

Found critical bugs/vulnerabilities? Please email them security@mintlayer.org

For more info check [here](https://github.com/mintlayer/mobile_wallet/security/policy)
