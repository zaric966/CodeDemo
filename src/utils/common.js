/*
 * @Author: maoguijun
 * @Date: 2021-07-05 10:10:35
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-07-10 11:41:10
 * @FilePath: \minicode_app_rn\src\utils\common.js
 */
import CameraRoll from '@react-native-community/cameraroll';
import { get, isArray, isObject, set, split } from 'lodash';
import moment from 'moment';
import zhCn from 'moment/locale/zh-cn';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import ConfigPlatform from 'react-native-config';
import Toast from 'react-native-root-toast';

import AppConstant from '../app-constant';
import OrientationModule from '../native-modules/OrientationModule';
import SettingsModule from '../native-modules/SettingsModule';
import { routePath } from '../routePath';
import { requesPermission } from './androidPermission';
import env from './env';
import JSON_SAFE from './json-safe';
import config from './liveServer/config';
import localBackup from './local-backup';
import reactNativeFs from './react-native-fs';

// import { gameBusinessType } from '../containers/game';

// import CameraRoll from '@react-native-community/cameraroll';

let workSpace;

moment.updateLocale('zh-cn', zhCn);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成遍历器
 * @param {Array} arr
 */
export const generateIterator = (arr) => {
  if (!Array.isArray(arr)) {
    return;
  }
  return arr[Symbol.iterator]();
};

/**
 * 将数字格式化成  K M B
 * @param {String|Number} source
 */
export const getNumber = (source) => {
  if (typeof source !== 'string' && typeof source !== 'number') {
    // console.error('formatNumber 接受的参数必须是Number 或者 String 类型');

    return 0;
  }
  source = parseInt(source, 10);
  if (Number.isNaN(source)) {
    source = 0;
  }
  const danwei = generateIterator(['K', 'M', 'B']); // 千 百万  十亿

  const run = (num, dan = '') => {
    if (typeof num !== 'number') {
      return num;
    }
    if (num < 1000) {
      return num + dan;
    }
    const result = Math.round(num / 1000, 10);
    const danw = danwei.next().value;
    if (result < 1000) {
      return result + danw;
    }
    return run(result, danw);
  };
  return run(source);
};

/**
 * 格式化时间
 * 1. 当天显示 多久前， 例如 1个小时前
 * 2. 第二天显示 前一天
 * 3. 超过第二天则显示月日  例如 5月6日
 * 4. 跨年则显示 年月日 例如 2018年6月5日
 * @param {Number || Moment || String} time
 */
export const formatTime = (time) => {
  if (!time) {
    time = moment();
  }
  if (typeof time === 'string' || typeof time === 'number') {
    time = moment(time);
  }
  const currentTime = moment();
  const days = currentTime.diff(time, 'days');
  const years = currentTime.diff(time, 'years');
  if (days === 0) {
    return time.fromNow();
  }
  if (days === 1) {
    return '1 天前';
  }
  if (years === 0) {
    return time.format('MM月DD日');
  }
  return time.format('YYYY年MM月DD日');
};


/**
 *
 * 消息时间
 * @returns
 */
export const msgFormatTime = (time) => {
  if (!time) {
    time = moment();
  }
  if (typeof time === 'string' || typeof time === 'number') {
    time = moment(time);
  }
  const currentTime = moment();

  const currentTimeStr = currentTime.format('YYYYMMDD');
  const givedDate = new Date(time);
  const givedDateStr = moment(givedDate).format('YYYYMMDD');
  if (currentTimeStr === givedDateStr) {
    return time.format('今天  HH:mm');
  }

  return time.format('MM/DD  HH:mm');
};

// 1. 60分钟以内，显示 MM分钟前。
// 2. 超过60分钟，处于当天的，显示 今日 HH:MM。
// 3. 今天之前的，显示 MM月DD日 HH:MM 。

export const creationFormatTime = (time) => {
  if (!time) {
    time = moment();
  }
  if (typeof time === 'string' || typeof time === 'number') {
    time = moment(time);
  }
  const currentTime = moment();
  const diffMinutes = currentTime.diff(time, 'minutes');

  const days = currentTime.diff(time, 'days');
  const years = currentTime.diff(time, 'years');

  if (diffMinutes < 60) {
    return time.fromNow();
  }

  if (days < 0) {
    const todayData = time.format('HH:MM');
    return `今日 ${todayData}`;
  }

  return time.format('MM月DD日 HH:MM');
};

