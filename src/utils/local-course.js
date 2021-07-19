/*
 * @Author: panyunfei
 * @Date: 2020-11-18 14:18:47
 * @LastEditors: panyunfei
 * @LastEditTime: 2021-06-25 17:50:34
 * @Description:
 * @FilePath: \minicode_rn\src\utils\local-course.js
 */
import { get } from 'lodash';
import deviceInfo from 'react-native-device-info';

import config from './liveServer/config';
import localBackup from './local-backup';
import {
  eventType,
  messageTargetType,
  messageType,
  webMessageType,
  sendMessageToMinicodeWeb,
} from './message';

const { path: staticPath, host, port } = config;
const baseUrl = `${host}:${port}`;

const command = require('../mini-global/command');
const commands = require('../mini-global/commands');

const MAP_UPLOAD_PATH = 'miniw/map/';

class LocalCourse {
  constructor() {
    this.APIID = 299;
    this.CHANNEL_ID = 1;
    this.PRODUCTION_ID = 11000001;

    this.curLessonId = null; // 当前作业的课程id
    this.curTaskId = null; // 当前作业的任务id
    this.autoSavePerMinsItvl = null; // 定时存盘定时器id
    this.autoSavePerMinsMapId = null; // 定时存盘时的mapId 用来确保定时器不会再其他场景中存盘

    this.needSaveNewMapBackUp = false; // -14回调时 是不是需要在本地备份目录创建一个备份
    this.needAutoSaveAfterSaveNewMapBackUp = false; // -14回调时 在本地备份目录创建一个备份后是否需要开启定时保存
    this.fileName = ''; // 保存时作品名字需要使用

    setTimeout(() => {
      const MWContext = require('../mini-global/mwcommand-context');
      MWContext.eventBus.on(eventType.clearAutoSaveInterval, () => {
        this._stopAutoSavePerMins();
      });
    }, 3000);
  }

