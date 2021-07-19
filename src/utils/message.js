/*
 * @Author: maoguijun
 * @Date: 2020-03-07 17:57:16
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-07-10 11:01:58
 * @FilePath: \minicode_app_rn\src\utils\message.js
 * @message : react-native 与 webview 通信相关
 */
import { get, isFunction, set } from 'lodash';

import { gameModes } from '../containers/game/model/data';
import commands from '../mini-global/commands';
import * as analysis from './analysis';
import command from '../mini-global/command';
import { minicodeChapterLevelPass } from '../utils/analysis';
import globalData from './globalData';
import Toast from 'react-native-root-toast';

let playType;
let common;

/**
 *  接收webview的消息
 */
export const messageType = {
  // app 内路由跳转 // 具体可跳转路由见 src\containers\index.js
  appPath: 'minicode-appPath',

  // 用来打开浏览器
  link: 'minicode-link',

  // 获取数据
  // getData: "minicode-getdata",

  // 存储、更新闯关数据
  saveEnterLevelData: 'minicode-saveCheckpointData',

  // 关闭编程弹窗
  closeWeb: 'minicode-closeweb',

  // 调用dispatch
  dispatch: 'minicode-dispatch',

  // 重新挑战
  restartEnterLevel: 'minicode-restartEnterLevel',

  // 接收闯关结果
  receiveLevelResult: 'minicode-receiveLevelResult',

  // 主角和配角的坐标
  setCoordinate: 'minicode-setCoordinate',

  // 新手指引步骤
  guideStep: 'minicode-guideStep',

  // 重新加载完成
  restartReady: 'minicode-restartReady',

  // 是否正在运行中
  toggleRunningState: 'minicode-toggleRunningState',

  // 导出sb3
  exportSb3: 'minicode-exportSb3',

  // 导出lua
  exportLua: 'minicode-exportLua',

  // 删除sb3
  deleteSb3: 'minicode-deleteSb3',

  // 角色加载完毕，可以生产Lua了
  allRolesAdded: 'minicode-allRolesAdded',

  // webview scratch log
  scratchLog: 'minicode-scratchLog',

  // 积木整理提示
  jointTip: 'minicode-jointTip',

  // ai小助手的信息
  aiParams: 'minicode-aiParams',

  // 录播课试玩胜利
  playSuccess: 'minicode-playSuccess',

  // 录播课试玩失败
  playFail: 'minicode-playFail',

  // 新手指引里， 高亮重置地图按钮
  hignlightResetBtn: 'minicode-hignlightResetBtn',

  // 新手指引里， 重置地图
  autoOfReset: 'minicode-autoofreset',

  // 跳过任务
  skipVideoCourseTask: 'mincode-skipVideoCourseTask',

  // 转为玩法
  changeToMiniWorldMode: 'changeMiniWorldMode',

  // webview js 加载完成，可以接收消息了
  webviewJsLoaded: 'webviewJsLoaded',

  // iOS Scratch 音效
  playMusicCloud: 'playMusicCloud',
};

/**
 * eventBus 传递消息。（用于RN中非组件之间传递消息）
 */
export const eventType = {
  /**
   * 游戏模式消息类型
   */
  miniWorldMode: 'event-miniWorldMode',
  localBackupSaveMapCanProc: 'local-backup-save-map-can-proc', // local-backup.js 存盘相关内部逻辑使用 不要监听这个事件
  staticServerLoaded: 'staticServerLoaded', // 静态服已经加载完毕
  x5Loaded: 'x5Loaded', // x5已经加载完毕
  clearAutoSaveInterval: 'clearAutoSaveInterval', // 清理存盘定时器事件
  releaseSaveMapProcLock: 'releaseSaveMapProcLock', // 释放了一个存盘锁事件
};

export const restartEnterLevelType = {
  rnRestart: 'rnRestart',
  webRestart: 'webRestart',
};

export const levelResultType = {
  success: 1,
  fail: 0,
};

/**
 *  发送到webview的
 */
