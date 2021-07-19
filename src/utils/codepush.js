/*
 * @Author: maoguijun
 * @Date: 2020-03-10 12:29:09
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-05-18 21:01:58
 * @FilePath: \minicode_app_rn\src\utils\codepush.js
 */
import { get, isArray, isFunction } from 'lodash';
import codePush from 'react-native-code-push';
import { NativeModules, Platform } from 'react-native';

/**
 *  codepush 封装
 */
class CodePush {
  codePushOptions = {
    checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
    ...Platform.select({
      // ios: {
      //   deploymentKey: NativeModules.RNBridgeToiOSModule.codePushKey,
      // },
    }),

    installMode: codePush.InstallMode.IMMEDIATE,
    // updateDialog: {
    //   appendReleaseDescription: true,
    //   descriptionPrefix: '版本描述: ',
    //   essentialContinueButtonLabel: '安装',
    //   essentialUpdateMessage: '当前有新的版本，请更新',
    //   optionalInstallButtonLabel: '安装',
    //   optionalIgnoreButtonLabel: '暂不安装',
    //   optionalUpdateMessage: '当前有可用更新，您是否立即更新？',
    //   title: '更新',
    // },
    updateDialog: null,
  };

  // 时间集合
  listeners = {};

  // 抛出对象
  returnObj = {
    codePushOptions: this.codePushOptions,
  };

  //
  addEventListener = (name, callback) => {
    // this.listeners.push(callback);
    this.listeners[name] = Object.assign([], this.listeners[name]);
    if (!isFunction(callback)) {
      console.error('addEventListener 的 callback 必须是 Function');
    }
    this.listeners[name].push(callback);
  };

  //
  publishListener = (name) => {
    if (!isArray(get(this, ['listeners', name]))) {
      return;
    }
    const listeners = get(this, ['listeners', name]);
    listeners.forEach((cb) => {
      if (!isFunction(cb)) {
        return;
      }
      cb(this.returnObj);
    });
  };

  /**
   * 检查状态
   *
   * @memberof CodePush
   */
  codePushCheckUpdate = async () => {
    const update = await codePush.checkForUpdate().catch((err) => {
      return false;
    });

    console.log(80, update);

    // if (!update) {
    //   console.log('当前是最新版本！');
    //   return false;
    // }

    this.sync(this.codePushOptions);
    return true;
  };

  /**
   *
   *
   * @memberof CodePush
   */
  sync = (options) => {
    codePush.sync(options, this.onSyncStatusChange, this.onDownProgressChange);
  };

  /**
   * 状态变化
   *
   * @memberof CodePush
   */
  onSyncStatusChange = (status) => {
    this.returnObj.status = status;
    this.publishListener('status');
  };

  /**
   * 下载状态
   *
   * @memberof CodePush
   */
  onDownProgressChange = (progress) => {
    this.returnObj.progress = progress;
    this.publishListener('progress');
  };
}
export default new CodePush();
