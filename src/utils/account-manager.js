/* eslint-disable prettier/prettier */
import { Toast } from '@ant-design/react-native';
import { get, isArray } from 'lodash';
import MD5 from 'md5';
import moment from 'moment';
import { NativeModules, Platform } from 'react-native';
import deviceInfo from 'react-native-device-info';

import commands from '../mini-global/commands';
import Crypto from './crypto';
import doUntilLoaded from './doUntilLoaded';
import ENV from './env';
import JSON_SAFE from './json-safe';
import config from './liveServer/config';
import RNFS from './react-native-fs';
import Axios from './request';

const { RNInterface } = NativeModules;

const serviceChinaAccount = 'service_china_account';
const keyQuickLoginAccount = `key_qlogacc_${ENV.env}`;

const ENC_VER = '1.0';

const quicktokenPathAndroid = `${config.path}/quicktoken_${ENV.env}`;

function getSign(timeStamp, s2, uin) {
  return MD5(`${timeStamp}${s2}${uin}`);
}

function getCurrentTime() {
  return Math.floor(Date.now() / 1000);
}

let uniqueId;
const getUniqueId = () => {
  if (uniqueId === undefined) {
    uniqueId = deviceInfo.getUniqueId();
  }
  return uniqueId;
};

const getGuestDefaultAccInfo = () => {
  const createTime = Math.floor(Date.now() / 1000);
  return {
    uin: 1,
    nickName: '游客',
    exp: 0,
    gold: 0,
    createTime,
    roleInfo: {
      nickName: '游客',
      skinID: 0,
      model: 2,
    },
    star: 0,
    chapterLevelStar: {},
    unlockChapters: [],
  };
};

// type tokenInfo = {
//     token: string,
//     sign: string
// }

class AccountManager {
  constructor() {
    // this.currentUin = -1;
  }

  /*
   * 获取快速登录的uin
   * return
   *    有uin: Promise<uin>, uin为number
   *    无uin: Promise.reject(-1)
   */
  getQuickLoginUin = async () => {
    if (Platform.OS === 'ios') {
      const jsonInfo = await RNInterface.keychainGet(keyQuickLoginAccount, serviceChinaAccount);
      const obj = JSON_SAFE.parse(jsonInfo);
      // 如果有数据的话,需要写到本地token里
      if (obj && undefined !== obj.uin && obj.uin !== null && obj.uin !== 1) {
        await this.setLocalToken(obj.uin, obj.token, obj.sign, obj.accountBindTime);
        return obj.uin;
      }
      return -1;
    }
    const externalPath = quicktokenPathAndroid;
    let jsonInfo = await this._readFile(externalPath);
    if (jsonInfo.indexOf(ENC_VER) >= 0) {
      jsonInfo = await Crypto.decrypt(jsonInfo.slice(ENC_VER.length), '');
      console.log('getQuickLoginUindecrypt', jsonInfo);
    }

    console.log(`quicktoken:${jsonInfo}`);

    const obj = JSON_SAFE.parse(jsonInfo);
    if (obj && undefined !== obj.uin && obj.uin !== null && obj.uin !== 1) {
      await this.setLocalToken(obj.uin, obj.token, obj.sign, obj.accountBindTime);
      return obj.uin;
    }
    return -1;
  };

  /*
   * 设置上次登录uin
   * parameters:
   *      uin (number)
   * return:
   *      Promise<void>
   */
  setLastLoginUin = async (uin) => {
    const p = await this._getAccountPath();
    const obj = {
      uin,
    };
    await RNFS.writeFile(`${p}/lastuin`, JSON_SAFE.stringify(obj));
  };

  /*
   * 获得上次uin
   * return:
   *     有uin, Promise.resolve(uin), uin为number
   *     无uin, Promise.reject(-1)
   */
  getLastLoginUin = async () => {
    const p = await this._getAccountPath();
    let o = {};
    try {
      const s = await this._readFile(`${p}/lastuin`).catch(() => -1);
      o = JSON_SAFE.parse(s);
    } catch (error) {
      o.uin = undefined;
    }
    if (undefined === o.uin || o.uin === null) {
      return -1;
    }
    if (o.uin === 1) {
      let uin = await this.getQuickLoginUin();
      if (uin === 1) {
        uin = await this.reqQuickLoginUin();
      }
      return uin;
    }
    return o.uin;
  };

