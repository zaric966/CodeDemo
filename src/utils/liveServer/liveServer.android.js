/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/*
 * @Author: maoguijun
 * @Date: 2020-01-15 15:07:04
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-09 11:11:58
 * @FilePath: \minicode_app_rn\src\utils\liveServer\liveServer.android.js
 */
import StaticServer from 'react-native-static-server';
import { unzip } from 'react-native-zip-archive';

import { eventType } from '../message';
import RNFS from '../react-native-fs';
import config from './config';
import AsyncStorage from '@react-native-community/async-storage';
import ConfigPlatform from 'react-native-config';
import DeviceStorage from '../device-storage';
// 添加一个引用，不然文件不会自动存放在Android的raw目录下
import accountpage from '../../../assets/accountpage.zip';
import Toast from 'react-native-root-toast';
import JSON_SAFE from '../json-safe';
import { get } from 'lodash';
import { minicodeMobileStart } from '../analysis';
import mlog from '../mlog';

const { path, fileType, port } = config;

/**
 * 处理路径不存在的问题
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
  /**
   * 启动次数
   *
   * @memberof LiveServer
   */
  startNumber = 0;

  startServer = async () => {
    await this.copyAssetsToDocumentDirPath();
    mlog.app_log_info('liveServer.android', 'copyAssetsToDocumentDirPath success');
    await this.copyPagesToDocumentDirPath();
    mlog.app_log_info('liveServer.android', 'copyPagesToDocumentDirPath success');
    this.server = new StaticServer(port, path, {
      localOnly: true,
      keepAlive: true,
    });

    if (this.startNumber++ >= 3) {
      Toast.show('静态服务启动失败，请重新启动app', {
        position: Toast.positions.CENTER,
      });
      mlog.app_log_err('liveServer.android', '静态服务启动失败，请重新启动app');
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
    mlog.app_log_info('liveServer.android', `Server running success, url: ${url}`);
  };

  copyAssetsToDocumentDirPath = async () => {
    // scratch 的代码
    let files = [];
    try {
      files = await RNFS.readDir(`${path}/www`);
    } catch (error) {
      await RNFS.mkdir(`${path}/www`); // 新建www 文件
      files = await RNFS.readDir(`${path}/www`);
    }
    // 解压的三大条件 1热更 2.文件不存在 3.新版本更新
    const updateFlag = await AsyncStorage.getItem('UpdateWWWWhenCodePushUpdate');
    const hasWebCache = await RNFS.exists(`${path}/www/index.html`);
    const preAppVersion = await AsyncStorage.getItem(DeviceStorage.PRE_APP_VERSION);
    const isUnzip =
      !hasWebCache || updateFlag === '1' || ConfigPlatform.VERSION_NAME !== preAppVersion;

    if (isUnzip) {
      DeviceStorage.save(DeviceStorage.IS_UNZIP_WWWZIP, true);
      for (const item of files) {
        await RNFS.unlink(item.path);
      }
      // scratch开始解压
      minicodeMobileStart({
        newinstall: window.newinstall, // 0 是非新安装 1 是新安装
        stage: updateFlag === '1' ? '30.03' : '30.02',
        ret: '0',
      });
      if (updateFlag === '1') {
        try {
          const currentJson = await RNFS.readFile(`${path}/CodePush/codepush.json`);
          const current = JSON_SAFE.parse(currentJson);
          const currentPackage = get(current, 'currentPackage');
          await RNFS.copyFile(
            `${path}/CodePush/${currentPackage}/CodePush/raw/assets_www_www.zip`,
            `${path}/www/www.zip`
          ); // 拷贝文件到
        } catch (error) {
          // 如果读取新文件失败了，就还是走原来的
          await RNFS.copyFileRes('raw/assets_www_www.zip', `${path}/www/www.zip`); // 拷贝文件到
        }
      } else {
        await RNFS.copyFileRes('raw/assets_www_www.zip', `${path}/www/www.zip`); // 拷贝文件到
      }
      const run = async () => {
        try {
          await unzip(`${path}/www/www.zip`, `${path}/www`); // 解压
          await RNFS.unlink(`${path}/www/www.zip`);
          files = await RNFS.readDir(`${path}/www`);
          // android热更解压完成
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: updateFlag === '1' ? '30.3' : '30.2',
            ret: '0',
          });
        } catch (error) {
          // await run();
          minicodeMobileStart({
            newinstall: window.newinstall, // 0 是非新安装 1 是新安装
            stage: updateFlag === '1' ? '30.3' : '30.2',
            ret: '1',
          });
        }
      };
      await run();
      if (updateFlag === '1') {
        await AsyncStorage.setItem('UpdateWWWWhenCodePushUpdate', '0');
      } else if (ConfigPlatform.VERSION_NAME !== preAppVersion) {
        AsyncStorage.setItem(DeviceStorage.PRE_APP_VERSION, ConfigPlatform.VERSION_NAME);
      }
    } else {
      DeviceStorage.save(DeviceStorage.IS_UNZIP_WWWZIP, false);
    }
  };

  copyPagesToDocumentDirPath = async () => {
    const hasWebCache = await RNFS.exists(`${path}/accountpage/accountInfo/index.html`);
    if (!hasWebCache) {
      await RNFS.unlink(`${path}/accountpage`);
      await RNFS.copyFileRes('raw/assets_accountpage.zip', `${path}/accountpage.zip`); // 拷贝文件到

      try {
        await unzip(`${path}/accountpage.zip`, `${path}/accountpage`); // 解压
        await RNFS.unlink(`${path}/accountpage.zip`);
      } catch (error) {
        mlog.app_log_err('liveServer.android', `accountpage 解压失败 err:${error}`);
        // await run();
      }
    }
    // 课时报告
    const ability = await RNFS.exists(`${path}/themehomeworkreport/ability.html`);
    if (!ability) {
      await RNFS.unlink(`${path}/themehomeworkreport`);
      await RNFS.copyFileRes(
        'raw/assets_themehomeworkreport.zip',
        `${path}/themehomeworkreport.zip`
      ); // 拷贝文件到

      try {
        await unzip(`${path}/themehomeworkreport.zip`, `${path}/themehomeworkreport`); // 解压
        await RNFS.unlink(`${path}/themehomeworkreport.zip`);
      } catch (error) {
        mlog.app_log_err(
          'liveServer.android',
          `themehomeworkreport 解压失败 err: ${error}`
        );
        // await run();
      }
    }
  };

  reStartServer = async () => {
    await this.server.stop();
    await this.startServer();
  };
}

export default new LiveServer();