  /**
   * @description: 进入一个作业
   * @param lessonId 课包id
        courseId 课程id
        bUndoOperationSwitch
        bNeedAutoSavePerMins 是否需要自动存盘 默认 true
        needNewMapID 是否生成一个新的地图id 默认 false (pyf 目前只有改编作业需要用)
   * @return {
      itemUnlock,
      name,
      url,
    }
   */
  enterCourseHomeWork = async (
    lessonId,
    taskId,
    bUndoOperationSwitch = true,
    bNeedAutoSavePerMins = true,
    needNewMapID = false
  ) => {
    console.log(`enterCourseHomeWork   ${lessonId} ${taskId}`);
    const MWContext = require('../mini-global/mwcommand-context');
    MWContext.mapLoaded = false;

    // pyf 由于保存退出后， 界面上马上就可以点击进入作品, 这时候可能上个场景还没有保存完， 需要等待一下。
    if (localBackup.saveMapProcLock > 0) {
      console.log(
        'enterCourseHomeWork wait last save call finishi! saveMapProcLock = ',
        localBackup.saveMapProcLock
      );
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
          if (localBackup.saveMapProcLock == 0) {
            console.log(
              'enterCourseHomeWork waitSaveMapCanProc saveMapProcLock = ',
              localBackup.saveMapProcLock
            );
            clearInterval(intervalId);
            resolve('ok');
          }
        }, 1000);
      });

      await waitSaveMapCanProc;
    }

    const sb3Path = `${staticPath}/minicode.sb3`;
    const url = `${baseUrl}/minicode.sb3`;

    console.log(`enterCourseHomeWork sb3Path: ${sb3Path}`);
    console.log(`enterCourseHomeWork sb3Url: ${url}`);
    const { uin } = { ...window.userInfo };

    const result = await commands.enterCourseHomeWork(
      `${uin}`,
      lessonId,
      taskId,
      sb3Path,
      needNewMapID
    );
    if (bUndoOperationSwitch) {
      await commands.setUndoOperationSwitch(true);
    }
    MWContext.allRolesAdded = false;
    console.log('enterCourseHomeWork ret = ', result);
    const { itemUnlock, name, mapId } = result;
    this.curLessonId = lessonId;
    this.curTaskId = taskId;
    // 开启自动存盘
    if (bNeedAutoSavePerMins) {
      this._autoSavePerMins(mapId);
    }

    return {
      itemUnlock,
      name,
      url,
      mapId,
    };
  };

  // 保存当前作业
  saveCurCourseHomeWork = async (
    nameStr,
    gotoMainMenuStage = true,
    snapShot = true,
    useSb3WhenAllRolesAdded = false,
    bPlayModeForce = false // 玩法模式是否也强制存地图
  ) => {
    if (gotoMainMenuStage) {
      // 优先停止定时器，防止异常没有执行到
      this._stopAutoSavePerMins();
    }
    console.log('saveCurCourseHomeWork', nameStr);

    const MWContext = require('../mini-global/mwcommand-context');
    nameStr = nameStr || '';
    const { uin } = { ...window.userInfo };
    let ret = { status: 0 };
    try {
      // 等待一个存盘锁
      await localBackup.acquireSaveMapProcLock('saveCurCourseHomeWork', nameStr);

      const curLoadingStatusRet = await commands.getLoadingStatus();
      const curLoadingStatus = get(curLoadingStatusRet, ['0']);
      if (curLoadingStatus != 3) {
        console.log('saveCurCourseHomeWork not in game world!!!');
        return;
      }

      if (gotoMainMenuStage) {
        // 停止积木运行
        sendMessageToMinicodeWeb(messageTargetType.rn, {
          type: webMessageType.stopProject,
          data: {},
        });
      }
      // 等待页面加载完毕
      let canExportSb3 = true;
      if (!MWContext.allRolesAdded) {
        const pAllRolesAdded = new Promise((resolve, reject) => {
          MWContext.eventBus.once(messageType.allRolesAdded, () => {
            // 刚加载好sb3, 可以直接用webview allRolesAdded 事件带下来的sb3
            useSb3WhenAllRolesAdded = true;
            resolve('ok');
          });
        });
        const waitAllRolesAddedRet = await Promise.race([
          pAllRolesAdded,
          new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve('timeout');
            }, 5000);
          }),
        ]);
        if (waitAllRolesAddedRet == 'timeout') {
          //canExportSb3 = false;
          console.log('saveCurCourseHomeWork failed err timeout');
        }
      }
      const playerInitInfo = await this._flushChunk(bPlayModeForce);
      let sb3FileNameFromWeb = '';
      if (canExportSb3) {
        if (useSb3WhenAllRolesAdded) {
          sb3FileNameFromWeb = MWContext.sb3FileNameWhenAllRolesAdded;
        } else {
          // 设置一下webview的角色初始信息（位置，快捷栏）
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            type: webMessageType.webviewSetPlayerInitInfo,
            data: playerInitInfo,
          });
          const p1 = new Promise((resolve, reject) => {
            MWContext.eventBus.once(messageType.exportSb3, (newData) => {
              resolve(newData);
            });
          });
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            type: webMessageType.exportSb3,
            data: {},
          });
          const { sb3FileName } = await Promise.race([
            p1,
            new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve({ sb3FileName: '' });
              }, 5000);
            }),
          ]);
          sb3FileNameFromWeb = sb3FileName;
        }
      }
      console.log('saveCurCourseHomeWork sb3FileNameFromWeb', sb3FileNameFromWeb);

      if (sb3FileNameFromWeb.length == 0) {
        // 打印一下日志
        const manufacturer = await deviceInfo.getManufacturer();
        let msg = `saveCurCourseHomeWork sb3 length == 0 uin : ${uin}, useSb3WhenAllRolesAdded : ${useSb3WhenAllRolesAdded}, coursePkgId : ${
          this.curLessonId
        }, courseId : ${
          this.curTaskId
        }, manufacturer : ${manufacturer}, brand : ${deviceInfo.getBrand()}, deviceId : ${deviceInfo.getDeviceId()}, model : ${deviceInfo.getModel()}, systemName : ${deviceInfo.getSystemName()}, systemVersion : ${deviceInfo.getSystemVersion()}, uniqueId : ${deviceInfo.getUniqueId()}, version : ${deviceInfo.getVersion()}`;
        MWContext.jsonErrAnalysis({
          type: 'minicode_upload_sb3_error',
          msg,
        });
      }
      ret = await this._CourseHWsaveAs(
        uin,
        nameStr,
        sb3FileNameFromWeb,
        this.curLessonId,
        this.curTaskId,
        snapShot
      );
    } catch (err) {
      console.log('saveCurCourseHomeWork', err);
    } finally {
      // 释放一个存盘锁 防止异常， 这个写finally 第一句
      localBackup.releaseSaveMapProcLock();

      if (gotoMainMenuStage) {
        sendMessageToMinicodeWeb(messageTargetType.rn, {
          type: webMessageType.webviewClear,
          data: {},
        });
        await commands.gotoMainMenuStage('none');
        await commands.gotoMainMenuStage();
        await commands.setUndoOperationSwitch(false);
        // 停止自动存盘计时器
        this._stopAutoSavePerMins();
      }
      console.log('saveCurCourseHomeWork', ret);
      return ret;
    }
  };

  // 保存当前地图for 分享
  saveCurCourseHomeWorkForShare = async () => {
    console.log('saveCurCourseHomeWorkForShare');
    const { uin } = { ...window.userInfo };
    let ret = { status: 0 };
    try {
      // 等待一个存盘锁
      await localBackup.acquireSaveMapProcLock();

      const curLoadingStatusRet = await commands.getLoadingStatus();
      const curLoadingStatus = get(curLoadingStatusRet, ['0']);
      if (curLoadingStatus != 3) {
        console.log('saveCurCourseHomeWorkForShare not in game world!!!');
        return;
      }

      await this._flushChunk().then((data) => null, (data) => null);
      ret = await this._CourseHWsaveAs(uin, '', '', this.curLessonId, this.curTaskId, false);
    } catch (e) {
      console.log('saveCurCourseHomeWorkForShare', e);
    } finally {
      // 释放一个存盘锁
      localBackup.releaseSaveMapProcLock();
      return ret;
    }
  };

  // 这个是用来把当前新建场景，备份到本地
  saveNewCourseHomeWork = () => {
    const that = this;
    const { uin } = { ...window.userInfo };
    if (!this.needSaveNewMapBackUp) {
      return Promise.reject('no need needSaveNewMapBackUp!');
    }
    this.needSaveNewMapBackUp = false;

    that.saveCurCourseHomeWork(that.fileName, false, true, true);

    // 开启自动存盘
    if (this.needAutoSaveAfterSaveNewMapBackUp) {
      this._autoSavePerMins();
    }
  };

  /**
   * @description: 新版本进入进入一个作业
   * @param courseId 课时id
        taskId 任务id
        preTaskId 上一个任务id
        bNeedAutoSavePerMins 是否定时存盘
        needMode 游戏模式 4 编辑 5 玩法 0 不改变mcode中的配置
   * @return {
        itemUnlock,
        name,
        url,
      }
     */
  enterCourseHomeWork_V2 = async (
    courseId,
    taskId,
    preTaskId = '',
    bNeedAutoSavePerMins = true,
    needMode = 0
  ) => {
    const MWContext = require('../mini-global/mwcommand-context');
    MWContext.mapLoaded = false;
    console.log('enterCourseHomeWork_V2', {
      courseId,
      taskId,
      preTaskId,
      bNeedAutoSavePerMins,
      needMode,
    });
    // pyf 由于保存退出后， 界面上马上就可以点击进入作品, 这时候可能上个场景还没有保存完， 需要等待一下。
    if (localBackup.saveMapProcLock > 0) {
      console.log(
        'enterCourseHomeWork_V2 wait last save call finishi! saveMapProcLock = ',
        localBackup.saveMapProcLock
      );
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
          if (localBackup.saveMapProcLock == 0) {
            console.log(
              'enterCourseHomeWork_V2 waitSaveMapCanProc saveMapProcLock = ',
              localBackup.saveMapProcLock
            );
            clearInterval(intervalId);
            resolve('ok');
          }
        }, 1000);
      });

      await waitSaveMapCanProc;
    }

    const sb3Path = `${staticPath}/minicode.sb3`;
    const url = `${baseUrl}/minicode.sb3`;

    console.log(`enterCourseHomeWork_V2 sb3Path: ${sb3Path}`);
    console.log(`enterCourseHomeWork_V2 sb3Url: ${url}`);
    const { uin } = { ...window.userInfo };

    const result = await commands.enterCourseHomeWork(
      `${uin}`,
      courseId,
      preTaskId !== '' ? preTaskId : taskId,
      sb3Path,
      false,
      needMode
    );

    if (!(result.hasOwnProperty('name') && result.name != undefined)) {
      return {};
    }

    await commands.setUndoOperationSwitch(true);

    MWContext.allRolesAdded = false;
    console.log('enterCourseHomeWork_V2 ret = ', result);
    const { itemUnlock, name, mapId } = result;
    this.curLessonId = courseId;
    this.curTaskId = taskId;

    // 开启自动存盘
    if (bNeedAutoSavePerMins) {
      this._autoSavePerMins(mapId);
    }

    return {
      itemUnlock,
      name,
      url,
      mapId,
    };
  };

  // 新版本保存当前作业
  saveCurCourseHomeWork_V2 = async (
    nameStr,
    gotoMainMenuStage = true,
    snapShot = true,
    useSb3WhenAllRolesAdded = false,
    bPlayModeForce = false // 玩法模式是否也强制存地图
  ) => {
    // 新版本暂时直接用老版本的处理就可以了
    return this.saveCurCourseHomeWork(
      nameStr,
      gotoMainMenuStage,
      snapShot,
      useSb3WhenAllRolesAdded,
      bPlayModeForce // 玩法模式也强制存地图
    );
  };

  /*
    * 删除本地课程作业
    * 参数 uinStr: string
          coursePkgId: string
          courseId: string
    * 返回值 对应uin的本地课程作业列表（基本不会失败）
  */
  delCourseHomeWork = async (uinStr, coursePkgId, courseId) =>
    await commands.delCourseHomeWork(uinStr, coursePkgId, courseId);

  // 检测当前地图截图，没有就生成一张, 返回截图url
  checkSnapShot = async () => {
    const { uin } = { ...window.userInfo };
    try {
      let data = await commands.getCurWorldMapid();
      console.log('checkSnapShot getCurWorldMapid', data);
      const mapPath = data.path;
      const mapID = `${data.mapId}`;
      data = await commands.checkSnapShot(uin, mapPath, mapID);
      if (data === 'not exist') {
        await commands.snapShot();
        data = await commands.checkSnapShot(uin, mapPath, mapID);
      }
      if (data && typeof data === 'object' && data.thumbPath) {
        return data.thumbPath;
      }
      return '';
    } catch (err) {
      console.log(err);
      return '';
    }
  };

  // 重新生成一张快照, 返回截图url
  reSnapShot = async () => {
    const { uin } = { ...window.userInfo };
    try {
      let data = await commands.getCurWorldMapid();
      console.log('checkSnapShot getCurWorldMapid', data);
      const mapPath = data.path;
      const mapID = `${data.mapId}`;
      await commands.snapShot();
      data = await commands.checkSnapShot(uin, mapPath, mapID);
      if (data && typeof data === 'object' && data.thumbPath) {
        return data.thumbPath;
      }
      return '';
    } catch (err) {
      console.log(err);
      return '';
    }
  };

  _flushChunk = async (bPlayModeForce = false) => {
    if (bPlayModeForce) {
      await commands.setIsResetMapRule(2);
    }
    let ret = await commands.flushChunk(bPlayModeForce).then((info) => info);
    if (bPlayModeForce) {
      await commands.setIsResetMapRule(0);
    }
    return ret;
  };

  // 保存当前地图
  // 参数uinNumber: uin   name:作品名字  sb3FileNameFromWeb:sb3在目录中的名字
  _CourseHWsaveAs = async (
    uinNumber,
    name,
    sb3FileNameFromWeb,
    coursePkgId,
    courseId,
    snapShot = false
  ) => {
    console.log('_CourseHWsaveAs', uinNumber);
    const uin = `${uinNumber}`;
    const that = this;
    if (snapShot) {
      try {
        await that.checkSnapShot();
      } catch (err) {
        console.log('_CourseHWsaveAs snapShot err ', err);
      }
    }
    try {
      let data = await commands.getCurWorldMapid();
      console.log('_CourseHWsaveAs getCurWorldMapid', data);
      const { mapId } = data;
      await commands.setMapUploadUin(Number(mapId), Number(uinNumber));
      let saveRet = await that._sendCourseHWSaveCommand(
        uin,
        sb3FileNameFromWeb,
        data.path,
        data.mapId,
        name,
        coursePkgId || '',
        courseId || ''
      );
      console.log('pyf test _sendCourseHWSaveCommand ret', saveRet);
      return saveRet;
    } catch (err) {
      console.log('_CourseHWsaveAs err ', err);
      return err;
    }
  };

  _sendCourseHWSaveCommand = async (
    uin,
    sb3FileNameFromWeb,
    mapPath,
    mapId,
    name,
    coursePkgId,
    courseId
  ) => {
    const timeStr = new Date().getTime().toString();
    const sb3PathForSave = sb3FileNameFromWeb !== '' ? `${staticPath}/${sb3FileNameFromWeb}` : '';
    return commands.saveCourseHomeWork(
      `${uin}`,
      mapPath,
      `${mapId}`,
      name || '',
      timeStr,
      sb3PathForSave,
      '',
      coursePkgId,
      courseId
    );
  };

  // 定时存盘处理 注意 不能保证mapId 是字符串还是数字， 后面都统一转成字符串处理
  _autoSavePerMins = async (mapId) => {
    if (this.autoSavePerMinsItvl !== null) {
      return;
    }

    if (!mapId) {
      // 没有传 mapId 参数， 尝试取一下
      const dataCurWorldMapid = await commands.getCurWorldMapid();
      mapId = dataCurWorldMapid.mapId;
      if (!mapId) {
        return;
      }
    }

    this.autoSavePerMinsMapId = `${mapId}`;

    // 3分钟存盘一次
    this.autoSavePerMinsItvl = setInterval(async () => {
      if (localBackup.saveMapProcLock == 0) {
        const dataCurWorldMapid = await commands.getCurWorldMapid();
        const { mapId } = dataCurWorldMapid;
        // 只在场景id相同时才去保存
        if (this.autoSavePerMinsMapId === `${mapId}`) {
          this.saveCurCourseHomeWork('', false, false, false);
        } else {
          this._stopAutoSavePerMins();
        }
      }
    }, 3 * 60000);
  };

  _stopAutoSavePerMins = () => {
    if (this.autoSavePerMinsItvl !== null) {
      clearInterval(this.autoSavePerMinsItvl);
      this.autoSavePerMinsItvl = null;
    }
  };
}

export default new LocalCourse();
