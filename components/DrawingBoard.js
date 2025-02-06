import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Path } from '@shopify/react-native-skia';

import loc from '../loc';
import { type } from '../theme/Fonts';
import {runOnJS} from "react-native-reanimated";

const DrawingBoard = (props) => {
  const color = '#06D6A0';
  const { colors } = useTheme();
  const [paths, setPaths] = useState([{ segments: [], color }]);

  const stylesHook = {
    advancedText: {
      color: colors.feeText,
    },
  };
  const onDrawing = (mode, g) => {
    const newPaths = paths.map((path) => ({
      ...path,
      segments: [...(path.segments || [])], // Копируем сегменты
    }));

    // Modes follow syntax of path on SVG: read more here https://css-tricks.com/svg-path-syntax-illustrated-guide/
    newPaths[paths.length - 1].segments.push(`${g.x} ${g.y}`);
    setPaths(newPaths);
    props.callbackPath(newPaths);
  };

  const pan = Gesture.Pan()
    .onStart((g) => {
      'worklet';
      // runOnJS(onDrawing)('M', g);
    })
    .onUpdate((g) => {
      'worklet';
      runOnJS(onDrawing)('L', g);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(setPaths)([...paths, { segments: [], color }]);
    })
    .minDistance(1);

  const onClearDrawingButtonClick = () => {
    setPaths([{ segments: [], color }]);
    props.callbackPath([{ segments: [], color }]);
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.entrophyContainer}>
        <Canvas style={styles.flex8} mode="default">
          {paths.map((p, index) => {
            return <Path key={index} path={p.segments.map((s, segmentIndex)=>segmentIndex === 0 ? 'M ' + s : 'L '+ s).join(' ')} strokeWidth={3} style="stroke" color={p.color}/>
          })}
        </Canvas>
        <TouchableOpacity onPress={onClearDrawingButtonClick} style={styles.undoButton}>
          <Text style={[styles.descText, stylesHook.advancedText]}>{loc.wallets.clear}</Text>
        </TouchableOpacity>
      </View>
    </GestureDetector>
  );
};
const styles = StyleSheet.create({
  flex8: {
    flex: 6,
  },
  entrophyContainer: {
    flex: 0.9,
    borderStyle: 'dashed',
    borderRadius: 1,
    borderWidth: 1,
    borderColor: 'black',
    marginHorizontal: 10,
  },
  descText: {
    marginHorizontal: 20,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: type.light,
    fontSize: 14,
  },
  undoButton: {
    borderStyle: 'dashed',
    borderRadius: 1,
    borderWidth: 1,
    borderColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});

export default DrawingBoard;