  /*
   * 存储快速登录uin和token(iOS存到keychain, Android存到externalStorage)
   * return Promise<void>
   */
  setQuickLoginTokenInfo = async (uin, token, sign, accountBindTime) => {
    console.log('setQuickLoginTokenInfo', uin, token, sign, accountBindTime);
    if (Platform.OS === 'ios') {
      const s = JSON_SAFE.stringify({
        uin,
        token,
        sign,
        accountBindTime,
      });
      await RNInterface.keychainSet(keyQuickLoginAccount, s, serviceChinaAccount);
      await this.setLocalToken(uin, token, sign, accountBindTime);
      return;
    }
    let s = JSON_SAFE.stringify({
      uin,
      token,
      sign,
      accountBindTime,
    });
    s = await Crypto.encrypt(s, '');
    s = ENC_VER + s;
    console.log('setQuickLoginTokenInfoencrypt ', s);
    const externPath = quicktokenPathAndroid;
    await RNFS.writeFile(externPath, s);
    await this.setLocalToken(uin, token, sign, accountBindTime);
  };

  /*
   * 检查游客uin目录,如果不存在则创建并存放一个默认的accInfo
   * return Promise<void>
   */
  checkGuestAcc = async () => {
    const p = await this._getUinPath(1);
    const file = await RNFS.exists(`${p}/acc_info`).catch(() => false);
    if (!file) {
      let s = JSON_SAFE.stringify(getGuestDefaultAccInfo());
      s = await Crypto.encrypt(s, 1);
      console.log('checkGuestAccencrypt', s);
      await RNFS.writeFile(`${p}/acc_info`, s);
    }
  };

  /*
   * 请求快速登录uin
   * return Promise<uin>
   */
  reqQuickLoginUin = async () => {
    // 请求完成后调this.setQuickLoginTokenInfo 存到keychain或者externalStorage
    // https://119.3.135.107:8079/miniw/auth?act=auth_new_reg&apiid=299&production_id=11000001&production_channelid=1&cltversion=5210&time=1585035596&sign=f42400d58439f2c0511d54131ee7d8d4
    const salt = '!@#$%^&*()QWERTYUIOPMNBVCXZitcast';
    const time = Math.floor(Date.now() / 1000);
    const str = time + salt;
    const sign = MD5(str);
    const url = `${ENV.authUrl}/miniw/auth?act=auth_new_reg&${ENV.MINI_METHOD_COMM_ARGS}&time=${time}&sign=${sign}`;
    const response = await Axios({
      url,
    }).catch(() => null);
    if (!response) {
      // await this.checkGuestAcc();
      return -1;
    }
    const retAuth = get(response, 'data');
    if (get(retAuth, ['code']) === 'OK') {
      const uin = get(retAuth, ['authinfo', 'Uin']);
      const token = get(retAuth, ['authinfo', 'token']);
      const sign = get(retAuth, ['authinfo', 'sign']);
      await this.setQuickLoginTokenInfo(uin, token, sign, 0);
      // 处理 游客账号信息
      // const guestAccInfo = await this._getLocalAccInfo(1);
      // await this._setLocalAccInfo(uin, guestAccInfo);
      return uin;
    }
    // await this.checkGuestAcc();
    return -1;
  };

  getAccountInfo = async (uin, phone) => {
    if (typeof uin === 'string') {
      uin = Number(uin);
      if (isNaN(uin)) {
        // uin = 1;
        return -1;
      }
    }
    const localAccInfo = await this._getLocalAccInfo(uin).catch(() => {});
    if (uin === 1) {
      return this._dbAccountToJSAccount({
        ...localAccInfo,
        _id: 1,
      });
    }
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(get(tokenInfo, 'sign'));
    const ts = Math.floor(Date.now() / 1000);
    const newSign = getSign(ts, s2, uin);
    const accountInfoRes = await Axios({
      url: `${ENV.serverSiriusUrl}/v1/account/login`,
      method: 'post',
      data: {
        uin: `${uin}`,
        phone,
        time: ts,
        s2t,
        sign: newSign,
      },
    }).catch(() => 0);
    const accountInfo = get(accountInfoRes, ['data', 'data']);
    const response = this._dbAccountToJSAccount({
      ...accountInfo,
      s2,
      s2t,
    });
    await this._setLocalAccInfo(uin, response);

    return {
      ...response,
      uin: `${uin}`,
      sign: newSign,
    };
  };

