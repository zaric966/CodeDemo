/*
 * @Author: maoguijun
 * @Date: 2020-02-26 12:26:37
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-09 21:58:39
 * @FilePath: \minicode_app_rn\src\imageManager\index.js
 */
import { get } from 'lodash';
// import { PixelRatio } from 'react-native';
import imageData from './imageData.js';
import imageName from './imageName.json';

const _404_NOT_EXIST = '404-not-exist'

// let pixelRatio = PixelRatio.get() > 2 ? 3 : 2;

const getImage = (path) => {
  if (!path) {
    console.log(`图片 path 错误: ${path}, Forced to '${_404_NOT_EXIST}'`);
    return _404_NOT_EXIST
  }

  return get(imageData, path, _404_NOT_EXIST);
};

export { getImage, imageName };
