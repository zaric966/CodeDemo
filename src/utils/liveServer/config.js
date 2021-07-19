/*
 * @Author: maoguijun
 * @Date: 2020-03-21 16:42:49
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-01-19 14:17:29
 * @FilePath: \minicode_app_rn\src\utils\liveServer\config.js
 */
import { get } from 'lodash';
import { Platform } from 'react-native';

import RNFS from '../react-native-fs';

const mcodes = ['mcode'];
const images = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
const videos = ['mp4', 'avi', 'mov', 'wmv', 'flv', '3gp', 'rmvb'];
const config = {
  host: 'http://127.0.0.1',
  port: '8080',
  path: Platform.OS === 'ios' ? RNFS.LibraryDirectoryPath : RNFS.DocumentDirectoryPath,
  fileType: (file) => {
    const reg = /.([\da-zA-Z]+)$/g;
    if (reg.test(get(file, 'name'))) {
      const name = RegExp.$1;
      if (mcodes.includes(name)) {
        return 'mcode';
      }
      if (videos.includes(name)) {
        return 'video';
      }
      if (images.includes(name)) {
        return 'image';
      }
    }
    return 'image';
  },
};

export default config;