export const webMessageType = {
  // 开始闯关
  enterLevel: 'webview-enterLevel',

  // 创建作品
  createWorks: 'webview-createWorks',

  // 加载本地作品
  enterLocalBackup: 'enterLocalBackup',

  //
  enterExampleMCode: 'enterExampleMCode',

  // 切换玩法
  changeMiniWorldMode: 'webview-changeMiniWorldMode',

  // 运行
  runProject: 'webview-runProject',

  // 停止
  stopProject: 'webview-stopProject',

  // 退出闯关
  saveAndExitLevel: 'webview-exit',

  // 退出创作地图
  saveAndExit: 'webview-saveAndExit',

  // 设置迷你世界模式
  setMiniWorldMode: 'webview-setMiniWorldMode',

  // 进入地图需传sb3Url
  workshopEnterMap: 'webview-workshop-enterMap',

  // 导出sb3
  exportSb3: 'webview-exportSb3',

  // 导出lua
  exportLua: 'webview-exportLua',

  // 清理webview
  webviewClear: 'webview-clear',

  // 设置角色初始信息(位置,快捷栏)
  webviewSetPlayerInitInfo: 'webview-setPlayerInitInfo',

  // 闯关制作
  webviewEnterRecordLevel: 'webview-enterRecordLevel',
  // 用户点击了编程按钮
  userClickCodeBtn: 'webview-userClickCodeBtn',

  // 发送用户信息
  webviewUserInfo: 'webview-userInfo',

  // 系统课闯关之作
  webviewEnterSystemLevelTask: 'webview-enterSystemLevelTask',
};

/**
 * 发送消息给编程工具WebView的Type两大类型
 */
export const messageTargetType = {
  rn: 'minicode-rn',
  lite: 'minicode-lite',
};

/**
 * 发送消息给编程工具WebView
 */
export const sendMessageToMinicodeWeb = (type, data) => {
  if (!window.web) {
    Toast.show('编程工具启动失败', {
      position: Toast.positions.CENTER,
    });
    return;
  }

  console.log('sendMessageToMinicodeWeb type', type);

  window.web.postMessage(
    JSON.stringify({
      type: type,
      data: data,
    })
  );
};

/**
 *
 * @param {string} message
 */
const postErrorMessage = (message) => {
  sendMessageToMinicodeWeb('error', message);
};

// data = {
//     type:"string",  rn/lite
//     data:{
//         type: messageType
//         data:{}
//     }
// }/**

/**
 * 编程工具WebView 发出的消息处理。
 */
