// 1100:应用宝-个人版
// 1150:华为应用商店-个人版
// 1200:VIVO应用商店-个人版
// 1250:OPPO应用商店-个人版
// 1300:小米应用商店-个人版
// 1350:360应用商店-个人版
// 1400:阿里开放平台-豌豆荚-个人版
// 1401:阿里开放平台-pp助手-个人版
// 1402:阿里开放平台-UC-个人版
// 1450:魅族应用商店-个人版

import { get } from 'lodash';
import { NativeModules } from 'react-native';
import config from './liveServer/config';
import reactNativeFs from './react-native-fs';

import RNFS from './react-native-fs';

/**
 * 返回对应渠道id的包名
 * @param {number} channelid 渠道ID
 * @returns {string} packageName
 */
const getPackageName = (channelid) => {
  let packageName = '';
  switch (channelid) {
    case '1100':
      packageName = 'com.tencent.android.qqdownloader';
      break;
    case '1150':
      packageName = 'com.huawei.appmarket';
      break;
    case '1200':
      packageName = 'com.bbk.appstore';
      break;
    case '1250':
      packageName = 'com.oppo.market';
      break;
    case '1300':
      packageName = 'com.xiaomi.market';
      break;
    case '1350':
      packageName = 'com.qihoo.appstore';
      break;
    case '1400':
      packageName = 'com.wandoujia.phoenix2';
      break;
    case '1401':
      packageName = 'com.pp.assistant';
      break;
    //   case 1402:  UC 没有 移动端app
    //     packageName = 'UC';
    //     break;
    case 1450:
      packageName = 'com.meizu.mstore';
      break;
    default:
      break;
  }
  console.log('package-utils', `渠道包对应的应用市场包名${packageName}`);
  return packageName;
};

const rootFolder = reactNativeFs.ExternalStorageDirectoryPath + reactNativeFs.externalRoot;

/**
 * 本地下载apk的文件全路径
 */
const apkFilePath = `${rootFolder}/miniCodeUpdate.apk`;

/**
 * 下载参数
 */
const parms = {
  fromUrl: 'https://download.miniaixue.com/download/minicode.apk',
  toFile: apkFilePath,
  // progressDivider: 25, // 上报次数为25
  progressInterval: 2000, // 2秒钟通知一次
  connectionTimeout: 60000 * 10, // 超时10分钟
  begin: (beginRes) => {
    console.log('开始下载了', beginRes);
    // 开始下载
    NativeModules.SystemNotificationModule.showNotification();
  },
  progress: (progressRes) => {
    console.log('下载中', progressRes);
    // 通知到导航栏进度条
    const progres = (progressRes.bytesWritten / progressRes.contentLength) * 100;
    NativeModules.SystemNotificationModule.updateNotification(Math.ceil(progres));

    // 强制更新才需要通知到进度条
    const stores = require('../stores').default;
    const state = stores.getState();
    const serviceData = get(state, ['updateApp', 'serviceData']);
    if (get(serviceData, 'isForce')) {
      const setProgress = get(stores, ['dispatch', 'updateApp', 'setProgress']);
      setProgress(Math.ceil(progres));
    }
  },
};

/**
 * 下载apk
 */
const downloadApk = async () => {
  // 确保下载的时候，删除本地的残留
  const isExist = RNFS.exists(apkFilePath);
  if (isExist) {
    console.log('getDownloadApkLocalPath', '删除本地apk了');
    await RNFS.unlink(apkFilePath);
  }

  try {
    await RNFS.mkdir(rootFolder);
  } catch (error) {
    console.warn('mkdir error', error);
  }

  const stores = require('../stores').default;
  const state = stores.getState();
  const serviceData = get(state, ['updateApp', 'serviceData']);
  parms.fromUrl = get(serviceData, 'downloadUrl');
  console.log('下载apk地址', parms.fromUrl);

  const changeDownloadFileFail = get(stores, ['dispatch', 'updateApp', 'changeDownloadFileFail']);
  changeDownloadFileFail(false);

  RNFS.downloadFile(parms)
    .promise.then((data) => {
      // 下载返回结果(还需要判断结果是否成功)
      console.log('任务完成', data);
      const statusCode = get(data, 'statusCode'); // HTTP 状态码
      if (statusCode !== 200) {
        NativeModules.SystemNotificationModule.failNotification();
        changeDownloadFileFail(true);
        console.log('下载失败', statusCode);
        return;
      }
      const changeDownloadFileSuccess = get(stores, [
        'dispatch',
        'updateApp',
        'changeDownloadFileSuccess',
      ]);
      // 更新下载成功状态
      changeDownloadFileSuccess(true);
      NativeModules.SystemNotificationModule.successNotification();

      // 强制更新：更新通知栏，延迟一秒钟再直接打开安装界面
      if (get(serviceData, 'isForce')) {
        setTimeout(() => {
          // 显示更新弹框（下载成功状态）
          const changeNeedUpdateHard = get(stores, [
            'dispatch',
            'updateApp',
            'changeNeedUpdateHard',
          ]);
          changeNeedUpdateHard(true);
          NativeModules.ApkInfoModule.exciteInstallApk(apkFilePath);
        }, 1000);
      }
    })
    .catch((err) => {
      // 下载出错时执行
      console.log('下载失败', err);
      NativeModules.SystemNotificationModule.failNotification();
      // 强制更新仍然需要通知到进度条为1，这样才能确保直接失败的时候出来点击重试的状态;
      if (get(serviceData, 'isForce')) {
        const setProgress = get(stores, ['dispatch', 'updateApp', 'setProgress']);
        setProgress(1);
      }
      changeDownloadFileFail(true);
    });
};

export { getPackageName, downloadApk, apkFilePath };