/**
 *
 * @param {array} target
 * @param {array} arr
 */
export const combineArray = (target = [], arr = []) => {
  const targetObject = {};
  target.forEach((item) => {
    targetObject[item._id] = item;
  });
  arr.forEach((item) => {
    if (targetObject[item._id]) {
      const obj = targetObject[item._id];
      targetObject[item._id] = {
        ...obj,
        ...item,
      };
    } else {
      targetObject[item._id] = item;
    }
  });
  return Object.values(targetObject);
};

/**
 *
 * @param {Array} target  //目标数组
 * @param  {...Array<Array>} rest // 需要合并的数组
 */
export const formatArray = (target, ...rest) => {
  if (!Array.from(rest).length) {
    return target;
  }
  const run = (tar, arr) => {
    const restArr = arr.slice(1);
    const list = combineArray(tar, arr[0]);
    if (restArr.length > 0) {
      return run(list, arr.slice(1));
    }
    return list;
  };
  return run(target, rest);
};

// formatArray(
//   [{ _id: 1, a: 15 }, { _id: 4 }],
//   [{ _id: 1, b: 13 }, { _id: 5 }],
//   [{ _id: 1, _deleted: true }]
// );

/**
 *
 * @param {array} target
 * @param {array} arr
 */
export const compackArray = (target = [], arr = []) => {
  const targetObject = {};
  arr.forEach((item) => {
    targetObject[item._id] = item;
  });
  return target.map((item) => {
    if (targetObject[item._id]) {
      item = {
        ...targetObject[item._id],
        ...item,
      };
    }
    return item;
  });
};

/**
 * 做或运算，取出一个符合的数组
 * @param  {...any} args 参数按优先级依次传入
 */
export const needArray = (...args) => {
  let result = [];

  for (const i in args) {
    if (isArray(args[i]) && args[i].length) {
      result = args[i];
      break;
    }
  }

  return result;
};

/**
 * 做或运算，取出一个符合的对象
 * @param  {...any} args 参数按优先级依次传入
 */
export const needObject = (...args) => {
  let result = {};

  for (const i in args) {
    if (isObject(args[i]) && Object.keys(args[i]).length) {
      result = args[i];
      break;
    }
  }

  return result;
};

/**
 * 数字格式化。
 * 0000-k;
 * 00000-w
 */
export const numFormat = (num) => {
  const numStr = String(num);
  if (numStr.length < 4) {
    return numStr;
  }
  if (numStr.length < 5) {
    const shortNumStr = numStr.substring(0, 2);
    return `${parseInt(shortNumStr, 10) / 10}K`;
  }
  const shortNumStr = numStr.substring(0, numStr.length - 3);
  return `${parseInt(shortNumStr, 10) / 10}w`;
};

/**
 *
 * @param {string} name
 * @param {string|number} value
 * @param {number} time
 */
export const createWindowVarWithTime = (name, value = 1, time = 2) => {
  window[name] = value;
  window[`${name}timer`] = setTimeout(() => {
    window[name] = undefined;
    clearTimeout(window[`${name}timer`]);
  }, time * 1000);
};
//打开微信
export const copyCodeToWeixin = async () => {
  // ios
  if (Platform.OS === 'ios') {
    const result = await NativeModules.RNBridgeToiOSModule.isAppInstall(AppConstant.SCHEME_WEIXIN);
    const content = result
      ? '已复制微信号到剪切板，即将打开微信'
      : '已复制微信号到剪切板，请打开微信添加';
    // Toast.show(content, Toast.SHORT, undefined, false);
    if (result) {
      const toastTimeout = setTimeout(() => {
        NativeModules.RNBridgeToiOSModule.openAppStoreURL(AppConstant.SCHEME_WEIXIN);
        clearTimeout(toastTimeout);
      }, 2 * 1000);
    }
    return;
  } else {
    // android
    const isInstaalled = await NativeModules.ApkInfoModule.isInstalled(
      AppConstant.WECHAT_PACKAGE_NAME
    );
    const toastText = isInstaalled
      ? '已复制微信号到剪切板，即将打开微信'
      : '已复制微信号到剪切板，请打开微信添加';
    // Toast.show(toastText, Toast.SHORT, undefined, false);

    if (isInstaalled) {
      const toastTimeout = setTimeout(() => {
        NativeModules.ApkInfoModule.openActivity(
          AppConstant.WECHAT_PACKAGE_NAME,
          AppConstant.WECHAT_LAUNCHER_ACTIVITY
        );
        clearTimeout(toastTimeout);
      }, 2 * 1000);
    }
  }
};