  /*
   * 参数:uin(number)
   * 返回accountInfo
   */
  getAccInfo = async (uin, phone) => {
    if (typeof uin === 'string') {
      uin = Number(uin);
      if (isNaN(uin)) {
        // uin = 1;
        return -1;
      }
    }
    const localAccInfo = await this._getLocalAccInfo(uin).catch(() => {});
    if (uin === 1) {
      return this._dbAccountToJSAccount({
        ...localAccInfo,
        _id: 1,
      });
    }
    // c++ 去检查要不要把游客本地作品转到当前账号
    // console.log('getAccInfo guestLocalBackupToUin 0 uin', uin);
    // await commands.guestLocalBackupToUin(uin);
    // console.log('getAccInfo guestLocalBackupToUin 1');
    // 如果上一次的uin === 1,则代表之前没有登录过一个真实的账号,数据直接合并
    let dirtyData = await this._getChapterDataDirty(1);
    console.log('getAccInfo uin = 1 ', dirtyData);
    let needClearDirtyUin1 = false;
    if (!dirtyData || !Object.keys({ ...dirtyData }).length) {
      dirtyData = await this._getChapterDataDirty(uin);
    } else {
      needClearDirtyUin1 = true;
    }
    const chapterLevelDirty = dirtyData.chapterLevelStar;
    const chapterLevelPassTimeDirty = dirtyData.chapterLevelPassTime;
    const templateRecordsDirty = dirtyData.templateRecord || [];
    let chapterLevelDirtyKeys = [];
    let unlockChaptersDirty = [];
    if (chapterLevelDirty) {
      chapterLevelDirtyKeys = Object.keys(chapterLevelDirty);
    }
    if (dirtyData.unlockChapters) {
      unlockChaptersDirty = dirtyData.unlockChapters;
    }

    const getAccountUrl = `${ENV.serverUrl}/aixue_accouts/get_account_info`; // potasksystem/my_infost
    const finishLevelUrl = `${ENV.serverUrl}/tasksystem/offline_finish_level`;
    const myTaskInfoUrl = `${ENV.serverUrl}/tasksystem/my_info?${ENV.MINI_METHOD_COMM_ARGS}`;
    const unlockChapterUrl = `${ENV.serverUrl}/tasksystem/offline_unlock_chapter`;
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(get(tokenInfo, 'sign'));
    const ts = Math.floor(Date.now() / 1000);
    const newSign = getSign(ts, s2, uin);

    let needClearDirty = false;
    // 上传章节解锁脏数据
    if (unlockChaptersDirty.length > 0) {
      await Axios({
        url: unlockChapterUrl,
        data: {
          uin,
          time: ts,
          s2t,
          sign: newSign,
          unlocks: unlockChaptersDirty,
        },
        method: 'post',
      })
        .then((_) => {
          needClearDirty = true;
        })
        .catch((_) => 0);
    }

    // 上传闯关脏数据
    if (chapterLevelDirtyKeys.length > 0) {
      const finishes = chapterLevelDirtyKeys.map((e) => {
        let chid = '';
        let lvid = '';
        const star = chapterLevelDirty[e];
        const passTime = chapterLevelPassTimeDirty[e];
        if (/(\w+)_(\w+)/.test(e)) {
          chid = RegExp.$1;
          lvid = RegExp.$2;
        }
        return {
          chapter_id: chid,
          level_id: lvid,
          star,
          pass_time: passTime,
        };
      });
      console.log('getAccInfo finishes', finishLevelUrl, {
        uin,
        time: ts,
        s2t,
        sign: newSign,
        finishes,
        production_channelid: ENV.miniMethodCommArgs.production_channelid,
        local_id: getUniqueId(),
      });
      await Axios({
        url: finishLevelUrl,
        data: {
          uin,
          time: ts,
          s2t,
          sign: newSign,
          finishes,
          production_channelid: ENV.miniMethodCommArgs.production_channelid,
          local_id: getUniqueId(),
        },
        method: 'post',
      })
        .then((_) => {
          console.log('getAccInfo finishes ok', _);
          needClearDirty = true;
        })
        .catch((_) => {
          console.log('getAccInfo finishes failed ', _);
          return 0;
        }); // 脏数据上传失败,忽略
    }

    // 上传模板点击的脏数据
    if (templateRecordsDirty.length > 0) {
      await this.uploadTemplateRecords(uin.toString(), templateRecordsDirty);
    }

    if (needClearDirty) {
      if (needClearDirtyUin1) {
        await this._clearChapterDataDirty(1);
      }
      await this._clearChapterDataDirty(uin);
    }

    // 请求account_info
    let fetchData = {
      sign: newSign,
      s2t,
      time: ts,
      uin,
      ...ENV.miniMethodCommArgs,
    };
    if (phone) {
      fetchData = { ...fetchData, phone_num: phone };
    }
    // Toast.info(`getAccountUrl:${getAccountUrl}`, Toast.SHORT, undefined, false);
    let response = await Axios({
      data: fetchData,
      url: getAccountUrl,
      method: 'post',
    }).catch(() => -1);
    if (response === -1) {
      // Toast.info(
      //   `localAccInfo.roleInfo: ${JSON_SAFE.stringify(localAccInfo)}`,
      //   Toast.SHORT,
      //   undefined,
      //   false
      // );
      if (!localAccInfo.roleInfo) {
        return -1;
      }
      return this._dbAccountToJSAccount({ ...localAccInfo, s2, s2t });
    }
    response = this._dbAccountToJSAccount({
      ...get(response, ['data', 'account_info']),
      s2,
      s2t,
    });

    // Toast.info(`myTaskInfoUrl: ${myTaskInfoUrl}`, Toast.SHORT, undefined, false);
    // 获取当前章节
    const myInfoRes = await Axios({
      params: {
        uin,
        sign: newSign,
        time: ts,
        s2t,
      },
      url: myTaskInfoUrl,
    }).catch(() => -1);
    // 日志信息内容太多了会丢失，建议在需要的时候打印
    // console.log("myInfoRes", myInfoRes);
    if (myInfoRes === -1) {
      response.currentChapter = '';
    } else {
      response.currentChapter = get(myInfoRes, ['data', 'info', 'curr_chapter']);
    }

    response.s2 = s2;

    await this._setLocalAccInfo(uin, response);
    return response;
  };

