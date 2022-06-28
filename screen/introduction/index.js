import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, ScrollView } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { windowWidth } from '../../blue_modules/environment';
import Carousel, { Pagination } from 'react-native-snap-carousel';

import navigationStyle from '../../components/navigationStyle';
import { COLORS } from '../../theme/Colors';
import { type } from '../../theme/Fonts';
import { introductionContent } from '../../constants';
import { setIntroSliderFlage } from '../../store/asyncStorage';

const Introduction = () => {
  const [activePage, setActivePage] = useState(0);
  const { navigate } = useNavigation();
  const _renderItem = ({ item }) => {
    const { image, title, subtitle } = item;
    return (
      <View style={styles.slide1}>
        <Image source={image} />
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.text}>{title}</Text>
          <Text style={styles.description}>{subtitle}</Text>
        </ScrollView>
      </View>
    );
  };

  const _navigateTo = () => {
    setIntroSliderFlage('true');
    const navigateScreen = (navigate) => navigate('BottomTab');
    navigateScreen(navigate);
  };

  return (
    <View style={styles.root}>
      <Carousel data={introductionContent} renderItem={_renderItem} sliderWidth={windowWidth} itemWidth={windowWidth} onSnapToItem={(index) => setActivePage(index)} enableMomentum decelerationRate={0.9} />
      <Pagination dotsLength={introductionContent.length} activeDotIndex={activePage} dotStyle={styles.activeDot} inactiveDotStyle={styles.inActiveDot} />

      <View style={styles.skipButtonPortion}>
        {activePage === 3 ? (
          <TouchableOpacity style={styles.startButton} onPress={_navigateTo}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={_navigateTo}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Introduction;

Introduction.navigationOptions = navigationStyle({}, (opts) => ({
  ...opts,
  headerTitle: '',
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 10,
  },
  slide1: {
    width: windowWidth,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  text: {
    color: COLORS.black,
    fontSize: 18,
    marginVertical: 20,
    fontFamily: type.bold,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 20,
  },
});