export const mapLoadFlag = {
  reloadTimes: 1,
  init: () => {
    this.reloadTimes = 1;
  },
};

/**
 *
 * @param {*} url
 * @param {*} history
 * @param {*} coursesListWithUser
 * @param {*} enterLevel
 * @param {*} fromType  非必填 1：工坊公告 2：首页公告 3:推送
 * @returns
 */
export const jumpToRoute = async (url, history, coursesListWithUser, fromType) => {
  const store = await import('../stores');
  const {
    default: { dispatch },
  } = store;
  //webview打开
  if (/^http[s]?/.test(url)) {
    const newUrl = getUrlWhenOpenVipPage(url, fromType);
    const setVipPageVisible = get(dispatch, ['home', 'setVipPageVisible']);
    const setVipWebViewUrl = get(dispatch, ['home', 'setVipWebViewUrl']);
    setVipWebViewUrl(newUrl);
    setVipPageVisible(true);
    // history.push({
    //   pathname: routePath.vipPage,
    //   params: { url: newUrl },
    // });
    return;
  }

  // aixueApp 开头的在爱学里跳转路由
  if (/^\/aixueApp?/.test(url)) {
    const newUrl = url.replace('/aixueApp', '');

    //跳转到消息中心
    if (/\/message_system$/.test(newUrl)) {
      const changeShowMessageCenterPage = get(dispatch, [
        'messageCenter',
        'changeShowMessageCenterPage',
      ]);
      changeShowMessageCenterPage(true);
      return;
    }

    //跳转录播课的课包列表
    // /curriculum_list
    if (/\/curriculum_list$/.test(newUrl)) {
      history.push(routePath.curriculumList);
      return;
    }

    //跳转录播课的课时
    // /curriculum_list=60190cdcf477444ff5116fbc
    if (/^\/curriculum_list=/.test(newUrl)) {
      const curCurriculum_id = newUrl.replace('/curriculum_list=', '');
      const courses = coursesListWithUser.find(
        (item) => get(item, 'course_id') === curCurriculum_id
      );
      const onPurchasedForFree = get(dispatch, ['curriculum', 'onPurchasedForFree']);
      const setTypeTag = get(dispatch, ['courseBuy', 'setTypeTag']);
      if (!isObject(courses)) {
        Toast.info('该课程不存在', Toast.SHORT, undefined, false);
        return;
      }
      //该课程没有购买过
      if (get(courses, ['lessons', 'length']) === 0) {
        console.log('课程没购买过', get(courses, ['lessons', 'length']));
        // 免费课程购买
        if (get(courses, ['shop_info', 'now_price']) === '0.00') {
          console.log('课程免费', get(courses, ['shop_info', 'now_price']));
          const purChaseResult = await onPurchasedForFree(get(courses, ['shop_info', 'shop_id']));

          if (get(purChaseResult, ['data', 'code']) === 0) {
            //购买成功以后设置当前的课包
            history.push({
              pathname: routePath.curriculumDetail + get(courses, 'course_id'),
              params: {
                from_type: fromType,
              },
            });
          } else {
            Toast.info('购买失败', Toast.SHORT, undefined, false);
          }
        } else {
          console.log('课程需付费', get(courses, ['lessons', 'length']));
          setTypeTag(get(courses, 'typeTag'));
          history.push({
            pathname: routePath.curriculumDetail + get(courses, 'course_id'),
            params: {
              shopId: get(courses, ['shop_info', 'shop_id']),
              from_type: fromType,
              fromPath: 'home',
              courseInfo: courses,
            },
          });
          // setVideoCourseGuide(0);
        }
        // history.push(routePath.curriculumList);
        return;
      }
      console.log('课程购买过', get(courses, ['lessons', 'length']));
      history.push({
        pathname: routePath.curriculumDetail + curCurriculum_id,
        params: { from_type: fromType },
      });

      return;
    }

    // 跳转到作品详情
    if (/^\/workshop_details\//.test(newUrl)) {
      const setWorkDetailId = get(dispatch, ['workDetail', 'setWorkDetailId']);
      const parameter = newUrl.split('/');
      const id = parameter[parameter.length - 1];
      setWorkDetailId(id);
      history.push(routePath.workshopDetail + id);
      return;
    }

    // 跳转到专题详情
    if (/^\/workshop_special\//.test(newUrl)) {
      const setSpecialWorks = get(dispatch, ['workShopSpecial', 'setSpecialWorks']);
      const setSpecials = get(dispatch, ['workShopSpecial', 'setSpecials']);
      const parameter = newUrl.split('/');
      const id = parameter[parameter.length - 2];
      const specialName = parameter[parameter.length - 1];
      setSpecialWorks(id);
      setSpecials({ name: specialName });
      history.push(routePath.workshopSpecial + id);
      return;
    }
    // 跳转到创作新作品
    // if (/^\/workshop_create/.test(newUrl)) {
    //   const setCreateWorkVisible = get(dispatch, ['creation', 'setCreateWorkVisible']);
    //   if (!(await workSpace.checkIsLocalWorkSpaceEnough())) {
    //     return;
    //   }
    //   history.push(routePath.creation);
    //   setCreateWorkVisible(true);

    //   return;
    // }

    Toast.fail('无法识别的地址', Toast.SHORT, undefined, false);
  }
  Toast.fail('无法识别的地址', Toast.SHORT, undefined, false);
};

