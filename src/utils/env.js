/*
 * @Author: maoguijun
 * @Date: 2020-03-18 15:16:21
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-04-19 18:25:46
 * @FilePath: \minicode_app_rn\src\utils\env.js
 * @ 环境变量的配置
 */

import { NativeModules, Platform } from 'react-native';
import Config from 'react-native-config';

// Android渠道配置在config.json文件后，还需要在[ApkInfoModule]设置后才能取到!!!
const channelid =
  Platform.OS === 'android' ? NativeModules.ApkInfoModule.CHANNE_ID : Config.CHANNE_ID;

const miniMethodCommArgs = {
  apiid: '299',
  channel: '299', // 打点用的这个参数，而没用apiid
  production_channelid: channelid, // android:1001~2000,  ios:2001~3000
  production_id: '11000001',
  cltversion: '10496',
  platform: Config.ANDROID_PLATFORM ? '1' : '2',
  country: 'CN',
  version: `${Config.analysisEnv}_${Config.VERSION_NAME}`, // 和pc端保持一致的版本号
};

const MINI_METHOD_COMM_ARGS = Object.entries(miniMethodCommArgs)
  .map(([key, value]) => `${key}=${value}`)
  .join('&');
console.log('react-native-config Config:', Config);
export default {
  ...Config,
  CHANNE_ID: channelid,
  MINI_METHOD_COMM_ARGS,
  miniMethodCommArgs,
  authInfoStorage: {},
  analysisUrl: `http://statistics.miniaixue.com/minicode_statistics.php?${MINI_METHOD_COMM_ARGS}`,
  jsonErrAnalysisUrl: `http://statistics.miniaixue.com/minicode_statistics_jsonerr.php?${MINI_METHOD_COMM_ARGS}`,
  scratchLogAnalysisUrl: `http://statistics.miniaixue.com/minicode_statistics_scratch_log.php?${MINI_METHOD_COMM_ARGS}`,
};
