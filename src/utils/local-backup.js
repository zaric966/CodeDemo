/*
 * @Author: maoguijun
 * @Date: 2020-03-02 15:50:15
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-07 10:43:28
 * @FilePath: \minicode_app_rn\src\utils\local-backup.js
 */
import { get } from 'lodash';
import md5 from 'md5';
import QueryString from 'querystring';
import deviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';
import env from './env';

import JSONSAFE from './json-safe';
import config from './liveServer/config';
import {
  eventType,
  messageTargetType,
  messageType,
  webMessageType,
  sendMessageToMinicodeWeb,
} from './message';
import fetch from './request';
import RC from './resource-cache';

const { path: staticPath, host, port } = config;
const baseUrl = `${host}:${port}`;

const commands = require('../mini-global/commands');

const MAP_UPLOAD_PATH = 'miniw/map/';

class LocalBackup {
  constructor() {
    this.APIID = 299;
    this.CHANNEL_ID = 1;
    this.PRODUCTION_ID = 11000001;

    this.uin = 1; // 给virtual-machine调用backup时使用
    this.fileName = ''; // 保存时作品名字需要使用
    this.tutorialUrl = ''; // 用于模板作品保存tutorialUrl字段到jmi使用
    this.strPblTargetId = ''; // 保存作品Pbl信息时使用
    this.strPblStepId = ''; // 保存作品Pbl信息时使用
    this.strLessonId = ''; // 保存从课程改编作品信息时使用
    this.strTaskId = ''; // 保存从课程改编作品信息时使用
    this.needSaveNewMapBackUp = false; // -14回调时 是不是需要在本地备份目录创建一个备份
    this.autoSavePerMinsItvl = null; // 定时存盘定时器id
    this.autoSavePerMinsMapId = null; // 定时存盘时的mapId 用来确保定时器不会再其他场景中存盘
    this.defaultSB3Data = null; // 默认的空白sb3, 新建时用
    this.currentSB3Data = null; // 当前装载的sb3
    this.saveMapProcLock = 0; // 存盘意向锁， 两个存盘动作不能同时进行（如定时存盘和手动存盘）， 存盘不能和进入任何场景同时进行。

    setTimeout(() => {
      const MWContext = require('../mini-global/mwcommand-context');
      MWContext.eventBus.on(eventType.clearAutoSaveInterval, () => {
        this._stopAutoSavePerMins();
      });
    }, 3000);
  }

  /**
   * 获取登录凭证 sign
   *
   * @memberof LocalBackup
   */
  getSign = (timeStamp, s2, uin) =>
    // return new crypto.createHash("md5")
    //     .update(`${timeStamp}${s2}${uin}`)
    //     .digest("hex");
    md5(`${timeStamp}${s2}${uin}`);

  /**
   * 获取版本号
   *
   * @memberof LocalBackup
   */
  getVer = () => {
    if (this._ver) {
      const V = this._ver;
      return new Promise((resolve) => {
        resolve(V);
      });
    }
    if (!window.sendMWCommand) {
      return new Promise((resolve) => {
        resolve('0.35.1');
      });
    }
    // return commands.getVersionForEducation().then(data => {
    //     this._ver = data;
    //     return data;
    // });
  };

  /**
   * 获取当前的时间 /1000
   *
   * @memberof LocalBackup
   */
  getTimeStamp = () => String(Math.round(new Date() / 1000));