  // 异步上传模板字符串的上报次数
  uploadTemplateRecords = async (uin, array) => {
    // for (const { id, title, tag, use_times } of array) {
    //   await this.templateRecords({ id, title, tag, use_times });
    // }
    // console.log('array==', array);
    array.forEach(async ({ id, title, tag, use_times }) => {
      console.log('11===', id, title, tag, use_times);
      await this.templateRecords({ uin, _id: id, title, tag, recordsNumber: use_times });
    });
  };

  /*
   * 退出登录
   * parameters:
   *      uin (number)
   * return:
   *      Promise<void>
   */
  logout = async (uin) => {
    const accountPath = await this._getAccountPath();
    const uinPath = `${accountPath}/${uin}`;
    await RNFS.unlink(`${accountPath}/lastuin`).catch(() => null);
    await RNFS.unlink(`${uinPath}/token`).catch((err) => {
      console.log(429, err);
    });
  };

  clearTokenAndLastUin = async () => {
    if (Platform.OS === 'android') {
      const externalPath = quicktokenPathAndroid;
      return await RNFS.unlink(externalPath);
    }
    RNInterface.keychainDelete(keyQuickLoginAccount, serviceChinaAccount);
  };

  levelSucc = async ({ uin, chapterId, levelId, star, exp, gold, passTime }) => {
    console.log('levelSucc', uin, chapterId, levelId, star, exp, gold, passTime);
    passTime = passTime === undefined ? 0 : passTime;
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(tokenInfo.sign);
    const time = getCurrentTime();
    const newSign = getSign(time, s2, uin);
    const url = `${ENV.serverUrl}/tasksystem/finish_level`;
    const getLocal = async () => {
      const acc = await this._getLocalAccInfo(uin);
      return {
        star: acc.star,
        exp: acc.exp,
        gold: acc.gold,
        isLocal: true,
      };
    };
    const setDirtyChapterLev = async () => {
      await this._setChapterLevel({
        uin,
        chapterId,
        levelId,
        star,
        exp,
        gold,
        type: 1,
        passTime,
      });
    };
    const setNormalChapterLev = async () => {
      await this._setChapterLevel({
        uin,
        chapterId,
        levelId,
        star,
        exp,
        gold,
        type: 2,
        passTime,
      });
    };
    if (uin === 1) {
      await setNormalChapterLev();
      await setDirtyChapterLev();
      return await getLocal();
    }
    await setNormalChapterLev();
    return await Axios({
      url,
      method: 'post',
      data: {
        uin,
        s2t,
        sign: newSign,
        time,
        chapter_id: chapterId,
        level_id: levelId,
        star,
        pass_time: passTime,
        production_channelid: ENV.miniMethodCommArgs.production_channelid,
        local_id: getUniqueId(),
      },
    }).then(
      async (res) => {
        // console.log("levelSucc res = ", res);
        if (res.data && res.data.ret === 0) {
          await this._updateLocalAccInfo(uin, res.data.star, res.data.exp, res.data.gold);
          return {
            star: res.data.star,
            exp: res.data.exp,
            gold: res.data.gold,
            isLocal: false,
          };
        }
        await setDirtyChapterLev();
        return await getLocal();
      },
      async () => {
        await setDirtyChapterLev();
        return await getLocal();
      }
    );
  };

