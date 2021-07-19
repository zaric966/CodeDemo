/*
 * @Author: maoguijun
 * @Date: 2020-03-26 14:28:14
 * @LastEditors: panyunfei
 * @LastEditTime: 2021-06-23 15:17:58
 * @FilePath: \minicode_rn\src\utils\mcode-manager.js
 */
import commands from '../mini-global/commands';
import AccountManager from './account-manager';
import config from './liveServer/config';
import localBackup from './local-backup';
import LocalCourse from './local-course';
import log from './log';
import {
  eventType,
  messageType,
  sendMessageToMinicodeWeb,
  messageTargetType,
  webMessageType,
} from './message';
import RNFS from './react-native-fs';
import ResourceCache from './resource-cache';
import { get, isFunction, isObject } from 'lodash';
import Toast from 'react-native-root-toast';

// import Axios from "axios";
const { path: staticPath, host, port } = config;
const baseUrl = `${host}:${port}`;

class MCodeManager {
  constructor() {
    const MWContext = require('../mini-global/mwcommand-context');
    MWContext.eventBus.on(messageType.deleteSb3, () => {
      this.deleteSb3();
    });

    this.enterCourseRet = null; // 用来记录v2版本最近一次进入课时任务的结果，主要为了处理点击下一关而直接使用老场景不调用任何进入场景接口的情况下，返回结果
  }

  /**
   * 闯关地图
   */
  enterWork = async (uin, mcodeUrl) => this.enterLevel(uin, mcodeUrl);

  // 做改编开源作品的前置工作：拷贝作品到本地
  // 参数：
  // mcodeUrl 要改编的mcode url
  // ori_info 原始作者信息，格式：{uin, owid, nickname, worksname}
  // last_info 上一次作者信息，格式：{uin, owid, nickname, worksname}
  // 返回值：成功Promise<mapid> 失败Promise<error>
  recomposeMCode = (mcodeUrl, ori_info, last_info) =>
    localBackup.recomposeMCode(mcodeUrl, ori_info, last_info);