  /**
   * 请求用户作品数据
   *
   * @memberof LocalBackup
   */
  fetchProjectRequest = async (uin, targetUin, s2, s2t, mapFilter) => {
    const ver = await this.getVer().catch((error) => Promise.reject(error));

    const timeStamp = this.getTimeStamp();
    const auth = this.getSign(timeStamp, s2, uin);
    const queryObj = {
      act: 'search_user_maps',
      op_uin: `${targetUin}`,
      time: `${timeStamp}`,
      auth,
      s2t: `${s2t}`,
      uin: `${uin}`,
      ver,
      apiid: `${this.APIID}`,
      lang: 0,
      country: 'CN',
      channel_id: `${this.CHANNEL_ID}`,
      production_id: `${this.PRODUCTION_ID}`,
      json: 1,
    };
    const queryParams = QueryString.encode(queryObj);
    const url = `${env.mapUrl}${MAP_UPLOAD_PATH}?${queryParams}`;

    return fetch({ url }).then(
      (result) => {
        const res = get(result, 'data') || {};
        const res2 = {};

        if (!res.map_info_list) {
          res.map_info_list = {};
        }
        if (!res.urls) {
          res.urls = [];
        }
        res2.urls = res.urls;
        res2.map_info_list = {};
        const idArray = Object.keys(res.map_info_list);
        idArray.forEach((mapId) => {
          const m = res.map_info_list[mapId];
          if (!mapFilter || mapFilter(m)) {
            res2.map_info_list[mapId] = m;
          }
        });
        return Promise.resolve(res2);
      },
      (err) => Promise.reject(err)
    );
  };

  /*
     * 新建一个地图并进入
     * 参数 mapName: string
            terrain: number
            width: number
            height: number
            landform:string
            biological:string
    */