  levelFail = async ({ uin, chapterId, levelId, star, passTime }) => {
    passTime = passTime === undefined ? 0 : passTime;
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(tokenInfo.sign);
    const time = getCurrentTime();
    const newSign = getSign(time, s2, uin);
    const url = `${ENV.serverUrl}/tasksystem/finish_level_fail`;
    return await Axios({
      url,
      method: 'post',
      data: {
        uin,
        s2t,
        sign: newSign,
        time,
        chapter_id: chapterId,
        level_id: levelId,
        star,
        pass_time: passTime,
        production_channelid: ENV.miniMethodCommArgs.production_channelid,
        local_id: getUniqueId(),
      },
    });
  };

  // 模板创作上报点击次数

  templateRecords = async ({ uin, _id, title, tag, recordsNumber }) => {
    console.log('templateRecords', uin, _id, title, tag, recordsNumber);
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(tokenInfo.sign);
    const time = getCurrentTime();
    const newSign = getSign(time, s2, uin);
    const url = `${ENV.serverUrl}/workshop/save_template_record`;
    if (!get(window.netInfo, 'isConnected')) {
      return this._setTemplateRecord(uin, _id, title, tag, recordsNumber);
    }
    return await Axios({
      url,
      method: 'post',
      data: {
        _id,
        title,
        tag,
        uin,
        s2t,
        sign: newSign,
        time,
        use_times: recordsNumber,
      },
    }).then(async (res) => {
      // 上传模板后清空；
      const d = {};
      d.templateRecord = [];
      await this._setChapterDataDirty(uin, d);
      console.log('res', res);
    });
  };

  /*
   * 写入闯关信息
   */
  _setTemplateRecord = async (uin, _id, title, tag, recordsNumber) => {
    console.log('_setChapterLevel', uin);
    let d = {};
    d = await this._getChapterDataDirty(uin);
    if (!d.templateRecord) {
      d.templateRecord = [];
    }
    const templateRecordsOnly = {
      id: _id,
      title,
      tag,
      use_times: recordsNumber,
    };
    for (let i = 0; i < d.templateRecord.length; i++) {
      if (d.templateRecord[i].id === _id) {
        d.templateRecord[i].use_times += 1;
        console.log('d=====', d);
        return await this._setChapterDataDirty(uin, d);
      }
    }
    d.templateRecord.push(templateRecordsOnly);
    await this._setChapterDataDirty(uin, d);
  };

  unlockChapter = async (uin, chapterId) => {
    const tokenInfo = await this._getLocalToken(uin);
    const { s2, s2t } = this._getS2AndS2T(tokenInfo.sign);
    const time = getCurrentTime();
    const newSign = getSign(time, s2, uin);
    const url = `${ENV.serverUrl}/tasksystem/unlock_chapter`;
    const w = async () => {
      await this._setUnlockChapter(uin, chapterId, 1);
      await this._setUnlockChapter(uin, chapterId, 2);
    };
    if (uin === 1) {
      await w();
      return;
    }
    await w();
    const result = await Axios({
      url,
      method: 'post',
      data: {
        uin,
        sign: newSign,
        time,
        s2t,
        chapter_id: chapterId,
      },
    }).catch(() => 0);
    return result;
  };

