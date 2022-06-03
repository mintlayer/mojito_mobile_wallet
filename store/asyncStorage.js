import AsyncStorage from '@react-native-async-storage/async-storage';

export const setIntroSliderFlage = async (value = false) => {
  try {
    await AsyncStorage.setItem('@intro_slide', value);
  } catch (e) {
    // saving error
  }
};

export const getIntroSliderFlage = async (cbSuccess) => {
  try {
    const value = await AsyncStorage.getItem('@intro_slide');

    cbSuccess(value);
  } catch (e) {
    // error reading value
  }
};

let isIntroSlide = true;
export const setFlage = (type = true) => {
  isIntroSlide = type;
};
export const getFlage = () => {
  return isIntroSlide;
};