export const onMessage = async (history, dispatch, d) => {
  const mcodeManager = require('./mcode-manager').default;
  const { levelSucc, levelFail, restoreLevel } = mcodeManager;

  const accountManager = require('./account-manager').default;
  const { setLastStartLevel, getLastStartLevel } = accountManager;

  // console.log("onMessage", data);
  const data = JSON.parse(d);
  const type = get(data, 'type');
  const newType = get(data, ['data', 'type']);
  const newData = get(data, ['data', 'data']);
  const seq = get(data, ['data', 'seq']);
  switch (type) {
    // 发送到rn的消息
    case messageTargetType.rn: {
      console.log(`newType${newType}`);
      if (!playType) {
        const aa = require('../components/videoCourse/model');
        playType = get(aa, 'playType');
      }
      if (!common) {
        common = require('./common');
      }
      // 打点
      if (/^dadian-/.test(newType)) {
        const dadianType = newType.replace('dadian-', '');
        if (!isFunction(analysis[dadianType])) {
          return;
        }
        analysis[dadianType](newData);
        return;
      }
      switch (newType) {
        case messageType.appPath: {
          history.push(newData);
          break;
        }
        // webview js 加载完成
        case messageType.webviewJsLoaded: {
          window.webViewJsLoaded = true;
          return;
        }
        // 转为玩法
        case messageType.changeToMiniWorldMode: {
          if (globalData.getData('changeMiniWorldMode')) {
            return;
          }
          globalData.setData('changeMiniWorldMode', 1);

          const store = require('../stores').default;
          const rootState = store.getState();
          const gameMode = get(rootState, ['game', 'gameMode']);
          const doneBtnVisible = get(rootState, ['game', 'doneBtnVisible']);
          const biantongkuanBtn = get(rootState, ['game', 'biantongkuanBtn']);

          const setPlayModeCodeButtonStatus = get(dispatch, [
            'game',
            'setPlayModeCodeButtonStatus',
          ]);
          const changeGameMode = get(dispatch, ['game', 'changeGameMode']);
          const changeDoneBtnVisible = get(dispatch, ['game', 'changeDoneBtnVisible']);
          const changeDoneTextVisible = get(dispatch, ['game', 'changeDoneTextVisible']);
          const setGameData = get(dispatch, ['game', 'setGameData']);

          const parentKey = get(gameMode, 'parentKey');
          const targetMode = get(gameMode, ['key']) === 'edit' ? 'play' : 'edit';
          setPlayModeCodeButtonStatus(false);

          const result = await commands.getMiniWorldMode();
          analysis.minicodeSyscourseTaskRunClick({
            scene: '1',
            state: get(result, 'mode') === 4 ? '0' : '1',
          });

          setGameData({
            isShowVipCourseFailTip: false,
          });

          const MWContext = require('../mini-global/mwcommand-context');
          if (get(result, 'mode') === 4) {
            // 从编辑转成玩法
            // 编辑转玩法时保存一下player的当前状态，以便于玩法转回编辑时恢复player状态
            const { mode: gameRuleSaveMode } = await commands.getGameRuleSaveMode();
            console.log('pyf test changeMiniWorldMode', gameRuleSaveMode);
            let playerInitInfo;
            if (gameRuleSaveMode === 1) {
              // 地图规则是转回编辑需要重置地形
              // 需要备份一下地形， 因为如果不备份，玩法模式又存了地形的话(任务配置完成后不重置地形存盘)之后切编辑无法还原地形了。
              playerInitInfo = await commands.flushChunk(false, true);
            } else {
              playerInitInfo = await commands.flushChunk();
            }

            // 通知webview转玩法
            const p1 = new Promise((resolve, reject) => {
              MWContext.eventBus.once(messageType.exportLua, (newData) => {
                resolve(newData);
              });
            });
            // 闯关中编同款创作完成的按钮显示
            if (!doneBtnVisible && biantongkuanBtn) {
              changeDoneBtnVisible(true);
              setTimeout(() => {
                changeDoneTextVisible(false);
              }, 3000);
            }
            sendMessageToMinicodeWeb(messageTargetType.rn, {
              type: webMessageType.changeMiniWorldMode,
              data: {
                mode: targetMode,
              },
            });
            // 获取转lua结果
            const { playModeBlock, playModeEvent } = await Promise.race([
              p1,
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  resolve({ playModeBlock: '', playModeEvent: '' });
                }, 15000);
              }),
            ]);
            const mapIdData = await commands.getCurWorldMapid();

            await commands.saveMinicodeLua(`${mapIdData.mapId}`, playModeBlock, 'jimu_start_ver2');
          } else {
            sendMessageToMinicodeWeb(messageTargetType.rn, {
              type: webMessageType.changeMiniWorldMode,
              data: {
                mode: targetMode,
              },
            });
          }
          await commands.changeMiniWorldMode({ curMode: get(result, 'mode') });
          changeGameMode(get(gameModes, [parentKey, targetMode]));
          console.log(355, parentKey);

          if (/^videoCourse/.test(parentKey)) {
            // 录播课
            analysis.minicodeCourseEnterPlay();
          }

          break;
        }
        case messageType.link: {
          // Linking.openURL(newData);
          const url = get(newData, 'url');
          if (!url) {
            Toast.show('链接地址不正确', {
              position: Toast.positions.CENTER,
            });
          }
          const browserOpenUrl = get(dispatch, ['miniBrowser', 'browserOpenUrl']);
          browserOpenUrl(encodeURI(url));
          break;
        }
        case messageType.dispatch: {
          // {
          //     type:"miniaixue-dispatch",
          //     data:{},
          //     dispatchType:"minicodetools-changerToolsVisible" // model-func
          // }
          const dispatchType = get(data, 'dispatchType');
          if (!dispatchType) {
            postErrorMessage('dispatchType 必须要有');
            return;
          }

          const [model, func] = dispatchType.split('-');

          if (!model || !func) {
            return;
          }

          const dispatchFunc = get(dispatch, [model, func]);
          if (!dispatchFunc || !isFunction(dispatchFunc)) {
            postErrorMessage(`${model}中没有${func}这个方法`);
            return;
          }
          dispatchFunc(get(newData, 'data'));
          break;
        }
        // 接收消息，关闭web
        case messageType.closeWeb: {
          /**
           * iOS12~iOS13在web播放音效的时候会报错，导致关闭web有所延迟，所以关闭的音效在RN层设置
           *  Error acquiring assertion: <NSError: 0x285663270; domain: RBSAssertionErrorDomain; code: 2; reason: "Client is missing required entitlement"> {
              userInfo = {
                  RBSAssertionAttribute = <RBSLegacyAttribute: 0x101f45e40; requestedReason: MediaPlayback; reason: MediaPlayback; flags: PreventTaskSuspend | PreventTaskThrottleDown | WantsForegroundResourcePriority>;
                }
           */
          // window.clickSound.play();
          const func = get(dispatch, ['minicodetools', 'changerToolsVisible']);
          if (isFunction(func)) {
            func(false);
          }
          break;
        }
        // 接受角色坐标
        case messageType.setCoordinate: {
          const setCoordinate = get(dispatch, ['game', 'setCoordinate']);
          if (isFunction(setCoordinate)) {
            setCoordinate(newData);
          }
          break;
        }
        // 接收闯关结果
        case messageType.receiveLevelResult: {
          // const tip = {
          //     type: "minicode-rn",
          //     data: { type: "minicode-receiveLevelResult", data: {
          //         type:0,  // 0 :失败 1: 成功
          //         star:2,

          //     } },
          // };
          console.log(432, messageType.receiveLevelResult, data);
          const store = require('../stores').default;
          const rootState = store.getState();
          console.log('rootState22==', rootState);
          const userInfo = get(rootState, ['login', 'userInfo']);
          const selectedChapter = get(rootState, ['chapter', 'selectedChapter']);
          const selectedLevel = get(rootState, ['game', 'selectedLevel']);

          const allSteps = get(rootState, ['game', 'allSteps']);

          const levelResultSuccess = get(dispatch, ['game', 'levelResultSuccess']);
          const changeJingGaoStatus = get(dispatch, ['game', 'changeJingGaoStatus']);
          const changeLevelClueStatus = get(dispatch, ['game', 'changeLevelClueStatus']);
          const changerToolsVisible = get(dispatch, ['minicodetools', 'changerToolsVisible']);

          const getAccountInfo = get(dispatch, ['login', 'getAccountInfo']);

          const setChaptersListWithUser = get(dispatch, ['adventure', 'setChaptersListWithUser']);

          // const setAiParams = get(dispatch, ['aiAssistant', 'setAiParams']);

          const setAllSteps = get(dispatch, ['game', 'setAllSteps']);

          const resultType = get(newData, 'type');

          const getUserIllustratedBook = get(dispatch, [
            'illustratedBook',
            'getUserIllustratedBook',
          ]);

          // 计算耗时
          const costTime = Math.floor((Number(new Date()) - window.startEnterLevelTime) / 1000);
          console.log('costTime:', costTime);

          // 如果有新手指引则清除新手指引
          if (allSteps) {
            setTimeout(() => {
              setAllSteps(undefined);
            }, 1 * 1000);
          }

          const last = await getLastStartLevel(get(userInfo, 'uin'));
          console.log('levelResultType', levelResultType);
          changeLevelClueStatus(0);

          if (resultType === levelResultType.success) {
            changerToolsVisible(false);
            levelResultSuccess(get(newData, 'star'));
            await levelSucc({
              uin: get(userInfo, 'uin'),
              chapterId: get(selectedChapter, '_id'),
              levelId: get(selectedLevel, '_id'),
              star: get(newData, 'star'),
              exp: get(selectedLevel, ['reward', 'exp']),
              gold: get(selectedLevel, ['reward', 'gold']),
              passTime: costTime,
            });

            // 隐藏ai助手
            // setAiParams({
            //   aiAssistantShow: false,
            // });

            if (get(last, ['lastLevel'])) {
              // 更新
              set(last, ['lastLevel', 'completed'], true);
              await setLastStartLevel(get(userInfo, 'uin'), last);
            }
            await getAccountInfo({
              uin: String(get(userInfo, 'uin')),
            });
            // setChaptersListWithUser();
            getUserIllustratedBook(get(userInfo, 'uin'));
            //章节闯关结果
            minicodeChapterLevelPass({
              chapter_id: get(selectedChapter, '_id'),
              chapter_idx: get(selectedLevel, 'chapterIndex') + 1,
              level_id: get(selectedLevel, '_id'),
              level_idx: get(selectedLevel, 'levelIndex') + 1,
              success: 1,
              star: get(newData, 'star'),
              duration: costTime,
            });
          } else {
            changeJingGaoStatus(true);
            levelFail({
              uin: get(userInfo, 'uin'),
              chapterId: get(selectedChapter, '_id'),
              levelId: get(selectedLevel, '_id'),
              star: 0,
              passTime: costTime,
            });
            const changeAiTipText = get(dispatch, ['game', 'changeAiTipText']);
            const setCounter = get(dispatch, ['game', 'setCounter']);
            const counter = get(rootState, ['game', 'counter']);
            setCounter(counter + 1);
            changeAiTipText(
              counter === 3
                ? '遇到问题别担心，点一下我，告诉你通关技巧哦'
                : '咦，看来积木组合不正确，再调整一下吧！'
            );
            //章节闯关结果
            minicodeChapterLevelPass({
              chapter_id: get(selectedChapter, '_id'),
              chapter_idx: get(selectedLevel, 'chapterIndex') + 1,
              level_id: get(selectedLevel, '_id'),
              level_idx: get(selectedLevel, 'levelIndex') + 1,
              success: 0,
              star: 0,
              duration: costTime,
            });
          }
          break;
        }
        // 接收重新挑战的
        case messageType.restartEnterLevel: {
          // const tip = {
          //     type: "minicode-rn",
          //     data: { type: "minicode-receiveLevelResult", data: {
          //         type:0,  // 0 :失败 1: 成功
          //         star:2,

          //     } },
          // };
          const store = require('../stores').default;
          const rootState = store.getState();
          const userInfo = get(rootState, ['login', 'userInfo']);
          const selectedLevel = get(rootState, ['game', 'selectedLevel']);
          const reStartEnterLevel = get(dispatch, ['game', 'reStartEnterLevel']);
          const changeJingGaoStatus = get(dispatch, ['game', 'changeJingGaoStatus']);

          changeJingGaoStatus(false);

          await restoreLevel();
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            seq,
            status: 0,
            type: restartEnterLevelType.webRestart,
          });
          if (isFunction(reStartEnterLevel)) {
            reStartEnterLevel();
          }
          break;
        }
        // 新手指引的下一步
        case messageType.guideStep: {
          const setVipCourseGuideStep = get(dispatch, ['vipCourse', 'setVipCourseGuideStep']);
          if (isFunction(setVipCourseGuideStep)) {
            setVipCourseGuideStep(get(newData, 'step'));
          }
          break;
        }
        case messageType.saveEnterLevelData: {
          break;
        }
        case messageType.restartReady: {
          window.restartReady = true;
          break;
        }

        // 是否在运行
        case messageType.toggleRunningState: {
          const store = require('../stores').default;
          const rootState = store.getState();
          const toggleRunningState = get(dispatch, ['game', 'toggleRunningState']);
          toggleRunningState(get(newData, 'isRunning'));
          const changeDoneBtnVisible = get(dispatch, ['game', 'changeDoneBtnVisible']);
          const changeDoneTextVisible = get(dispatch, ['game', 'changeDoneTextVisible']);
          const doneBtnVisible = get(rootState, ['game', 'doneBtnVisible']);
          const biantongkuanBtn = get(rootState, ['game', 'biantongkuanBtn']);

          // 闯关中编同款创作完成的按钮显示
          if (!doneBtnVisible && biantongkuanBtn) {
            changeDoneBtnVisible(true);
            setTimeout(() => {
              changeDoneTextVisible(false);
            }, 3000);
          }
          break;
        }

        case messageType.exportSb3: {
          console.log('导出sb3 Data =', newData);
          const MWContext = require('../mini-global/mwcommand-context');
          MWContext.eventBus.emit(messageType.exportSb3, newData);
          break;
        }

        // 导出lua
        case messageType.exportLua: {
          console.log('导出lua', newData);
          const MWContext = require('../mini-global/mwcommand-context');
          MWContext.eventBus.emit(messageType.exportLua, newData);
          break;
        }

        // 删除sb3
        case messageType.deleteSb3: {
          console.log('删除sb3');
          const MWContext = require('../mini-global/mwcommand-context');
          MWContext.eventBus.emit(messageType.deleteSb3, newData);
          break;
        }

        // 网页配角加载完毕
        case messageType.allRolesAdded: {
          console.log('网页配角加载完毕');
          const MWContext = require('../mini-global/mwcommand-context');
          MWContext.allRolesAdded = true;
          MWContext.sb3FileNameWhenAllRolesAdded = newData.sb3FileName;
          MWContext.eventBus.emit(messageType.allRolesAdded, newData);
          break;
        }

        // scratch 打印log
        case messageType.scratchLog: {
          const MWContext = require('../mini-global/mwcommand-context');
          MWContext.scratchLogAnalysis({
            type: 'minicode_mobile_scratch_log',
            msg: `mobile_scratch_log: ${newData.logStr}`,
          });
          break;
        }

        // 积木整理提示
        case messageType.jointTip: {
          const setJoinTipStatus = get(dispatch, ['game', 'setJoinTipStatus']);
          setJoinTipStatus();
          break;
        }

        // 接收ai小助手的参数
        case messageType.aiParams: {
          // const setAiParams = get(dispatch, ['aiAssistant', 'setAiParams']);
          // setAiParams(newData);
          break;
        }

        // 录播课试玩胜利
        case messageType.playSuccess: {
          const setPlayButtonType = get(dispatch, ['videoCourse', 'setPlayButtonType']);
          setPlayButtonType(playType.success);
          break;
        }

        // 录播课试玩失败
        case messageType.playFail: {
          const setPlayButtonType = get(dispatch, ['videoCourse', 'setPlayButtonType']);
          setPlayButtonType(playType.fail);
          break;
        }

        // 新手指引里， 高亮重置地图按钮
        case messageType.hignlightResetBtn: {
          const changeGuideStep = get(dispatch, ['game', 'changeGuideStep']);
          const setAllSteps = get(dispatch, ['game', 'setAllSteps']);
          setAllSteps({
            '-1-1-1': '-1-1-1',
          });
          changeGuideStep('-1-1-1');
          break;
        }

        // 新手指引里， 重置地图
        case messageType.autoOfReset: {
          if (window.restartReady) {
            const reStartEnterLevel = get(dispatch, ['game', 'reStartEnterLevel']);
            window.restartReady = false;
            await restoreLevel();
            sendMessageToMinicodeWeb(messageTargetType.rn, {
              type: restartEnterLevelType.rnRestart,
            });
            reStartEnterLevel();
          }
          break;
        }

        //  跳过任务
        case messageType.skipVideoCourseTask: {
          const store = require('../stores').default;
          const rootState = store.getState();
          const currentTask = get(rootState, ['videoCourse', 'currentTask']);
          const taskList = get(rootState, ['videoCourse', 'taskList']);

          const currentTaskIndex = get(currentTask, 'taskIndex');
          const nextTask = get(taskList, currentTaskIndex + 1);

          const setCurrentTaskData = get(dispatch, ['videoCourse', 'setCurrentTaskData']);
          setCurrentTaskData({
            currentTask: nextTask,
            restore: true,
          });
          break;
        }

        // iOS scratch音效
        case messageType.playMusicCloud: {
          console.log('meeageType::playMusicCloud');
          const store = require('../stores').default;
          const rootState = store.getState();
          const miniCodeToolsVisible = get(rootState, ['minicodetools', 'miniCodeToolsVisible']);
          if (!miniCodeToolsVisible) {
            return;
          }
          const playSoundType = get(newData, 'type', '');
          if (playSoundType === 'click') {
            // 点击
            window.clickSound && window.clickSound.play();
          } else if (playSoundType === 'connect') {
            // 链接
            window.clickScratchConnect && window.clickScratchConnect.play();
          } else if (playSoundType === 'delete') {
            // 删除
            window.clickScratchDelete && window.clickScratchDelete.play();
          }
          break;
        }
        default:
          break;
      }
      break;
    }
    // 发送给lite 的消息
    case messageTargetType.lite: {
      command.sendCommandFromWebView(newType, newData, seq);
      break;
    }

    default:
      break;
  }
};