  enterWorldEx = async (mapName, terrain, width, height, landform, biological) => {
    const MWContext = require('../mini-global/mwcommand-context');
    console.log('enterWorldEx', mapName, terrain, width, height, landform, biological);

    // pyf 由于保存退出后， 界面上马上就可以点击进入作品, 这时候可能上个场景还没有保存完， 需要等待一下。
    if (this.saveMapProcLock > 0) {
      console.log('enterWorldEx wait last save call finishi!');
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
          if (this.saveMapProcLock == 0) {
            clearInterval(intervalId);
            resolve('ok');
          }
        }, 1000);
      });
      await waitSaveMapCanProc;
    }

    const that = this;
    MWContext.mapLoaded = false;
    const { uin } = { ...window.userInfo };
    await commands.setRoleInfoForMap(1, '', 4, `${uin}`, 0);
    const mapId = await commands.enterWorldEx(
      mapName,
      terrain,
      width,
      height,
      landform,
      biological
    );
    await commands.setUndoOperationSwitch(true); // 打开undo redo开关
    MWContext.allRolesAdded = false;
    console.log('enterWorldEx ret', mapId);
    this.fileName = mapName; // 保存时作品名字需要使用
    this.needSaveNewMapBackUp = true; // 新建的地图需要创建一个本地备份
    return mapId;
  };

  /*
    * 手动创建一个备份
    * 参数 uinStr: string
           mapId: string
    * 返回值 如果成功返回对应作品的json信息
  */
  createLocalBackupCopy = async (uinStr, mapId) =>
    await commands.createLocalBackupCopy(uinStr, mapId);

  /*
    * 自动创建一个备份
    * 参数 uinStr: string
           mapId: string
    * 返回值 如果成功返回对应作品的json信息
  */
  createAutoLocalBackupCopy = async (uinStr, mapId) =>
    await commands.createAutoLocalBackupCopy(uinStr, mapId);

  /*
   * 取得本地作品自动备份列表
   * 返回值 时间戳数组
   */
  getAutoLocalBackupCopyList = async (uinStr, mapId) =>
    await commands.getAutoLocalBackupCopyList(uinStr, mapId);

  /*
   * 取得本地作品手动备份列表
   * 返回值 时间戳数组
   */
  getLocalBackupCopyList = async (uinStr, mapId) =>
    await commands.getLocalBackupCopyList(uinStr, mapId);

  /*
    * 还原本地作品自动备份
    * 参数 uinStr: string
           mapId: string
           index: number
    * 返回值 错误描述或者 'ok'
  */
  restoreAutoLocalBackupCopy = async (uinStr, mapId, index) =>
    await commands.restoreAutoLocalBackupCopy(uinStr, mapId, index);

  /*
    * 还原本地作品手动备份
    * 参数 uinStr: string
           mapId: string
           index: number
    * 返回值 错误描述或者 'ok'
  */
  restoreLocalBackupCopy = async (uinStr, mapId, index) =>
    await commands.restoreLocalBackupCopy(uinStr, mapId, index);

  /*
    * 删除本地作品自动备份
    * 参数 uinStr: string
           mapId: string
           index: number
    * 返回值 错误描述或者 'ok'
  */
  delAutoLocalBackupCopy = async (uinStr, mapId, index) =>
    await commands.delAutoLocalBackupCopy(uinStr, mapId, index);

  /*
    * 删除本地作品手动备份
    * 参数 uinStr: string
          mapId: string
          index: number
    * 返回值 错误描述或者 'ok'
  */
  delLocalBackupCopy = async (uinStr, mapId, index) =>
    await commands.delLocalBackupCopy(uinStr, mapId, index);

  /*
    * 删除本地作品
    * 参数 uinStr: string
          mapId: string
    * 返回值 对应uin的本地作品列表（基本不会失败）
  */
  delLocalBackup = async (uinStr, mapId) => await commands.delLocalBackup(uinStr, mapId);

  /*
   * 参数: mapId 作品id
          bUndoOperationSwitch
          bNeedAutoSavePerMins 是否需要自动存盘 默认 true
   * 返回值: Promise<{itemUnlock,name,url}>
   * 异常: error(number or string)
   */
  enterLocalBackup = async (mapId, bUndoOperationSwitch = true, bNeedAutoSavePerMins = true) => {
    const MWContext = require('../mini-global/mwcommand-context');
    console.log(`enterLocalBackup   ${mapId}`);
    MWContext.mapLoaded = false;

    // pyf 由于保存退出后， 界面上马上就可以点击进入作品, 这时候可能上个场景还没有保存完， 需要等待一下。
    if (this.saveMapProcLock > 0) {
      console.log(
        'enterLocalBackup wait last save call finishi! saveMapProcLock = ',
        this.saveMapProcLock
      );
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
          if (this.saveMapProcLock == 0) {
            console.log(
              'enterLocalBackup waitSaveMapCanProc saveMapProcLock = ',
              this.saveMapProcLock
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

    console.log(`enterLocalBackup sb3Path: ${sb3Path}`);
    console.log(`enterLocalBackup sb3Url: ${url}`);
    const { uin } = { ...window.userInfo };
    await this.createAutoLocalBackupCopy(`${uin}`, mapId);
    const result = await commands.enterLocalBackup(`${uin}`, mapId, sb3Path);
    if (bUndoOperationSwitch) {
      await commands.setUndoOperationSwitch(true);
    }
    MWContext.allRolesAdded = false;
    console.log('enterLocalBackup ret = ', result);
    const { itemUnlock, name } = result;

    // 开启自动存盘
    if (bNeedAutoSavePerMins) {
      this._autoSavePerMins(mapId);
    }

    return {
      itemUnlock,
      name,
      url,
    };
  };

  // 做改编开源作品的前置工作：拷贝作品到本地
  // 参数：
  // mcodeUrl 要改编的mcode url
  // ori_info 原始作者信息
  // last_info 上一次作者信息
  // 返回值：成功Promise<mapid> 失败Promise<error>
  recomposeMCode = async (mcodeUrl, ori_info, last_info) => {
    // 使地图成为本地作品
    const { uin } = { ...window.userInfo };
    const sb3Path = `${staticPath}/minicode.sb3`;
    const result = await RC.getUrlRes(mcodeUrl);
    const mcodePath = get(result, 'path');
    const timeStr = Date.now();
    const oriWid = get(ori_info, 'ori_work_id') || 0;
    const lastWid = get(last_info, 'last_work_id') || 0;
    return commands
      .preRecomposeMCode(uin, sb3Path, mcodePath, timeStr, oriWid, lastWid)
      .then(async (mapid) => {
        // 写改编作品的额外信息到jmi
        const destMCodePath = (await commands.getBackupMcodePath(uin, `${mapid}`))[0];
        const jsonPath = destMCodePath.replace('.mcode', '.jmi');
        const jsonContent = await RNFS.readFile(jsonPath);
        const jsonData = JSON.parse(jsonContent);
        await RNFS.writeFile(
          jsonPath,
          JSON.stringify({
            ...jsonData,
            ori_info,
            last_info,
          })
        );
        // 返回mapid
        return `${mapid}`;
      })
      .catch((err) => err);
  };

  // 这个是用来把当前新建场景，备份到本地
  saveNewMapBackUp = () => {
    const that = this;
    const { uin } = { ...window.userInfo };
    if (!this.needSaveNewMapBackUp) {
      return Promise.reject('no need needSaveNewMapBackUp!');
    }
    this.needSaveNewMapBackUp = false;

    that.saveCurMap(
      that.fileName,
      '',
      false,
      false,
      true,
      this.strPblTargetId,
      this.strPblStepId,
      this.strLessonId,
      this.strTaskId
    );

    this.strPblTargetId = ''; // 保存作品Pbl信息时使用
    this.strPblStepId = ''; // 保存作品Pbl信息时使用
    this.strLessonId = ''; // 保存从课程改编作品信息时使用
    this.strTaskId = ''; // 保存从课程改编作品信息时使用

    // 开启自动存盘
    this._autoSavePerMins();
  };

  // 把"tutorial_url"(教程链接)字段写入jmi
  saveTutorialUrlField = async () => {
    if (!this.tutorialUrl) {
      return;
    }
    try {
      const { uin } = { ...window.userInfo };
      const data = await commands.getCurWorldMapid();
      const { mapId } = data;
      const mcodePath = (await commands.getBackupMcodePath(String(uin), String(mapId)))[0];
      const jmiPath = mcodePath.replace('.mcode', '.jmi');
      console.log('298', jmiPath);
      if (mcodePath) {
        const strContent = await RNFS.readFile(jmiPath);
        console.log('302', strContent);
        if (strContent) {
          const jsContent = JSONSAFE.parse(strContent);
          jsContent.tutorialUrl = this.tutorialUrl;
          await RNFS.writeFile(jmiPath, JSON.stringify(jsContent), 'utf8');
        }
      }
    } catch (err) {
      console.log('311', err);
      return;
    }

    // 清空
    this.tutorialUrl = '';
  };

  // 设置本地作品的 tutorialUrl, pblTargetId, pblStepId 字段
  // mapId 作品id字符串
  // params 现需要设置的字段 例如 {tutorialUrl:'www.baidu.com', pblTargetId: '123', pblStepId: '123'}, 不需要改变的字段就不放入
  setJmiVal = async (mapId, params) => {
    try {
      const { uin } = { ...window.userInfo };
      const mcodePath = (await commands.getBackupMcodePath(String(uin), String(mapId)))[0];
      const jmiPath = mcodePath.replace('.mcode', '.jmi');
      if (mcodePath) {
        const strContent = await RNFS.readFile(jmiPath);
        if (strContent) {
          const jsContent = JSONSAFE.parse(strContent);
          if (params.tutorialUrl && params.tutorialUrl !== '') {
            jsContent.tutorialUrl = params.tutorialUrl;
          }
          if (params.pblTargetId && params.pblTargetId !== '') {
            jsContent.pblTargetId = params.pblTargetId;
          }
          if (params.pblStepId && params.pblStepId !== '') {
            jsContent.pblStepId = params.pblStepId;
          }

          await RNFS.writeFile(jmiPath, JSON.stringify(jsContent), 'utf8');
        }
      }
    } catch (err) {
      console.log('setJmiVal err', err);
      return;
    }
  };

  getJmiVal = async (mapId) => {
    const { uin } = { ...window.userInfo };
    return commands
      .getBackupMcodePath(String(uin), String(mapId))
      .then(async (mcodePath) => {
        if (mcodePath.length == 0) {
          return Promise.reject('Get Backup Mcode Path Failed');
        }
        const jmiPath = mcodePath[0].replace('.mcode', '.jmi');
        const strContent = await RNFS.readFile(jmiPath);
        if (strContent) {
          return JSONSAFE.parse(strContent);
        } else {
          return Promise.reject('jmi no content');
        }
      })
      .catch((err) => err);
  };

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

  // 保存当前地图
  // mapidStr 传空字符串则表示从mcode里边取mapid
  saveCurMap = async (
    nameStr,
    mapidStr = '',
    gotoMainMenuStage = true,
    snapShot = true,
    useSb3WhenAllRolesAdded = false,
    strPblTargetId = '',
    strPblStepId = '',
    strLessonId = '',
    strTaskId = ''
  ) => {
    if (gotoMainMenuStage) {
      // 优先停止定时器，放置异常没有执行到
      this._stopAutoSavePerMins();
    }

    const MWContext = require('../mini-global/mwcommand-context');
    console.log('saveCurMap', nameStr);
    nameStr = nameStr || '';
    const { uin } = { ...window.userInfo };
    let mapIdData;
    try {
      // 等待一个存盘锁
      await this.acquireSaveMapProcLock('saveCurMap', nameStr);

      const curLoadingStatusRet = await commands.getLoadingStatus();
      const curLoadingStatus = get(curLoadingStatusRet, ['0']);
      if (curLoadingStatus != 3) {
        console.log('saveCurMap not in game world!!!');
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
          console.log('saveCurMap failed err timeout');
        }
      }
      const playerInitInfo = await this._flushChunk();
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
      mapIdData = await commands.getCurWorldMapid();
      console.log(' mapIdData', mapIdData);
      console.log('saveCurMap sb3FileNameFromWeb', sb3FileNameFromWeb);

      if (sb3FileNameFromWeb.length == 0) {
        // 打印一下日志
        const manufacturer = await deviceInfo.getManufacturer();
        let msg = `saveCurMap sb3 length == 0 uin : ${uin}, useSb3WhenAllRolesAdded : ${useSb3WhenAllRolesAdded}, manufacturer : ${manufacturer}, brand : ${deviceInfo.getBrand()}, deviceId : ${deviceInfo.getDeviceId()}, model : ${deviceInfo.getModel()}, systemName : ${deviceInfo.getSystemName()}, systemVersion : ${deviceInfo.getSystemVersion()}, uniqueId : ${deviceInfo.getUniqueId()}, version : ${deviceInfo.getVersion()}`;
        MWContext.jsonErrAnalysis({
          type: 'minicode_upload_sb3_error',
          msg,
        });
      }

      await this._saveAs(
        uin,
        nameStr,
        sb3FileNameFromWeb,
        mapidStr,
        snapShot,
        0,
        strPblTargetId,
        strPblStepId,
        strLessonId,
        strTaskId
      );
      await this.saveTutorialUrlField(); // "tutorial_url"字段写入jmi(如果有的话)
    } catch (err) {
      console.log('saveCurMap', err);
    } finally {
      // 释放一个存盘锁
      this.releaseSaveMapProcLock();

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

      return mapIdData;
    }
  };

  // 保存当前地图for 分享
  saveCurMapForShare = async (needLua, openCode = 0, name = '') => {
    const MWContext = require('../mini-global/mwcommand-context');
    console.log('saveCurMapForShare', needLua);
    const { uin } = { ...window.userInfo };
    let originE;
    try {
      // 等待一个存盘锁
      await this.acquireSaveMapProcLock();

      if (needLua) {
        const p1 = new Promise((resolve, reject) => {
          MWContext.eventBus.once(messageType.exportLua, (newData) => {
            console.log(messageType.exportLua, newData);
            resolve(newData);
          });
        });
        sendMessageToMinicodeWeb(messageTargetType.rn, {
          type: webMessageType.exportLua,
          data: {},
        });
        const { playModeBlock, playModeEvent } = await Promise.race([
          p1,
          new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve({ playModeBlock: '', playModeEvent: '' });
            }, 15000);
          }),
        ]);
        const mapIdData = await commands.getCurWorldMapid();
        console.log('saveCurMapForShare mapIdData', mapIdData);
        console.log('saveCurMapForShare playModeBlock', playModeBlock);
        console.log('saveCurMapForShare playModeEvent', playModeEvent);
        await commands.saveMinicodeLua(`${mapIdData.mapId}`, playModeBlock, 'jimu_start_ver2');
      }
      await this._flushChunk().then(
        (data) => null,
        (data) => null
      );
      await this._saveAs(uin, name, '', '', false, openCode);
    } catch (e) {
      originE = e;
    } finally {
      // 释放一个存盘锁
      this.releaseSaveMapProcLock();
      if (originE) {
        // 如果有 catch 住 error, 原样throw出去
        throw originE;
      }
    }
  };

  // 退出当前地图（不做存盘处理）  pyf 这个函数考虑移动到其他公共地方，因为退出的不只是本地作品地图了， 作业地图的退出也是调用这个。
  quitCurMap = async () => {
    // 这里尝试调用下 local-course.js 的定时器停止操作
    const f = async () => {
      sendMessageToMinicodeWeb(messageTargetType.rn, {
        type: webMessageType.stopProject,
        data: {},
      });
      // webMessageType.saveAndExitLevel 用来通知webview关卡结束， 如果是在新手流程，关闭按钮不要禁用了。
      sendMessageToMinicodeWeb(messageTargetType.rn, {
        type: webMessageType.saveAndExitLevel,
        data: {},
      });
      sendMessageToMinicodeWeb(messageTargetType.rn, {
        type: webMessageType.webviewClear,
        data: {},
      });
      const p1 = commands.gotoMainMenuStage('none');
      const p2 = commands.gotoMainMenuStage();
      const p3 = commands.setUndoOperationSwitch(false);
      const p4 = commands.setVisible_BattleEndFrame(false, 1);
      await Promise.all([p1, p2, p3, p4]);
    };
    const MWContext = require('../mini-global/mwcommand-context');
    let needFinallyStep = true;
    try {
      const LocalCourse = require('./local-course').default;
      LocalCourse._stopAutoSavePerMins();

      this._stopAutoSavePerMins(); // 逻辑上退出而又不需要存盘的作品不会开启自动存盘， 这里尝试停止一下也无伤大雅。

      const curLoadingStatusRet = await commands.getLoadingStatus();
      const curLoadingStatus = get(curLoadingStatusRet, ['0']);
      if (curLoadingStatus != 3) {
        console.log('quitCurMap not in game world!!!');
        needFinallyStep = false;
        return;
      }
      if (this.saveMapProcLock > 0) {
        //console.error('当前正在保存地图中， quitCurMap 会让存盘动作无法调用成功!');
        needFinallyStep = false;
        return;
      }

      // 停止积木运行
      if (!MWContext.mapLoaded) {
        const p = new Promise((resolve, reject) => {
          MWContext.eventBus.once(eventType.miniWorldMode, (mode) => {
            resolve();
          });
        });

        await Promise.race([
          p,
          new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve('timeout!');
            }, 15000);
          }),
        ]);
      }
    } catch (err) {
      console.log('quitCurMap', err);
    } finally {
      if (needFinallyStep) {
        // MWContext.mapLoaded 赋值为false 由于迷你世界接口的问题 在调用 gotoMainMenuStage 后， getLoadingStatus 还是可能返回3（在场景中）的状态
        // 有些界面使用 getLoadingStatus >= 3 判断是否在场景中不准确， 需要用 MWContext.mapLoaded 一起来判断。
        MWContext.mapLoaded = false;
        await f();
      }
    }
  };

  _flushChunk = () => commands.flushChunk().then((info) => info);

  _getTimeString = () => {
    const date = new Date();
    const myyear = date.getFullYear();
    const mymonth = date.getMonth() + 1;
    const myday = date.getDate();
    const myhours = date.getHours();
    const myminutes = date.getMinutes();
    const myseconds = date.getSeconds();

    const t = function (s) {
      if (s < 10) {
        return `0${s}`;
      }
      return `${s}`;
    };
    return t(myyear) + t(mymonth) + t(myday) + t(myhours) + t(myminutes) + t(myseconds);
  };

  _sendSaveCommand = async (
    uin,
    sb3FileNameFromWeb,
    mapPath,
    mapId,
    name,
    openCode = 0,
    strPblTargetId = '',
    strPblStepId = '',
    strLessonId = '',
    strTaskId = ''
  ) => {
    const timeStr = new Date().getTime().toString();
    const sb3PathForSave = sb3FileNameFromWeb !== '' ? `${staticPath}/${sb3FileNameFromWeb}` : '';
    return commands.saveLocalBackup(
      `${uin}`,
      mapPath,
      `${mapId}`,
      name || '',
      timeStr,
      sb3PathForSave,
      '',
      openCode,
      strPblTargetId,
      strPblStepId,
      strLessonId,
      strTaskId
    );
  };

  // 保存当前地图
  // 参数uinNumber: uin   name:作品名字  sb3FileNameFromWeb:sb3在目录中的名字
  _saveAs = async (
    uinNumber,
    name,
    sb3FileNameFromWeb,
    strMapId = '',
    snapShot = true,
    openCode = 0,
    strPblTargetId = '',
    strPblStepId = '',
    strLessonId = '',
    strTaskId = ''
  ) => {
    console.log('_saveAs', uinNumber);
    const uin = `${uinNumber}`;
    const that = this;
    if (snapShot) {
      try {
        await that.checkSnapShot();
      } catch (err) {
        console.log('_saveAs snapShot err ', err);
      }
    }
    try {
      let data = await commands.getCurWorldMapid();
      // 如果strMapId有传就使用strMapId
      if (strMapId != '') {
        data.mapId = strMapId;
      }
      console.log('_saveAs getCurWorldMapid', data);
      await commands.setMapUploadUin(Number(data.mapId), Number(uinNumber));
      data = await that._sendSaveCommand(
        uin,
        sb3FileNameFromWeb,
        data.path,
        data.mapId,
        name,
        openCode,
        strPblTargetId,
        strPblStepId,
        strLessonId,
        strTaskId
      );
      console.log('_sendSaveCommand data = ', data);
    } catch (err) {
      console.log('_saveAs err ', err);
    }
  };

  // 定时存盘处理
  autoSavePerMins = (mapId) => {
    this._autoSavePerMins(mapId);
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
      if (this.saveMapProcLock == 0) {
        const dataCurWorldMapid = await commands.getCurWorldMapid();
        const { mapId } = dataCurWorldMapid;
        // 只在场景id相同时才去保存
        if (this.autoSavePerMinsMapId === `${mapId}`) {
          this.saveCurMap('', '', false, false, false, '', '');
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

  acquireSaveMapProcLock = async (whoCall = '', nameStr = '') => {
    let oldSaveMapProcLock = this.saveMapProcLock++;
    if (this.saveMapProcLock > 1) {
      console.log(
        `${whoCall} waitSaveMapProcLock`,
        nameStr,
        'saveMapProcLock = ',
        this.saveMapProcLock
      );
      // 等待上一个存盘完成事件
      const waitSaveMapCanProc = new Promise((resolve, reject) => {
        const MWContext = require('../mini-global/mwcommand-context');
        let eventFunc = () => {
          console.log('waitSaveMapProcLock eventFunc', this.saveMapProcLock, oldSaveMapProcLock);
          if (this.saveMapProcLock == oldSaveMapProcLock) {
            MWContext.eventBus.remove(eventType.releaseSaveMapProcLock, eventFunc);
            resolve('ok');
          }
        };
        MWContext.eventBus.on(eventType.releaseSaveMapProcLock, eventFunc);
      });
      await waitSaveMapCanProc;
    }
  };

  releaseSaveMapProcLock = () => {
    // 释放一个存盘锁
    if (this.saveMapProcLock > 0) {
      this.saveMapProcLock--;
      const MWContext = require('../mini-global/mwcommand-context');
      MWContext.eventBus.emit(eventType.releaseSaveMapProcLock);
    }
  };
}

export default new LocalBackup();