//549秒转为9:09
export const formatCountdown = (time) => {
  const countDownMinute = Math.floor(time / 60);
  const countDownSecond = time % 60;
  let countdownTime = '';
  if (countDownMinute > -1) {
    if (countDownSecond > 9) {
      countdownTime = `${countDownMinute}:${countDownSecond}`;
    } else {
      countdownTime = `${countDownMinute}:0${countDownSecond}`;
    }
  } else {
    countdownTime = '00:00';
  }
  return countdownTime;
};

export const saveImgTolocal = async (imgUrl) => {
  let result;
  let describle = '';
  if (Platform.OS === 'ios') {
    result = await NativeModules.SettingsModule.requestAbumPermission().catch((e) => {});
    describle = '请您先去设置允许App访问您的相册 设置>隐私>照片';
  } else {
    result = await requesPermission(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    describle = '请先同意权限申请';
  }
  if (!result) {
    // Toast.info(describle, Toast.SHORT, undefined, false);
    return;
  }
  const url = `${
    Platform.OS === 'ios' ? reactNativeFs.LibraryDirectoryPath : reactNativeFs.DocumentDirectoryPath
  }/cache/wechatQrCodeImage.png`;
  // 安卓上url必须是本地路径
  if (Platform.OS === 'android') {
    await reactNativeFs.downloadFile({
      fromUrl: imgUrl,
      toFile: url,
    }).promise;
  }
  const res = await CameraRoll.save(Platform.OS === 'android' ? url : imgUrl).catch(
    () => undefined
  );

  if (res) {
    // Toast.success('已保存到相册', Toast.SHORT, undefined, false);
    return;
  }
  // Toast.fail('保存失败', Toast.SHORT, undefined, false);
};

//倒计时1min关闭app
const setAiCountdownTip = async () => {
  const store = await import('../stores');
  const {
    default: { dispatch },
  } = store;
  // const setAiParams = get(dispatch, ['aiAssistant', 'setAiParams']);

  // setAiParams({
  //   aiAssistantShow: true,
  //   placement: 'bottomLeft',
  //   textLines: 2,
  //   text: '还有1分钟要休息了哦 \n记得先保存好你的作品',
  //   style: {
  //     top: '68%',
  //     left: '84%',
  //   },
  // });
  // //5s后关闭提示
  // setTimeout(() => {
  //   setAiParams({
  //     aiAssistantShow: false,
  //   });
  // }, 5000);
};

//每一分钟写入
const setPlaySeconds = async () => {
  const store = await import('../stores');
  const {
    default: { dispatch },
  } = store;
  const setCountDownRest = get(dispatch, ['parentCenter', 'setCountDownRest']);
  const setIsShowRest = get(dispatch, ['parentCenter', 'setIsShowRest']);

  const stores = require('../stores').default;
  const rootState = stores.getState();
  const isShowRest = get(rootState, ['parentCenter', 'isShowRest']);

  //当前在休息的时候不需要计时

  if (isShowRest) {
    return;
  }

  const { uin } = { ...window.userInfo };
  const fileName = `/${uin}.txt`;
  const curUinRestrictJson = await reactNativeFs.readFile(config.path + fileName);
  const curUinRestrict = JSON_SAFE.parse(curUinRestrictJson);

  const currentTimestamp = new Date().getTime();
  const { isProtectEye, currentPlaySeconds, settingData, timestamp, todayCurrentPlay } =
    curUinRestrict;
  let newCurrentPlaySeconds = 0;
  let newTodayCurrentPlay = 0;
  let newIsProtectEye = isProtectEye || false;
  let newSettingData = settingData || 86400;
  const curRestTime = timestamp ? Math.floor((currentTimestamp - timestamp) / 1000) : 600;

  //间隔大于2min，则加0
  const durationSeconds =
    currentTimestamp - timestamp > 120000 ? 0 : Math.floor((currentTimestamp - timestamp) / 1000);

  //
  if (!curUinRestrict || !isProtectEye || curRestTime > 600) {
    //距离上次登录超过10min&&没有开启护眼模式&&本地没有记录
    newCurrentPlaySeconds = 0;
    newTodayCurrentPlay = todayCurrentPlay + durationSeconds;
  } else {
    newCurrentPlaySeconds = currentPlaySeconds + durationSeconds;
    newTodayCurrentPlay = todayCurrentPlay + durationSeconds;
  }

  console.log('writeJson22====', settingData, currentPlaySeconds);

  //快到设置时间还剩1min
  // if (isProtectEye) {
  //   if (settingData - currentPlaySeconds < 60) {
  //     setAiCountdownTip();
  //   }
  // }

  //休息10min
  if (isProtectEye) {
    if (currentPlaySeconds > 0 && currentPlaySeconds > settingData) {
      setIsShowRest(true);
      //是否时关闭进程后计时
      if (durationSeconds > 120) {
        setCountDownRest(curRestTime);
      } else {
        setCountDownRest(600);
      }
      return;
    } else if (settingData - currentPlaySeconds < 60) {
      setAiCountdownTip();
    }
  }

  //判定是否为同一天
  if (
    new Date(timestamp).toLocaleDateString() !== new Date(currentTimestamp).toLocaleDateString()
  ) {
    console.log('判定是否为同一天====');
    newTodayCurrentPlay = 0;
  }

  const writeJson = JSON_SAFE.stringify({
    settingData: newSettingData, //护眼模式设置的时间
    isProtectEye: newIsProtectEye, //是否开启护眼模式
    timestamp: new Date().getTime(), //当前时间戳
    currentPlaySeconds: newCurrentPlaySeconds,
    todayCurrentPlay: newTodayCurrentPlay, //今天学习的时间
  });
  console.log('writeJson====', writeJson);

  reactNativeFs.writeFile(config.path + fileName, writeJson);
};

//全局定时器
//获取家长中心的设置
export const getSettingTime = async () => {
  if (this.intervalRest) {
    clearInterval(this.intervalRest);
  }
  this.intervalRest = setInterval(() => setPlaySeconds(), 60000);
};

export const getStringLength = (str) => {
  if (str == null) {
    return 0;
  }
  if (typeof str !== 'string') {
    str += '';
  }
  return str.replace(/[^\x00-\xff]/g, '01').length;
};

export const getVipUrl = (
  hostUrl,
  fromType = undefined,
  orderId = undefined,
  courseIdx = undefined
) => {
  const isVip = get(window.userInfo, ['vipInfo', 'isVip']);
  const uin = get(window, ['userInfo', 'uin']);
  const time = Math.floor(Date.now() / 1000);
  const s2 = get(window, ['userInfo', 's2']);
  const s2t = get(window, ['userInfo', 's2t']);
  const sign = localBackup.getSign(time, s2, uin);
  const minicodePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const minicodeVersion = ConfigPlatform.VERSION_NAME;
  const minicodeChannel = env.CHANNE_ID;
  let urlAddress = '';
  let orderIdStr = '';
  if (orderId !== undefined) {
    urlAddress = 'vip-order-confirm';
    orderIdStr = '&orderId=' + orderId;
  } else {
    urlAddress = isVip ? 'vip-center' : 'vip-activity-detail';
  }
  const fromTypeStr = fromType !== undefined ? '&fromType=' + fromType : '';
  const courseIdxStr = courseIdx !== undefined ? '&courseIdx=' + courseIdx : '';

  const url =
    `${hostUrl}/${urlAddress}?` +
    'uin=' +
    uin +
    '&time=' +
    time +
    '&s2t=' +
    s2t +
    '&sign=' +
    sign +
    '&minicodePlatform=' +
    minicodePlatform +
    '&minicodeVersion=' +
    minicodeVersion +
    '&minicodeChannel=' +
    minicodeChannel +
    fromTypeStr +
    orderIdStr;
    courseIdxStr;
  return url;
};

export const getStudyRecordUrl = (hostUrl, fromType = undefined) => {
  const uin = get(window, ['userInfo', 'uin']);
  const time = Math.floor(Date.now() / 1000);
  const s2 = get(window, ['userInfo', 's2']);
  const s2t = get(window, ['userInfo', 's2t']);
  const sign = localBackup.getSign(time, s2, uin);
  const minicodePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const minicodeVersion = ConfigPlatform.VERSION_NAME;
  const minicodeChannel = env.CHANNE_ID;
  const fromTypeStr = fromType !== undefined ? '&fromType=' + fromType : '';
  const url =
    `${hostUrl}/learning-record?` +
    'uin=' +
    uin +
    '&time=' +
    time +
    '&s2t=' +
    s2t +
    '&sign=' +
    sign +
    '&minicodePlatform=' +
    minicodePlatform +
    '&minicodeVersion=' +
    minicodeVersion +
    '&minicodeChannel=' +
    minicodeChannel +
    fromTypeStr;
  return url;
};

export const getUrlWhenOpenVipPage = (hostUrl, fromType = undefined) => {
  if (hostUrl === undefined || typeof hostUrl !== 'string') {
    return '';
  }
  let url = hostUrl;
  if (hostUrl.indexOf('?') === -1) {
    url = url + '?';
  }
  if (url.indexOf('&') !== -1) {
    url = url + '&';
  }
  const uin = get(window, ['userInfo', 'uin']);
  const time = Math.floor(Date.now() / 1000);
  const s2 = get(window, ['userInfo', 's2']);
  const s2t = get(window, ['userInfo', 's2t']);
  const sign = localBackup.getSign(time, s2, uin);
  const minicodePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const minicodeVersion = ConfigPlatform.VERSION_NAME;
  const minicodeChannel = env.CHANNE_ID;
  const fromTypeStr = fromType !== undefined ? '&fromType=' + fromType : '';

  url =
    url +
    'uin=' +
    uin +
    '&time=' +
    time +
    '&s2t=' +
    s2t +
    '&sign=' +
    sign +
    '&minicodePlatform=' +
    minicodePlatform +
    '&minicodeVersion=' +
    minicodeVersion +
    '&minicodeChannel=' +
    minicodeChannel +
    fromTypeStr;
  return url;
};

export const getSplitUrlToMap = (loadUrl) => {
  let cancelData = {};
  const index = loadUrl.indexOf('?');
  if (index !== -1) {
    const urlitem = loadUrl.substring(index + 1);
    const itemLength = get(urlitem, 'length', 0);
    if (itemLength > 0) {
      const arr = split(urlitem, '&');
      const arrlength = get(arr, 'length', 0);
      if (arrlength > 0) {
        for (let i = 0; i < arrlength; i++) {
          const itemMapStr = get(arr, i, '');
          const itemMapArr = split(itemMapStr, '=');
          const itemMapArrLength = get(itemMapArr, 'length', 0);
          if (itemMapArrLength >= 2) {
            const key = get(itemMapArr, 0, '');
            const value = get(itemMapArr, 1, '');
            set(cancelData, key, value);
          }
        }
      }
    }
  }
  return cancelData;
};

// 切换到竖屏
export const switchPortrait = () => {
  if (Platform.OS === 'android') {
    OrientationModule.lockToPortrait();
  } else {
    SettingsModule.switchPortrait(true);
  }
};

// 切换到横屏
export const switchLandscape = () => {
  if (Platform.OS === 'android') {
    OrientationModule.lockToLandscape();
  } else {
    SettingsModule.switchPortrait(false);
  }
};
