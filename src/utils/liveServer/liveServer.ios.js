/*
 * @Author: maoguijun
 * @Date: 2020-01-15 15:07:04
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-09 11:12:05
 * @FilePath: \minicode_app_rn\src\utils\liveServer\liveServer.ios.js
 */
import { get, result } from 'lodash';
import { NativeEventEmitter, NativeModules } from 'react-native';
import StaticServer from 'react-native-static-server';
import { unzip } from 'react-native-zip-archive';

import { eventType } from '../message';
import RNFS from '../react-native-fs';
import config from './config';
import AsyncStorage from '@react-native-community/async-storage';
import AppConstant from '../../app-constant';
import ConfigPlatform from 'react-native-config';
import DeviceStorage from '../device-storage';
import Toast from 'react-native-root-toast';
import JSON_SAFE from '../json-safe';
import { minicodeMobileStart } from '../analysis';
import mlog from '../mlog';

const { path, fileType, port } = config;
const filePath = `${RNFS.MainBundlePath}/assets/assets`;

const NativeModulesByIOS = NativeModules.RNZipArchive;
const NativeNotificationMoudule = new NativeEventEmitter(NativeModulesByIOS);
// console.log('filepath=' + filePath);

/**
 * 处理路劲不存在的问题
 * @param {string} rootPath // 确定肯定有的路径
 * @param {string} string // 需要合并的路径
 */
const resolvePath = async (rootPath, string) => {
  const path = string.split('/').filter((item) => item);
  const run = async (rp, p) => {
    if (!p || p.length === 0) {
      return `${rp}/`;
    }
    const newPath = `${rp}/${p[0]}`;
    p.shift();
    const file = await RNFS.exists(newPath).catch(() => false);
    if (!file) {
      await RNFS.mkdir(newPath);
    }
    return run(newPath, p);
  };
  const result = await run(rootPath, path);
  return result;
};
class LiveServer {
  // 接收解压后的通知 不然会崩溃
  subscription = NativeNotificationMoudule.addListener('zipArchiveProgressEvent', (reminder) => {
    // console.log('收到了监听');
  });

  /**
   * 启动次数
   *
   * @memberof LiveServer
   */
  startNumber = 0;

  startServer = async () => {
    await this.copyAssetsToDocumentDirPath();
    mlog.app_log_info('liveServer.ios', 'copyAssetsToDocumentDirPath success');
    await this.copyPagesToDocumentDirPath();
    mlog.app_log_info('liveServer.ios', 'copyPagesToDocumentDirPath success');
    this.server = new StaticServer(port, path, {
      localOnly: true,
      keepAlive: false,
    });

    if (this.startNumber++ >= 3) {
      Toast.info('静态服务启动失败，请重新启动app', {
        position: Toast.positions.CENTER,
      });
      mlog.app_log_err('liveServer.ios', '静态服务启动失败，请重新启动app');
      return;
    }
    const url = await this.server.start().catch(async () => {
      await this.reStartServer();
    });
    if (!url) {
      return;
    }
    const MWContext = require('../../mini-global/mwcommand-context');
    MWContext.eventBus.emit(eventType.staticServerLoaded);
    MWContext.staticServerLoaded = true;
    console.log('static Server running', url);
    mlog.app_log_info('liveServer.ios', `Server running success, url: ${url}`);
  };

  copyPagesToDocumentDirPath = async () => {
    const hasWebCache = await RNFS.exists(`${path}/accountpage/accountInfo/index.html`);
    if (!hasWebCache) {
      try {
        await unzip(`${filePath}/accountpage.zip`, `${path}/accountpage`); // 解压
      } catch (error) {
        await RNFS.unlink(`${path}/accountpage`);
        mlog.app_log_err('liveServer.ios', `accountpage 解压失败 err:${error}`);
      }
    }
    // 课时报告
    const ability = await RNFS.exists(`${path}/themehomeworkreport/ability.html`);
    if (!ability) {
      await RNFS.unlink(`${path}/themehomeworkreport`);
      try {
        await unzip(`${filePath}/themehomeworkreport.zip`, `${path}/themehomeworkreport`); // 解压
      } catch (error) {
        await RNFS.unlink(`${path}/themehomeworkreport`);
        mlog.app_log_err('liveServer.ios', `themehomeworkreport 解压失败 err: ${error}`);
        // await run();
      }
    }
  };

  // 第一次安装解压一次，热更新后解压一次，其它情况下不用解压
  copyAssetsToDocumentDirPath = async () => {
    const www = RNFS.exists(`${path}/www`);
    if (!www) {
      RNFS.mkdir(`${path}/www`);
    }
    // 解压的三大条件 1热更 2.文件不存在 3.新版本更新
    const updateFlag = await AsyncStorage.getItem('UpdateWWWWhenCodePushUpdate');
    // 是否已经存在
    const hasWebCache = await RNFS.exists(`${path}/www/index.html`);
    // 安装新版本的时候
    const preAppVersion = await AsyncStorage.getItem(DeviceStorage.PRE_APP_VERSION);
    const isUnzip =
      !hasWebCache || updateFlag === '1' || ConfigPlatform.VERSION_NAME !== preAppVersion;
    if (isUnzip) {
      DeviceStorage.save(DeviceStorage.IS_UNZIP_WWWZIP, true);
      minicodeMobileStart({
        newinstall: window.newinstall, // 0 是非新安装 1 是新安装
        stage: updateFlag === '1' ? '30.03' : '30.02',
        ret: '0',
      });
      if (updateFlag === '1') {
        try {
          const codePushPath = `${path}/Application Support/CodePush/codepush.json`;
          const currentJson = await RNFS.readFile(codePushPath);
          const current = JSON_SAFE.parse(currentJson === undefined ? '' : currentJson);
          const currentPackage = get(current, 'currentPackage');
          await RNFS.unlink(`${path}/www`);
          const wwwzip = `${path}/Application Support/CodePush/${currentPackage}/CodePush/assets/assets/www/www.zip`;
          await unzip(wwwzip, `${path}/www`);
          // android热更解压完成
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: '30.3',
            ret: '0',
          });
        } catch (error) {
          // android热更解压完成
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: '30.3',
            ret: '1',
          });
          // 如果读取新文件失败了，就还是走原来的
          await unzip(`${filePath}/www/www.zip`, `${path}/www`); // 解压
        }
        AsyncStorage.setItem('UpdateWWWWhenCodePushUpdate', '0');
      } else {
        try {
          await unzip(`${filePath}/www/www.zip`, `${path}/www`); // 解压
          if (ConfigPlatform.VERSION_NAME !== preAppVersion) {
            AsyncStorage.setItem(DeviceStorage.PRE_APP_VERSION, ConfigPlatform.VERSION_NAME);
          }
          // iOS热更解压完成
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: '30.2',
            ret: '0',
          });
        } catch (error) {
          // iOS热更解压失败
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: '30.2',
            ret: '1',
          });
        }
      }
    } else {
      DeviceStorage.save(DeviceStorage.IS_UNZIP_WWWZIP, false);
    }
  };

  reStartServer = async () => {
    this.server.stop();
    this.startServer();
  };
}

export default new LiveServer();