  setLocalToken = async (uin, token, sign, accountBindTime) => {
    const uinPath = await this._getUinPath(uin);
    const expireTime = Math.round(moment().add(15, 'd').valueOf() / 1000);
    let s = JSON_SAFE.stringify({
      token,
      sign,
      accountBindTime,
      expireTime, // 过期时间，秒
    });
    s = await Crypto.encrypt(s, uin);
    await RNFS.writeFile(`${uinPath}/token`, s);
  };

  /**
   * 保存用户上次闯关记录
   *
   * @memberof AccountManager
   */
  setLastStartLevel = async (uin, chapter) => {
    const uinPath = await this._getUinPath(uin);
    const s = JSON_SAFE.stringify(chapter);
    return await RNFS.writeFile(`${uinPath}lastLevel`, s);
  };

  /**
   * 读取用户上次闯关记录
   *
   * @memberof AccountManager
   */
  getLastStartLevel = async (uin) => {
    const uinPath = await this._getUinPath(uin);

    const s = await RNFS.readFile(`${uinPath}lastLevel`);

    return JSON_SAFE.parse(s);
  };

  /**
   * 设置迷你世界的账号信息
   */
  setMiniWorldAccountUin = async (newUin) => {
    console.log('setMiniWorldAccountUin 设置迷你世界uin到C++ 1');
    const tokenInfo = await this._getLocalToken(newUin);
    doUntilLoaded(() => {
      console.log('setMiniWorldAccountUin 设置迷你世界uin到C++ 2');
      commands.setAccountUin(0, newUin, tokenInfo.token, tokenInfo.sign);
    }, 0);
  };

  /**
   * 存储用户的录播课程的进度
   *
   * @memberof AccountManager
   */
  setUserCourseCurrentStep = async (uin, courseId, lessonId, s) => {
    const uinPath = await this._getUinPath(uin);
    return await RNFS.writeFile(`${uinPath}courseCurrentStep_${courseId}_${lessonId}`, s);
  };

  /**
   * 获取用户的录播课程的进度
   *
   * @memberof AccountManager
   */
  getUserCourseCurrentStep = async (uin, courseId, lessonId) => {
    const uinPath = await this._getUinPath(uin);
    const s = await RNFS.readFile(`${uinPath}courseCurrentStep_${courseId}_${lessonId}`);
    return parseInt(s);
  };

  /**
   * 存储用户的vip系统课程的进度
   *
   * @memberof AccountManager
   */
  setUserVipCourseCurrentStep = async (uin, courseId, lessonId, s) => {
    const uinPath = await this._getUinPath(uin);
    return await RNFS.writeFile(`${uinPath}vipCourseCurrentStep_${courseId}_${lessonId}`, s);
  };

  /**
   * 获取用户的vip系统课程的进度
   *
   * @memberof AccountManager
   */
  getUserVipCourseCurrentStep = async (uin, courseId, lessonId) => {
    const uinPath = await this._getUinPath(uin);
    const s = await RNFS.readFile(`${uinPath}vipCourseCurrentStep_${courseId}_${lessonId}`);
    return parseInt(s);
  };

  /**
   * 获取当前设备上登陆过的所有迷你号
   *
   * @memberof AccountManager
   */
  getAllLoginedUsers = async () => {
    const p = await this._getAccountPath();
    const files = await RNFS.readDir(p);
    const users = [];
    if (!isArray(files)) {
      return users;
    }
    const newFiles = files.filter((item) => /\d{6,11}/gi.test(item.name));

    for (const file of newFiles) {
      if (!file.isDirectory()) {
        continue;
      }
      const acc = await RNFS.readFile(`${p}/${file.name}/acc_info`);
      const s = await Crypto.decrypt(acc, file.name);
      const obj = JSON_SAFE.parse(s);
      users.push(obj);
    }
    return users.filter(Boolean);
  };

  // ************* Private method *******************

  /*
   * 设置账号信息, 登录之后要调用
   */
  _setAccInfo = async (uin, accountInfo) => {
    // 设置到本地
    await this._setLocalAccInfo(uin, accountInfo);
    await this._setLastLoginUin(uin);
    // TODO:调用cpp接口设置uin(是否要等到游戏初始化完成)
    // commands.setAccountUin()
    // setAccountUin: (order, newUin, token, sign) =>
    // command.sendCommand(
    //     "setAccountUin",
    //     { order, newUin, token, sign },
    //     -1
    // ),
  };

