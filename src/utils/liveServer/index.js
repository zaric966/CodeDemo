/*
 * @Author: maoguijun
 * @Date: 2020-03-21 16:41:18
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-05-17 19:00:24
 * @FilePath: \minicode_app_rn\src\utils\liveServer\index.js
 */
import '../../../assets/www/www.zip';

import { Platform } from 'react-native';

import RNFS from '../react-native-fs';
import android from './liveServer.android';
import ios from './liveServer.ios';

// TODO 当初好像需要解决章节中的图片加载不全的问题，注释掉看下有啥问题！！！
// RNFS.readDir(RNFS.CachesDirectoryPath).then((files) => {
//   if (Array.isArray(files)) {
//     files.forEach((file) => {
//       RNFS.unlink(file.path);
//     });
//   }
// });

export default Platform.OS === 'ios' ? ios : android;
// export default android;
