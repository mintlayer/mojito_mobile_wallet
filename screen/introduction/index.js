import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { windowWidth } from '../../blue_modules/environment';
import Carousel, { Pagination } from 'react-native-snap-carousel';

import navigationStyle from '../../components/navigationStyle';
import { COLORS } from '../../theme/Colors';
import { type } from '../../theme/Fonts';
import { introductionContent } from '../../constants';

const Introduction = () => {
  const [activePage, setActivePage] = useState(0);
  const _renderItem = ({ item }) => {
    const { image, title, subtitle } = item;
    return <View style={styles.slide1}>{pageContent(image, title, subtitle)}</View>;
  };

  return (
    <View style={styles.root}>
      <Carousel
        data={introductionContent}
        renderItem={_renderItem}
        onSnapToItem={(index) => {
          setActivePage(index);
        }}
        useScrollView
        sliderWidth={windowWidth}
        itemWidth={windowWidth}
        inactiveSlideScale={0.94}
        inactiveSlideOpacity={0.7}
      />
      <Pagination dotsLength={introductionContent.length} activeDotIndex={activePage} dotStyle={styles.activeDot} inactiveDotStyle={styles.inActiveDot} />

      <View style={styles.skipButtonPortion}>{activePage === 3 ? StartButton() : Skip()}</View>
    </View>
  );
};
// const navigateScreen = (navigate) => navigate('WalletsList');
const navigateScreen = (navigate) => navigate('BottomTab');

const Skip = () => {
  const { navigate } = useNavigation();
  return (
    <TouchableOpacity style={styles.skipButton} onPress={() => navigateScreen(navigate)}>
      <Text style={styles.skipButtonText}>Skip</Text>
    </TouchableOpacity>
  );
};
const StartButton = () => {
  const { navigate } = useNavigation();
  return (
    <TouchableOpacity style={styles.startButton} onPress={() => navigateScreen(navigate)}>
      <Text style={styles.startButtonText}>Start</Text>
    </TouchableOpacity>
  );
};
const pageContent = (image, title, subTitle) => (
  <React.Fragment key={title}>
    <Image source={image} />
    <Text style={styles.text}>{title}</Text>
    <Text style={styles.description}>{subTitle}</Text>
  </React.Fragment>
);

export default Introduction;
Introduction.navigationOptions = navigationStyle({}, (opts) => ({
  ...opts,
  headerTitle: '',
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slide1: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 30,
  },
  text: {
    color: COLORS.black,
    fontSize: 18,
    marginVertical: 30,
    fontFamily: type.bold,
  },
  description: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontFamily: type.light,
    lineHeight: 18,
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  activeDot: {
    width: 30,
    height: 8,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  inActiveDot: {
    backgroundColor: COLORS.gray,
    width: 10,
  },
  startButton: {
    width: '80%',
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.white,
    fontFamily: type.light,
    fontSize: 14,
  },
  skipButton: {
    paddingVertical: 20,
    paddingHorizontal: 50,
  },
  skipButtonText: {
    color: COLORS.green,
    fontFamily: type.semiBold,
    fontSize: 14,
  },
  skipButtonPortion: {
    flex: 0.18,
    alignItems: 'center',
  },
});