  _getAccountPath = async () => {
    const p = `${RNFS.DocumentDirectoryPath}/account`;
    await RNFS.mkdir(p);
    return p;
  };

  _getUinPath = async (uin) => {
    const p = await this._getAccountPath();
    const p2 = `${p}/${uin}`;
    await RNFS.mkdir(p2);
    return p2;
  };

  _getLocalToken = async (uin) => {
    const uinPath = await this._getUinPath(uin);
    let s = await this._readFile(`${uinPath}/token`);
    if (s !== '{}') {
      s = await Crypto.decrypt(s, uin);
    }
    return JSON_SAFE.parse(s);
  };

  _getLocalLastLoginUin = async () => {
    const p = await this._getAccountPath();
    const s = await this._readFile(`${p}/lastuin`);
    const o = JSON_SAFE.parse(s);
    if (undefined === o.uin || o.uin === null) {
      return Promise.reject(-1);
    }
    return o.uin;
  };

  /*
   * 写入闯关信息
   */
  _setChapterLevel = async ({ uin, chapterId, levelId, star, exp, gold, type, passTime }) => {
    // {chapterLevelStar:{}, unlockChapters:[], chapterLevelPassTime:{}}
    console.log('_setChapterLevel', uin, chapterId, levelId, star, exp, gold, type, passTime);
    let d = {};
    if (type === 1) {
      d = await this._getChapterDataDirty(uin);
    } else {
      d = await this._getLocalAccInfo(uin);
    }
    if (!d.chapterLevelStar) {
      d.chapterLevelStar = {};
    }
    if (!d.chapterLevelPassTime) {
      d.chapterLevelPassTime = {};
    }
    const key = `${chapterId}_${levelId}`;
    let oldStar = d.chapterLevelStar[key];
    d.gold = d.gold || 10;
    d.exp = d.exp || 10;
    d.star = d.star || 0;

    if (oldStar === undefined || oldStar === null) {
      d.chapterLevelStar[key] = Number(star);
      d.gold += Number(gold);
      d.exp += Number(exp);
      d.star += Number(star);
    } else {
      oldStar = Number(oldStar);
      if (oldStar < Number(star)) {
        d.chapterLevelStar[key] = Number(star);
      }
    }
    d.chapterLevelPassTime[key] = passTime;

    if (type === 1) {
      await this._setChapterDataDirty(uin, d);
    } else {
      await this._setLocalAccInfo(uin, d);
    }
  };

  /*
   * 写入章节解锁数据
   * parameters:
   *      uin(number)
   *      chapterId(string)
   *      type(number), 1表示脏数据, 2表示本地账号数据
   */
  _setUnlockChapter = async (uin, chapterId, type) => {
    let d = {};
    if (type === 1) {
      d = await this._getChapterDataDirty(uin);
    } else {
      d = await this._getLocalAccInfo(uin);
    }
    if (!d.unlockChapters) {
      d.unlockChapters = [];
    }
    if (d.unlockChapters.includes(chapterId)) {
    } else {
      d.unlockChapters.push(chapterId);
      if (type === 1) {
        await this._setChapterDataDirty(uin, d);
      } else {
        await this._setLocalAccInfo(uin, d);
      }
    }
  };

  /*
   * 脏数据写入本地
   * parameters:
   *      uin(number)
   *      dirtyData: {chapter_level_star:{}, unlock_chapters:[], chapter_level_pass_time:{}}
   */
  _setChapterDataDirty = async (uin, dirtyData) => {
    const uinPath = await this._getUinPath(uin);
    let s = JSON_SAFE.stringify(dirtyData);
    s = await Crypto.encrypt(s, uin);
    console.log('_setChapterDataDirtyencrypt', s, uinPath);
    await RNFS.writeFile(`${uinPath}/acc_chap_data_dirty`, s);
  };

  /*
   * 获得本地脏数据
   * return Promise< {chapter_level_star:{}, unlock_chapters:[]} >
   */
  _getChapterDataDirty = async (uin) => {
    const uinPath = await this._getUinPath(uin);
    let s = await this._readFile(`${uinPath}/acc_chap_data_dirty`).catch(() => '{}');
    console.log('_getChapterDataDirty', s);
    if (s !== '{}') {
      s = await Crypto.decrypt(s, uin);
      console.log('_getChapterDataDirtydecrypt', s);
    }
    return JSON_SAFE.parse(s);
  };

