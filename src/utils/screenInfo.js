/*
 * @Author: maoguijun
 * @Date: 2020-01-06 10:36:34
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-06-23 18:01:27
 * @FilePath: \minicode_app_rn\src\utils\screenInfo.js
 */
import { Dimensions, NativeModules, PixelRatio, Platform } from 'react-native';
import { iOSmodules } from '../native-modules/iOSModule';
import DisplayCutoutModule from '../native-modules/DisplayCutoutModule';

let {
  width: deviceWidth,
  height: deviceHeight,
  // scale: deviceScale,
} = Dimensions.get('screen');

const fontScale = PixelRatio.getFontScale();
const pixelRatio = PixelRatio.get(); // 设备的像素密度

// deviceWidth 修改为短的那一边
if (deviceWidth > deviceHeight) {
  [deviceWidth, deviceHeight] = [deviceHeight, deviceWidth];
}

/**
 * 设计稿的基准尺寸px （短的那一边）
 */
const widthX = 375;

/**
 * 缩放比例 （当前设备的逻辑像素DP/设计稿的基准像素PX）
 */
let scale = deviceWidth / widthX;

console.log(
  'ScreenInfo:',
  scale,
  deviceWidth,
  deviceHeight,
  deviceHeight / deviceWidth,
  pixelRatio,
  deviceWidth * pixelRatio,
  deviceHeight * pixelRatio,
  fontScale,
  deviceWidth / widthX
);

// 长、短边的比小于1.6，重新设置缩放比
if (deviceHeight / deviceWidth <= 1.6) {
  if (Platform.OS === 'ios') {
    scale = (deviceWidth * 1.5) / 768; // iOS：重新计算缩放比（768是iPad的短的那一边的逻辑像素）
  } else {
    scale /= 1.1; // Android：直接把缩放比例在原值的基础上扩大1.1倍
  }
}

/**
 * 屏幕适配,缩放size
 * @param {number} size 传入设计稿上的px
 * @returns {number} 逻辑像素
 */
export function scaleSize(size) {
  if (isIphone45()) {
    return size * scale * 0.9;
  }
  return size * scale;
}

/**
 * 设置字体的size（单位px）
 * @param {number} size 传入设计稿上的px
 * @returns {number} 返回实际sp
 */

export function setSpText(size) {
  return (size * scale) / fontScale;
}

/**
 * 屏幕适配,缩放size
 * @param {number} size 传入设计稿上的px
 * @returns {number} 逻辑像素
 */
export function scaleSizeForTwo(size) {
  if (deviceHeight / deviceWidth <= 1.8) {
    return size * scale * 0.9;
  } else {
    return size * scale;
  }
}

/**
 * 设置字体的size（单位px）
 * @param {number} size 传入设计稿上的px
 * @returns {number} 返回实际sp
 */
export function setSpTextForTwo(size) {
  if (deviceHeight / deviceWidth <= 1.8) {
    return (size * scale) / fontScale - 1;
  } else {
    return (size * scale) / fontScale;
  }
}

/**
 *  校验是否是全屏
 */
export function checkIsFullScreen() {
  if (isIphone45()) {
    return false;
  }
  const proportion = deviceHeight / deviceWidth;
  return proportion > 1.778;
}

/**
 * 判断设备是否为ipad
 */
export function isIpad() {
  const { RNBridgeToiOSModule } = NativeModules;
  if (Platform.OS === 'android') {
    return false;
  }
  if (RNBridgeToiOSModule === undefined) {
    return false;
  }
  return RNBridgeToiOSModule.isIpad;
}

/**
 * 判断设备是否为4.7寸的iphone
 */
export function isIphone45() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const { RNBridgeToiOSModule } = NativeModules;
  if (RNBridgeToiOSModule === undefined) {
    return false;
  }

  return RNBridgeToiOSModule.isIphone4_5;
}

export function isBangsScreen() {
  if (Platform.OS === 'android') {
    console.log('DisplayCutoutModule.isBangs', DisplayCutoutModule.isBangs);
    return DisplayCutoutModule.isBangs;
  } else {
    return iOSmodules.isIphoneX;
  }
}

export default {
  scaleSize,
  setSpText,
  deviceWidth,
  deviceHeight,
  checkIsFullScreen,
  isIpad,
  isIphone45,
};
