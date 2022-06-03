# Mojito - A Bitcoin & Mintlayer Wallet

Built with React Native and Electrum.

Website: [mintlayer.org](https://www.mintlayer.org/)

Community: [telegram group](https://t.me/mintlayer)

- Private keys never leave your device
- SegWit-first. Replace-By-Fee support
- Encryption. Plausible deniability

Learn more about Mintlayer [here.](https://www.mintlayer.org/technology/)

## BUILD & RUN IT

Please refer to the engines field in package.json file for the minimum required versions of Node and npm. It is preferred that you use an even-numbered version of Node as these are LTS versions.

To view the version of Node and npm in your environment, run the following in your console:

```
node --version && npm --version
```

- In your console:

```
git clone https://github.com/mintlayer/mobile_wallet
cd mobile_wallet
npm install
```

Please make sure that your console is running the most stable versions of npm and node (even-numbered versions).

- To run on Android:

You will now need to either connect an Android device to your computer or run an emulated Android device using AVD Manager which comes shipped with Android Studio. To run an emulator using AVD Manager:

1. Download and run Android Studio
2. Click on "Open an existing Android Studio Project"
3. Open `build.gradle` file under `mobile_wallet/android/` folder
4. Android Studio will take some time to set things up. Once everything is set up, go to `Tools` -> `AVD Manager`.
   - 📝 This option [may take some time to appear in the menu](https://stackoverflow.com/questions/47173708/why-avd-manager-options-are-not-showing-in-android-studio) if you're opening the project in a freshly-installed version of Android Studio.
5. Click on "Create Virtual Device..." and go through the steps to create a virtual device
6. Launch your newly created virtual device by clicking the `Play` button under `Actions` column

Once you connected an Android device or launched an emulator, run this:

```
npx react-native run-android
```

The above command will build the app and install it. Once you launch the app it will take some time for all of the dependencies to load. Once everything loads up, you should have the built app running.

- To run on iOS:

```
npx pod-install
npm start
```

In another terminal window within the mobile_wallet folder:

```
npx react-native run-ios
```

- To run on macOS using Mac Catalyst:

```
npm run maccatalystpatches
```

Once the patches are applied, open Xcode and select "My Mac" as destination. If you are running macOS Catalina, you may need to remove all iOS 14 Widget targets.

## TESTS

```bash
npm run test
```

## LICENSE

MIT

## WANT TO CONTRIBUTE?

Grab an issue from [the backlog](https://github.com/mintlayer/mobile_wallet/issues), try to start or submit a PR, any doubts we will try to guide you.

## RESPONSIBLE DISCLOSURE

Found critical bugs/vulnerabilities? Please email them security@mintlayer.org

For more info check [here](https://github.com/mintlayer/mobile_wallet/security/policy)