  _clearChapterDataDirty = async (uin) => {
    console.log('_clearChapterDataDirty', uin);
    const uinPath = await this._getUinPath(uin);
    await RNFS.unlink(`${uinPath}/acc_chap_data_dirty`);
  };

  _updateLocalAccInfo = async (uin, star, exp, gold) => {
    const acc = await this._getLocalAccInfo(uin);
    acc.star = star;
    acc.exp = exp;
    acc.gold = gold;
    await this._setLocalAccInfo(uin, acc);
  };

  _setLocalAccInfo = async (uin, accInfo) => {
    const uinPath = await this._getUinPath(uin);
    let s = JSON_SAFE.stringify(accInfo);
    s = await Crypto.encrypt(s, uin);
    // TODO: 日志信息内容太多了会丢失，建议在需要的时候打印
    // console.log("_setLocalAccInfoencrypt", s);
    await this._writeFile(`${uinPath}/acc_info`, s);
  };

  _getLocalAccInfo = async (uin) => {
    const uinPath = await this._getUinPath(uin);
    let s = await this._readFile(`${uinPath}/acc_info`).catch(() => '{}');
    if (s !== '{}') {
      s = await Crypto.decrypt(s, uin);
      // TODO: 日志信息内容太多了会丢失，建议在需要的时候打印
      // console.log("_getLocalAccInfodecrypt", s);
    }
    return JSON_SAFE.parse(s);
  };

  _clearAccData = async (uin) => {
    const uinPath = await this._getUinPath(uin);
    await RNFS.unlink(uinPath);
  };

  _readFile = async (path) => {
    const s = await RNFS.readFile(path);
    if (s) {
      return s;
    }

    return '{}';
  };

  _writeFile = async (path, content) => {
    const file = await RNFS.exists(path).catch(() => false);
    if (file) {
      await RNFS.unlink(path).catch((_) => 0);
    }
    await RNFS.writeFile(path, content);
  };

  _getS2AndS2T(sign) {
    let s2 = '';
    let s2t = '';
    if (sign) {
      [s2, s2t] = sign.split('_');
    }
    return {
      s2,
      s2t,
    };
  }

  /*
   * 将DB的字段名统一换成驼峰形式
   */
  _dbAccountToJSAccount(accInfo = {}) {
    accInfo = { ...accInfo };
    if (!accInfo.roleInfo) {
      accInfo.roleInfo = {};
      accInfo.roleInfo.NickName = '游客';
      accInfo.roleInfo.SkinID = 0;
      accInfo.roleInfo.Model = 2;
    }
    const newAccInfo = { ...accInfo };
    newAccInfo.uin = newAccInfo.uin || accInfo._id || 1;
    newAccInfo.exp = newAccInfo.exp || accInfo.exp || 10;
    newAccInfo.gold = isNaN(newAccInfo.gold) ? 10 : newAccInfo.gold;
    newAccInfo.star = newAccInfo.star || 0;

    newAccInfo.nickName = newAccInfo.nickName || accInfo.nick_name || '游客';

    newAccInfo.createTime = newAccInfo.createTime || accInfo.create_time;

    newAccInfo.roleInfo = newAccInfo.roleInfo || accInfo.roleInfo;

    newAccInfo.roleInfo.nickName =
      newAccInfo.roleInfo.nickName || accInfo.roleInfo.NickName
        ? accInfo.roleInfo.NickName
        : '游客';

    newAccInfo.roleInfo.skinID =
      newAccInfo.roleInfo.skinID || accInfo.roleInfo.SkinID ? accInfo.roleInfo.SkinID : 0;

    newAccInfo.roleInfo.model =
      newAccInfo.roleInfo.model || accInfo.roleInfo.Model ? accInfo.roleInfo.Model : 2;

    newAccInfo.chapterLevelStar = newAccInfo.chapterLevelStar || accInfo.chapter_level_star;

    newAccInfo.unlockChapters = newAccInfo.unlockChapters || accInfo.unlock_chapters;
    newAccInfo.hasPassWard = newAccInfo.noPasswdFlag; // 是否设置过密码 0设置过，1，2表示没有
    return newAccInfo;
  }
}

export default new AccountManager();
