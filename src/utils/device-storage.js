/*
 * @Author: your name
 * @Date: 2021-05-28 09:03:13
 * @LastEditTime: 2021-06-22 15:32:07
 * @LastEditors: maoguijun
 * @Description: In User Settings Edit
 * @FilePath: \minicode_app_rn\src\utils\device-storage.js
 */
import AsyncStorage from '@react-native-community/async-storage';
import deviceInfo from 'react-native-device-info';

/**
 * 二次封装的AsyncStorage
 */
class DeviceStorage {
  // ---------------------- 存储常量key start----------------------
  /**
   * 启动顺序下的第二张图片（手机）
   */
  static LAUNCHAPP_SECOUND_IMG_PHONE = 'launchapp_secound_img_phone';

  /**
   * 启动顺序下的第二张图片（平板）
   */
  static LAUNCHAPP_SECOUND_IMG_TABLET = 'launchapp_secound_img_tablet';

  /**
   * 隐私协议版本号
   */
  static AGREEMENT_VERSION = 'agreement_version';

  /**
   * 应用环境key，存取的value都为String类型
   */
  static APP_ENV = 'appEnv';

  /**
   * 7天新人福利任务：用户完成任务的key前缀，存取value都为String类型
   */
  static BENEFIT_DIRTY = 'benefit_dirty';

  /**
   * 7天新人福利任务：任务配置数据
   */
  static BENEFIT_INFO = 'benefit_info';

  /**
   * 7天新人福利任务：用户完成数据
   */
  static BENEFIT_USER = 'benefit_user';

  /**
   * 改编气泡是否已经显示过了
   */
  static BUBBLE_ALREADY_SHOW = 'bubble_already_show';

  // 存储版本号
  static PRE_APP_VERSION = 'PreAppVersion';

  // 判断是否已经弹出Vip页面
  static SHOW_FIRST_VIP_PAGE = 'showFirstVipPage';

  // 判断是否弹出7天福利
  static SHOW_FIRST_WEFLARE_PAGE = 'showFirstWeflarePage';

  // 是否解压www.zip
  static IS_UNZIP_WWWZIP = 'IsUnZipWWWZip';

  // 是否是新安装第一次启动
  static IS_FIRST_START = 'isFirstStart';

  /**
   * 专题列表ID
   */
  static SPECIAL_IDS = 'specialIds';

  // 消息中心中是否显示推送提示界面
  static IS_SHOWPUSHTIPFLAG = 'isShowPushTipFlag';

  // 消息中心中是否显示推送提示界面
  static IS_SHOWPUSHTIPFLAG = 'isShowPushTipFlag';

  // ---------------------- 存储常量key end----------------------

  uniqueId;
  static getUniqueId = () => {
    if (this.uniqueId === undefined) {
      this.uniqueId = deviceInfo.getUniqueId();
    }
    return this.uniqueId;
  };

  /**
   * 获取
   * @param key
   * @returns {Promise<T>|*|Promise.<TResult>}
   */
  static get(key, callback) {
    return AsyncStorage.getItem(key, callback).then((value) => {
      const jsonValue = JSON.parse(value);
      return jsonValue;
    });
  }

  /**
   * 保存。注意不要保存大量数据！
   * @param key
   * @param value
   * @returns {Promise}
   */
  static save(key, value, callback) {
    return AsyncStorage.setItem(key, JSON.stringify(value), callback);
  }

  /**
   * 删除
   * @param key
   * @returns {*}
   */
  static delete(key) {
    return AsyncStorage.removeItem(key);
  }
}

export default DeviceStorage;
