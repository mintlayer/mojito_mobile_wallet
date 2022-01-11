import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SectionList,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
  findNodeHandle,
  I18nManager,
} from "react-native";

import { Icon } from "react-native-elements";
import { FContainer, FButton } from "../../components/FloatButtons";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import {
  isDesktop,
  isMacCatalina,
  isTablet,
  windowWidth,
} from "../../blue_modules/environment";
import Swiper from "react-native-swiper";
import Carousel, { Pagination } from "react-native-snap-carousel";

import navigationStyle from "../../components/navigationStyle";
import { Colors, Images } from "../../theme";

const introduction = () => {
  const [activePage, setActivePage] = useState(0);
  const [entries, setEntries] = useState([
    {
      title: "A Bitcoin Sidechain",
      subtitle:
        "Mintlayer is a Bitcoin sidechain dedicated to tokenization of assets, such as stock tokens or stablecoins. Your Mintlayer wallet is a Bitcoin wallet with extended functionalitites, and you will be able to use it to trustlessly swap BTC for any token issued on Mintlayer, even through Lightning Network",
      image: Images.page1,
      index: 0,
    },
    {
      title: "Your Mintlayer Wallet",
      subtitle:
        "You can create a new Bitcoin wallet or import an existing one. Your Mintlayer wallet will be automatically derived from your Bitcoin mnemonics (provided it is a BIP39 seed). Inside your wallet, you will find multiple ledgers corresponding to different coins in the Mintlayer ecosystem.",
      image: Images.page2,
      index: 1,
    },
    {
      title: "The Token Ecosystem",
      subtitle:
        'BTC and MLT are the native assets of your wallet. The last stands for "Mint Layer Token", which is the governance token of the sidechain. In addition, there are the MLS ("Mint Layer Standard") tokens. You will be able to add as many MLS tokens as you wish in your wallet, specifying their contract address (like it happens for the ERC20 tokens in wallets like Metamask).',
      image: Images.page3,
      index: 2,
    },
    {
      title: "It's Just The Beginning",
      subtitle:
        "In this first version of the wallet, only BTC functionalities are available. Once Mintlayer mainnet is live also MLT will be supported. Then all features will be released progressively, from MLS tokens to DEXs and Lightning Network. We are glad that you joined so early the Mintlayer revolution. Mintlayer will outlast every single one of us, but you are here now, making history!",
      image: Images.page4,
      index: 3,
    },
  ]);

  const walletsCarousel = useRef();
  const currentWalletIndex = useRef(0);
  const { width } = useWindowDimensions();
  const { colors, scanImage, barStyle } = useTheme();
  const { navigate, setOptions } = useNavigation();

  const [isLargeScreen, setIsLargeScreen] = useState(
    Platform.OS === "android"
      ? isTablet()
      : (width >= Dimensions.get("screen").width / 2 && isTablet()) || isDesktop
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // call refreshTransactions() only once, when screen mounts

  const onLayout = (_e) => {
    setIsLargeScreen(
      Platform.OS === "android"
        ? isTablet()
        : (width >= Dimensions.get("screen").width / 2 && isTablet()) ||
            isDesktop
    );
  };

  const navigateScreen = () => navigate("WalletsList");

  const pageContent = (image, title, subTitle) => (
    <Fragment>
      <Image source={image} />
      <Text style={styles.text}>{title}</Text>
      <Text style={styles.description}>{subTitle}</Text>
    </Fragment>
  );
  const skip = () => (
    <TouchableOpacity style={styles.skipButton} onPress={navigateScreen}>
      <Text style={{ color: Colors.green }}> Skip</Text>
    </TouchableOpacity>
  );
  const startButton = () => (
    <TouchableOpacity style={styles.startButton} onPress={navigateScreen}>
      <Text style={styles.startButtonText}>Start</Text>
    </TouchableOpacity>
  );

  const _renderItem = ({ item, index }) => {
    return (
      <View style={styles.slide1}>
        {pageContent(item.image, item.title, item.subtitle)}
      </View>
    );
  };

  const showPagination = () => {
    return (
      <Pagination
        dotsLength={entries.length}
        activeDotIndex={activePage}
        dotStyle={styles.activeDot}
        inactiveDotStyle={styles.inActiveDot}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        data={entries}
        renderItem={_renderItem}
        onSnapToItem={(index) => {
          setActivePage(index);
        }}
        useScrollView={true}
        sliderWidth={windowWidth}
        itemWidth={windowWidth}
        inactiveSlideScale={0.94}
        inactiveSlideOpacity={0.7}
      />
      {showPagination()}

      <View style={styles.skipButtonPortion}>
        {activePage == 3 ? startButton() : skip()}
      </View>
    </View>
  );
};

export default introduction;
introduction.navigationOptions = navigationStyle({}, (opts) => ({
  ...opts,
  headerTitle: "",
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slide1: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 30,
  },
  text: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 30,
  },
  description: {
    color: "#000000",
    fontSize: 12,
  },
  activeDot: {
    width: 30,
    height: 8,
    borderRadius: 5,
    backgroundColor: Colors.green,
  },
  inActiveDot: {
    backgroundColor: Colors.gray,
    width: 10,
  },
  startButton: {
    width: "80%",
    paddingVertical: 25,
    borderRadius: 20,
    backgroundColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    color: Colors.white,
  },
  skipButton: {
    paddingVertical: 20,
    paddingHorizontal: 50,
  },
  skipButtonPortion: {
    flex: 0.18,
    alignItems: "center",
  },
});
