/*
 * @Author: maoguijun
 * @Date: 2020-04-03 20:11:53
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-01-19 14:22:05
 * @FilePath: \minicode_app_rn\src\utils\log.js
 */
import moment from 'moment';

import RNFS from './react-native-fs';

const today = moment().format('YYYY-MM-DD');
// import RNFS from "react-native-fs";
const path = RNFS.DocumentDirectoryPath + '/log';

export default async (string) => {
  const hasPath = await RNFS.exists(path).catch(() => false);
  if (!hasPath) {
    RNFS.mkdir(path);
  }
  string = `${moment().format('YYYY-MM-DD HH:mm:ss')} -> ${string} \n`;
  const haslog = await RNFS.exists(`${path}/${today}.log`).catch(() => false);
  if (!haslog) {
    RNFS.writeFile(`${path}/${today}.log`, string);
  }
  RNFS.write(`${path}/${today}.log`, string);
};