  /*
   * 参数: uin(number), mcodeUrl(string)
   * 返回值: Promise<{itemUnlock,name,url}>
   * 异常: error(number or string), number的话是HTTP status
   */
  enterLevel = async (uin, mcodeUrl) => {
    const MWContext = require('../mini-global/mwcommand-context');
    log(`mcodeUrl   ${mcodeUrl}`);
    // console.log(1234,mcodeUrl);

    // pyf 由于保存退出后， 界面上马上就可以点击进入作品, 这时候可能上个场景还没有保存完， 需要等待一下。
    if (localBackup.saveMapProcLock > 0) {
      console.log('enterLevel wait last save call finishi!');
      // 上传一个日志看看
      MWContext.jsonErrAnalysis({
        type: 'minicode_enterLevel_error',
        msg: 'enterLevel when saveMap Procing!',
      });
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
          if (localBackup.saveMapProcLock == 0) {
            clearInterval(intervalId);
            resolve('ok');
          }
        }, 1000);
      });
      await waitSaveMapCanProc;
    }

    MWContext.mapLoaded = false;
    const { path } = await ResourceCache.getUrlRes(mcodeUrl).catch(
      (e) => {} // 返回一个空path
    );
    if (!path) {
      return Promise.reject({ msg: '地图加载失败，请检查网络状况后再重试!' });
    }
    const date = new Date();
    const mcodePath = path;
    const sb3Path = `${staticPath}/minicode.sb3`;
    const bSb3Exist = await RNFS.exists(sb3Path).catch((e) => Promise.reject(e));
    if (bSb3Exist) {
      await RNFS.unlink(sb3Path);
    }
    const url = `${baseUrl}/minicode.sb3`;
    // let url;
    // if (Platform.OS === "android") {
    //     url = baseUrl + "/minicode.sb3";
    // } else {
    //     //iOS上有缓存问题 暂时解决方法为在url后面加上当前时间 使每次加载的url都不一样
    //     url = baseUrl + "/minicode.sb3?time=" + date;
    // }
    console.log(`enterLevel sb3Path: ${sb3Path}`);
    console.log(`enterLevel sb3Url: ${url}`);
    localBackup.needSaveNewMapBackUp = false;
    await commands.preDestoryWorld();
    const waitTimerP = new Promise((reslove, reject) => {
      setTimeout(() => {
        reslove();
      }, 100);
    });
    await waitTimerP;
    const result = await commands.enterLevel(`${uin}`, mcodePath, sb3Path);
    if (!(result.hasOwnProperty('name') && result.name != undefined)) {
      // 进入作品失败了， 可能是下载的mcode 有问题， 清理掉资源再提示玩家重试
      await ResourceCache.delCachedRes(mcodeUrl).catch(() => false);
      return Promise.reject({ msg: '地图加载失败，请检查网络状况后再重试!' });
    }
    // MWContext.allRolesAdded = false;
    const { itemUnlock, name } = result;

    return {
      itemUnlock,
      name,
      url,
    };
  };

  // webview通知删除sb3
  deleteSb3 = async () => {
    const sb3Path = `${staticPath}/minicode.sb3`;
    const bSb3Exist = await RNFS.exists(sb3Path).catch((e) => Promise.reject(e));
    if (bSb3Exist) {
      await RNFS.unlink(sb3Path);
    }
  };

  /*
   * 参数: mcodeUrl(string), tutorialUrl(string)
   * 返回值: Promise<{itemUnlock,name,url}>
   * 异常: error(number or string), number的话是HTTP status
   */
  enterExampleMCode = async (mcodeUrl, tutorialUrl, strPblTargetId = '', strPblStepId = '') => {
    const MWContext = require('../mini-global/mwcommand-context');
    const { uin } = { ...window.userInfo };
    console.log('mcodeUrl', mcodeUrl);
    MWContext.mapLoaded = false;
    const { path } = await ResourceCache.getWorkShopUrlRes(mcodeUrl).catch((e) =>
      Promise.reject({ msg: '模板地图加载失败，请重试!' })
    );
    if (!path) {
      return Promise.reject({ msg: '模板地图加载失败，请检查网络状况后再重试!' });
    }
    const date = new Date();
    const mcodePath = path;
    const sb3Path = `${staticPath}/minicode.sb3`;
    const url = `${baseUrl}/minicode.sb3`;
    // let url;
    // if (Platform.OS === "android") {
    //     url = baseUrl + "/minicode.sb3";
    // } else {
    //     //iOS上有缓存问题 暂时解决方法为在url后面加上当前时间 使每次加载的url都不一样
    //     url = baseUrl + "/minicode.sb3?time=" + date;
    // }
    console.log(`enterExampleMCode sb3Path: ${sb3Path}`);
    console.log(`enterExampleMCode sb3Url: ${url}`);
    const result = await commands.enterLevel(`${uin}`, mcodePath, sb3Path);
    if (!(result.hasOwnProperty('name') && result.name != undefined)) {
      // 进入作品失败了， 可能是下载的mcode 有问题， 重新掉资源再提示玩家重试
      await commands.downloadCacheDo(mcodeUrl, 1, 1);
      return Promise.reject({ msg: '模板地图加载失败，请检查网络状况后再重试!' });
    }
    await commands.setUndoOperationSwitch(true);
    MWContext.allRolesAdded = false;
    console.log('enterExampleMCode enterLevel ret', result);
    // const result = await localBackup.enterLocalBackup("32238024898382");
    const { itemUnlock, name, mapId } = result;
    localBackup.needSaveNewMapBackUp = true;
    localBackup.tutorialUrl = tutorialUrl;
    localBackup.fileName = name;
    localBackup.strPblTargetId = strPblTargetId;
    localBackup.strPblStepId = strPblStepId;
    return {
      itemUnlock,
      name,
      url,
      mapId,
    };
  };

  // openFor : 打开的原因， normal modify(改编)
  enterCourseHW = async (mcodeUrl, lessonId, taskId, openFor = 'normal') => {
    const { uin } = { ...window.userInfo };
    console.log('enterCourseHW', mcodeUrl, lessonId, taskId);
    // 先检查本地列表是否存在作业
    const hwList = await commands.getCourseHomeWorkList(`${uin}`);
    // #define JMI_KEY_COURSE_PKG_ID ("coursePkgId")
    // #define JMI_KEY_COURSE_ID ("courseId")
    // #define JMI_KEY_COURSE_CREATE_TIME ("time")
    // #define JMI_KEY_COURSE_UPDATE_TIME ("updateTime")
    const localHW = hwList.find(
      (item) => item.coursePkgId === lessonId && item.courseId === taskId
    );
    const bNeedAutoSavePerMins = openFor !== 'modify'; // 改编是不需要每分钟自动存作业的
    if (localHW) {
      // 本地存在作业, 进入本地作业
      return LocalCourse.enterCourseHomeWork(
        lessonId,
        taskId,
        true,
        bNeedAutoSavePerMins,
        openFor === 'modify' ? true : false // pyf 每次改编都需要生成一个新的作品id
      ).then((res) => {
        if (openFor === 'modify') {
          localBackup.needSaveNewMapBackUp = true;
          // 改编的作品存一下课程来源
          localBackup.strLessonId = lessonId;
          localBackup.strTaskId = taskId;
          // 改编需要开启本地作品的自动存盘
          localBackup.autoSavePerMins(res.mapId);
        }
        return res;
      });
    }
    return this._enterCourseHWFromUrl(mcodeUrl, lessonId, taskId, bNeedAutoSavePerMins).then(
      (res) => {
        if (openFor === 'modify') {
          // 改编需要开启本地作品的自动存盘
          localBackup.needSaveNewMapBackUp = true;
          // 改编的作品存一下课程来源
          localBackup.strLessonId = lessonId;
          localBackup.strTaskId = taskId;
          localBackup.autoSavePerMins(res.mapId);
        }
        return res;
      }
    );
  };

  /*
   * 参数: mcodeUrl(string), lessonId(string), taskId(string)
   * 返回值: Promise<{itemUnlock,name,url}>
   * 异常: error(number or string), number的话是HTTP status
   */
  _enterCourseHWFromUrl = async (mcodeUrl, lessonId, taskId, bNeedAutoSavePerMins = true) => {
    const MWContext = require('../mini-global/mwcommand-context');
    const { uin } = { ...window.userInfo };
    console.log('enterCourseHWFromUrl', mcodeUrl);
    MWContext.mapLoaded = false;
    const { path } = await ResourceCache.getWorkShopUrlRes(mcodeUrl).catch((e) =>
      Promise.reject({ msg: '作业地图加载失败，请重试!' })
    );
    if (!path) {
      return Promise.reject({ msg: '作业地图加载失败，请检查网络状况后再重试!' });
    }
    const date = new Date();
    const mcodePath = path;
    const sb3Path = `${staticPath}/minicode.sb3`;
    const url = `${baseUrl}/minicode.sb3`;
    // let url;
    // if (Platform.OS === "android") {
    //     url = baseUrl + "/minicode.sb3";
    // } else {
    //     //iOS上有缓存问题 暂时解决方法为在url后面加上当前时间 使每次加载的url都不一样
    //     url = baseUrl + "/minicode.sb3?time=" + date;
    // }
    console.log(`enterCourseHWFromUrl sb3Path: ${sb3Path}`);
    console.log(`enterCourseHWFromUrl sb3Url: ${url}`);
    const result = await commands.enterLevel(`${uin}`, mcodePath, sb3Path);
    if (!(result.hasOwnProperty('name') && result.name != undefined)) {
      // 进入作品失败了， 可能是下载的mcode 有问题， 重新掉资源再提示玩家重试
      await commands.downloadCacheDo(mcodeUrl, 1, 1);
      return Promise.reject({ msg: '作业地图加载失败，请检查网络状况后再重试!' });
    }
    await commands.setUndoOperationSwitch(true);
    MWContext.allRolesAdded = false;
    console.log('enterCourseHWFromUrl enterLevel ret', result);
    // const result = await localBackup.enterLocalBackup("32238024898382");
    const { itemUnlock, name, mapId } = result;
    LocalCourse.needSaveNewMapBackUp = true;
    LocalCourse.needAutoSaveAfterSaveNewMapBackUp = bNeedAutoSavePerMins;
    LocalCourse.fileName = name;
    LocalCourse.curLessonId = lessonId;
    LocalCourse.curTaskId = taskId;
    return {
      itemUnlock,
      name,
      url,
      mapId,
    };
  };

  /*
   * 新版打开一个课时任务
   * 参数:
   * mcodeUrl courseId taskId
   * taskType 3 闯关制作 2 玩一玩  6 创作
   * isResetMap 本关玩法模式运行结束是否需要重置地图
   * isInherit 是否需要继承上一关mcode
   * preTaskId 上一个需进入场景的课时任务id  本关需要继承时用来找上一关的mcode
   * isPreTaskResetMap  上一关玩法模式运行结束时是否需要重置地图
   * isFromNextTask 是不是从下一关按钮进入的
   *
   * 返回: {
   *  ret: 0 成功  -1 异常失败 -10 无法继承上一关，从首关开始
   *  itemUnlock,
   *  name,
   *  url,
   *  mapId,
    }
   * 
   */
  enterCourseHW_v2 = async (
    mcodeUrl,
    lessonId,
    taskId,
    taskType,
    isResetMap,
    isInherit,
    preTaskId,
    isPreTaskResetMap,
    isFromNextTask
  ) => {
    const { uin } = { ...window.userInfo };

    console.log('enterCourseHW_v2', {
      mcodeUrl,
      lessonId,
      taskId,
      taskType,
      isResetMap,
      isInherit,
      preTaskId,
      isPreTaskResetMap,
      isFromNextTask,
    });
    const MWContext = require('../mini-global/mwcommand-context');
    let ret = 0;
    let enterCourseRet = {};
    let bNeedAutoSavePerMins = taskType === 6;
    let bUserLastGameWorld = false;
    let needMode;
    let errMsg = '网络出现问题,请稍后重试！';
    if (taskType === 3 || taskType === 6) {
      // 闯关制作 创作 需要编辑模式
      needMode = 4;
    } else {
      needMode = 5;
    }
    let donotLoadSb3;
    let userDynamicJiMu;
    try {
      if (isInherit) {
        if (isFromNextTask) {
          const loadingStatus = await commands.getLoadingStatus().catch(() => [-1]);
          if (
            isObject(loadingStatus) &&
            get(loadingStatus, ['0']) == 3 &&
            MWContext.mapLoaded === true
          ) {
            if (preTaskId === LocalCourse.curTaskId) {
              bUserLastGameWorld = true;
            }
          }
        }
        // 继承上一关mcode
        if (!bUserLastGameWorld) {
          // 不是从上一个关的结束窗口点击的下一关
          if (taskType === 6) {
            // 如果是创作，尝试从自己的存盘加载
            enterCourseRet = await LocalCourse.enterCourseHomeWork_V2(
              lessonId,
              taskId,
              '',
              bNeedAutoSavePerMins,
              needMode
            ).catch((e) => false);

            // 从云端url 加载
            if (!(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined)) {
              // 从url加载
              enterCourseRet = await this._enterCourseHWFromUrl_V2(
                mcodeUrl,
                lessonId,
                taskId,
                bNeedAutoSavePerMins,
                needMode
              ).catch((e) => {
                if (isObject(e) && e.hasOwnProperty('msg')) {
                  errMsg = e.msg;
                }
                return false;
              });
            }
          }

          // 直接用上一关mcode加载
          if (!(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined)) {
            enterCourseRet = await LocalCourse.enterCourseHomeWork_V2(
              lessonId,
              taskId,
              preTaskId,
              bNeedAutoSavePerMins,
              needMode
            ).catch((e) => false);
            if(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined){
              userDynamicJiMu = true;
            }
          }
        } else {
          if (localBackup.saveMapProcLock > 0) {
            console.log(
              'enterCourseHW_v2 wait last save call finishi! saveMapProcLock = ',
              localBackup.saveMapProcLock
            );
            // 等待上一个存盘完成事件
            const waitSaveMapCanProc = new Promise((resolve, reject) => {
              let intervalId = setInterval(() => {
                if (localBackup.saveMapProcLock == 0) {
                  console.log(
                    'enterCourseHW_v2 waitSaveMapCanProc saveMapProcLock = ',
                    localBackup.saveMapProcLock
                  );
                  clearInterval(intervalId);
                  resolve('ok');
                }
              }, 1000);
            });

            await waitSaveMapCanProc;
          }

          // 就使用当前场景， 但是还需要构造一个 enterCourseRet
          enterCourseRet = this.enterCourseRet;

          // 迷你世界的胖达胜利界面需要去掉一下
          commands.setVisible_BattleEndFrame(false, 1);

          // 由于没有调用 enterXXX的接口， 需要触发一下停止自动存盘的事件
          commands._fireStopAutoSave();
          LocalCourse.curLessonId = lessonId;
          LocalCourse.curTaskId = taskId;
          // 由于没有调用 enterXXX的接口, 自动存盘也需要设置一下
          if (bNeedAutoSavePerMins) {
            await LocalCourse._autoSavePerMins();
          }
          // 不需要通知web重新加载sb3了
          donotLoadSb3 = true;
          // 需要加载动态积木
          userDynamicJiMu = true;
        }
        if (!(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined)) {
          // 继承方式进入场景失败了
          ret = -10;
          return Promise.reject({ ret });
        }
      } else {
        if (taskType === 6) {
          // 如果是创作，尝试从自己的存盘加载
          enterCourseRet = await LocalCourse.enterCourseHomeWork_V2(
            lessonId,
            taskId,
            '',
            bNeedAutoSavePerMins,
            needMode
          ).catch((e) => false);
        }
      }
      if (!(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined)) {
        // 从url加载
        enterCourseRet = await this._enterCourseHWFromUrl_V2(
          mcodeUrl,
          lessonId,
          taskId,
          bNeedAutoSavePerMins,
          needMode
        ).catch((e) => {
          if (isObject(e) && e.hasOwnProperty('msg')) {
            errMsg = e.msg;
          }
          return false;
        });
      }

      if (!(enterCourseRet.hasOwnProperty('name') && enterCourseRet.name != undefined)) {
        // 进入场景失败了
        ret = -1;
        return Promise.reject({ ret, msg: errMsg });
      }

      this.enterCourseRet = Object.assign({}, enterCourseRet);

      if (bUserLastGameWorld) {
        // 取当前场景是玩法还是编辑模式
        const { mode: curMode } = await commands.getMiniWorldMode();
        if (curMode != needMode) {
          // 通知一下webview
          let strNeedMode = needMode === 4 ? 'edit_use_role_real_pos' : 'play';
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            type: webMessageType.changeMiniWorldMode,
            data: {
              mode: strNeedMode,
            },
          });
          let bNeed_14 = false;
          // 切换模式
          if (needMode == 4) {
            // 如果是切换到编辑模式, 且是点击下一关， 且本关是继承的，需要切换前设置一下是否转玩法重置地图的规则（根据上一个关的isPreTaskResetMap配置）
            if (isPreTaskResetMap) {
              // 转编辑需要重置地图
              await commands.setIsResetMapRule(1);
            } else {
              // 转编辑不需要重置地图
              await commands.setIsResetMapRule(2);
              // 该模式需要补一个-14回调给webview 因为c++不会发-14过来了。
              bNeed_14 = true;
            }
          }
          await commands.changeMiniWorldMode({ curMode });
          // 通知游戏现在可以按地图自己记录的规则处理是否转编辑重置地图了。
          await commands.setIsResetMapRule(0);

          if (bNeed_14) {
            sendMessageToMinicodeWeb(messageTargetType.lite, { seq: -14, status: 0 });
          }
        } else if (needMode === 5 && isPreTaskResetMap) {
          // 本关开始是玩法模式， 当前地图也是玩法模式，且需要重置地图， 采用切编辑再切玩法的方式重置地图
          // 转编辑需要重置地图
          await commands.setIsResetMapRule(1);
          await commands.changeMiniWorldMode({ curMode });
          // 通知游戏现在可以按地图自己记录的规则处理是否转编辑重置地图了。
          await commands.setIsResetMapRule(0);
          // 再切到玩法
          await commands.changeMiniWorldMode({ curMode: 4 });
        }
      }

      // 补充额外的字段
      enterCourseRet.curGameMode = needMode;
      if (donotLoadSb3) {
        enterCourseRet.donotLoadSb3 = true;
      }
      if (userDynamicJiMu){
        enterCourseRet.userDynamicJiMu = true;
      }
      return enterCourseRet;
    } catch (e) {
      console.log(e);
      ret = -1;
      return { ret };
    }
  };

  /*
   * 参数: mcodeUrl(string), lessonId(string), taskId(string)
   * bNeedAutoSavePerMins 是否需要定时存盘
   * 返回值: Promise<{itemUnlock,name,url}>
   * 异常: error(number or string), number的话是HTTP status
   */
  _enterCourseHWFromUrl_V2 = async (
    mcodeUrl,
    lessonId,
    taskId,
    bNeedAutoSavePerMins,
    needMode = 0
  ) => {
    const MWContext = require('../mini-global/mwcommand-context');
    const { uin } = { ...window.userInfo };
    console.log('_enterCourseHWFromUrl_V2', mcodeUrl);
    MWContext.mapLoaded = false;
    const { path } = await ResourceCache.getWorkShopUrlRes(mcodeUrl).catch((e) =>
      Promise.reject({ msg: '课时地图加载失败，请重试!' })
    );
    if (!path) {
      return Promise.reject({ msg: '课时地图加载失败，请检查网络状况后再重试!' });
    }
    const mcodePath = path;
    const sb3Path = `${staticPath}/minicode.sb3`;
    const url = `${baseUrl}/minicode.sb3`;
    console.log(`_enterCourseHWFromUrl_V2 sb3Path: ${sb3Path}`);
    console.log(`_enterCourseHWFromUrl_V2 sb3Url: ${url}`);
    const result = await commands.enterLevel(`${uin}`, mcodePath, sb3Path, needMode);
    if (!(result.hasOwnProperty('name') && result.name != undefined)) {
      // 进入作品失败了， 可能是下载的mcode 有问题， 重新掉资源再提示玩家重试
      await commands.downloadCacheDo(mcodeUrl, 1, 1);
      return Promise.reject({ msg: '课时地图加载失败，请检查网络状况后再重试!' });
    }
    await commands.setUndoOperationSwitch(true);
    MWContext.allRolesAdded = false;
    console.log('_enterCourseHWFromUrl_V2 enterLevel ret', result);

    const { itemUnlock, name, mapId } = result;
    LocalCourse.needSaveNewMapBackUp = bNeedAutoSavePerMins;
    LocalCourse.needAutoSaveAfterSaveNewMapBackUp = bNeedAutoSavePerMins;
    LocalCourse.fileName = name;
    LocalCourse.curLessonId = lessonId;
    LocalCourse.curTaskId = taskId;
    return {
      itemUnlock,
      name,
      url,
      mapId,
    };
  };

  /**
   * 重置地图
   *
   * @memberof MCodeManager
   */
  restoreLevel = async () => await commands.restoreLevel();

  /*
   * 闯关成功
   * parameters:
   * 		uin (number), chapterId(string), levelId(string), star(number)
   * return:
   * 		Promise<void>
   */
  levelSucc = async ({ uin, chapterId, levelId, star, exp, gold, passTime = 0 }) =>
    AccountManager.levelSucc({
      uin,
      chapterId,
      levelId,
      star,
      exp,
      gold,
      passTime,
    });

  /*
   * 闯关失败
   *   star先传0
   */

  levelFail = async ({ uin, chapterId, levelId, star, passTime = 0 }) =>
    AccountManager.levelFail({
      uin,
      chapterId,
      levelId,
      star,
      passTime,
    });

  /*
   * 解锁章节
   * parameters:
   *      uin(number), chapterId(string)
   * return:
   *      Promise<void>
   */
  unlockChapter = async (uin, chapterId) => {
    const data = await AccountManager.unlockChapter(uin, chapterId);
    return data;
  };
}

export default new MCodeManager();
