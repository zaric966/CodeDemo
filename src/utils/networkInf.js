/* eslint-disable prefer-promise-reject-errors */
/*
 * @Author: gebulin
 * @FilePath: \minicode_app_rn\src\utils\networkInf.js
 * 大部分网络接口都可写在此
 */
// import { Toast } from '@ant-design/react-native';
import { get, isObject, isFunction } from 'lodash';
import QueryString from 'querystring';
import deviceInfo from 'react-native-device-info';
import Toast from 'react-native-root-toast';

import commands from '../mini-global/commands';
import MWContext from '../mini-global/mwcommand-context';
import doUntilLoaded from './doUntilLoaded';
import env from './env';
import JSON_SAFE from './json-safe';
import localBackup from './local-backup';
import localCourse from './local-course';
import {
  eventType,
  messageTargetType,
  messageType,
  webMessageType,
  sendMessageToMinicodeWeb,
} from './message';
import request from './request';

// import { resolve } from 'path';

const MAP_UPLOAD_PATH = 'miniw/map/';

const xhrGet3 = (url, resType = null, header = null) =>
  Promise.race([
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      if (resType) {
        xhr.responseType = resType;
      }
      xhr.onload = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200 || xhr.status === 304) {
            resolve(xhr.response);
          } else {
            let res = JSON.parse(xhr.response);
            if (res && res.message) {
              res = decodeURIComponent(res.message);
            } else {
              res = xhr.response;
            }
            reject(`${xhr.status} ${res}`);
          }
        }
      };
      if (header) {
        for (const k in header) {
          xhr.setRequestHeader(String(k), String(header[k]));
        }
      }
      xhr.send();
    }),
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject('timeout');
      }, 10000);
    }),
  ]);

const xhrGet = (url, resType = null) => xhrGet3(url, resType, null);

class NetworkInterface {
  constructor() {
    this.ver = null;
    this.bCancelUpload = false; // 取消上传
    this.bCancelUploadCourseHW = false; // 取消上传课程作业
    this.bSetShareBreakPoint = false; // 设置分享MCODE的断点

    /*
     * 取消当前上传云端操作
     */
    this.cancelCurUpload = async () => {
      this.bCancelUpload = true;
      return Promise.race([
        new Promise((resolve, reject) => {
          const ret = commands.cancelUploadMCode();
          resolve(ret[0] === 0 ? 'successful' : 'failed');
        }),
        new Promise((resolve, reject) => {
          setTimeout(() => {
            this.bCancelUpload = false;
            resolve('canceling');
          }, 4000);
        }),
      ]);
    };

    // obs上传，用于获取上传MCODE以及封面时的url
    this.getObsUploadUrl = (type, ext, uin, time, s2t, sign) => {
      // console.log('getUploadUrl-----------> url = ', env.serverSiriusUrl);
      return request({
        url: `${env.serverSiriusUrl}/v1/tokens/oss`,
        data: {
          type,
          ext,
          sign: String(sign),
          uin: String(uin),
          time: String(time),
          s2t: String(s2t),
        },
        method: 'POST',
      })
        .then((resp) => {
          //console.log('getUploadUrl 786----------->', resp);
          const res = get(resp, 'data');
          if (res === undefined) {
            return Promise.reject('/v1/tokens/oss requests failed, respone data is empty');
          }
          const code = get(res, 'code');
          // 失败
          if (code != 0) {
            const mesg = get(res, 'message');
            return Promise.reject(
              '/v1/tokens/oss requests failed, cde: ' + code + ', mesg: ' + mesg
            );
          }
          // 成功
          const data = get(res, 'data');
          const uploadUrl = get(data, 'uploadUrl');
          const downloadUrl = get(data, 'downloadUrl');
          if (uploadUrl === undefined || uploadUrl.length == 0) {
            return Promise.reject('/v1/tokens/oss respone uploadUrl is empty');
          }
          if (downloadUrl === undefined || downloadUrl.length === 0) {
            return Promise.reject('/v1/tokens/oss respone downloadUrl is empty');
          }
          //console.log('getUploadUrl 795----------->', data);
          return data;
        })
        .catch((err) => Promise.reject(err));
    };

    // 上传MCode流程
    // 1、获取封面上传地址 2、上传封面 3、获取MCode上传地址 4、上传MCode
    // resultMcodeUrl 保底的mcode url
    // 返回值 Promise<mcodeDownloadUrl>
    this.reqUploadMCode = async (
      nUin,
      time,
      sign,
      s2t,
      resultMcodeUrl = undefined,
      needUploadCover = true
    ) => {
      let retUrl = {
        coverUrl: '',
        mcodeUrl: '',
      };
      let lastError;
      let ret;

      if (needUploadCover) {
        ret = await this.getObsUploadUrl('image', 'webp', nUin, time, s2t, sign).catch((e) => {
          lastError = e;
          return false;
        });
        if (ret === false) {
          return Promise.reject(lastError);
        }
        retUrl.coverUrl = get(ret, 'downloadUrl');
        // 上传封面
        ret = await commands.reqUploadCover(get(ret, 'uploadUrl')).catch((e) => {
          lastError = e;
          return false;
        });
        if (ret === false) {
          return Promise.reject(lastError);
        }
      }

      ret = await this.getObsUploadUrl('mcode', 'mcode', nUin, time, s2t, sign).catch((e) => {
        lastError = e;
        return false;
      });
      if (ret === false) {
        return Promise.reject(lastError);
      }
      retUrl.mcodeUrl = get(ret, 'downloadUrl');
      const uploadUrlForMcode = get(ret, 'uploadUrl');
      ret = await commands.reqUploadMCode(uploadUrlForMcode).catch((e) => {
        lastError = e;
        return false;
      });

      if (ret === false) {
        // 重试一次， 还不行就返回 resultMcodeUrl
        MWContext.jsonErrAnalysis({
          type: 'minicode_reqUploadCourseHomeWork_error',
          msg: `reqUploadMCode_failed_once_${JSON_SAFE.stringify(lastError)}`,
        });
        ret = await commands.reqUploadMCode(uploadUrlForMcode).catch((e) => {
          lastError = e;
          return false;
        });
        if (ret === false && resultMcodeUrl !== undefined) {
          // 使用 resultMcodeUrl
          if (typeof resultMcodeUrl == 'string' && resultMcodeUrl !== '') {
            MWContext.jsonErrAnalysis({
              type: 'minicode_reqUploadCourseHomeWork_error',
              msg: `reqUploadMCode_use_defmc_${JSON_SAFE.stringify(lastError)}`,
            });
            retUrl.mcodeUrl = resultMcodeUrl;
          } else {
            MWContext.jsonErrAnalysis({
              type: 'minicode_reqUploadCourseHomeWork_error',
              msg: `reqUploadMCode_use_empty_mcodeUrl_${JSON_SAFE.stringify(lastError)}`,
            });
          }
          ret = true;
        }
      }
      if (ret === false) {
        return Promise.reject(lastError);
      }
      return retUrl;
    };

    /*
     * 上传到云端，包含两个步骤：1、传输MCode、封面图等必须文件到服务器 2、调用服务器API保存信息到服务器数据库
     * 参数:
     * 分享信息 reqParams
     * *****字段都传string*****
     * reqParams = {
     *   sign,
     *   s2t,
     *   time,
     *   _id: 作品ID,
     *   author_id: uin,
     *   uploadMCodeUrl: 上传到云端的目标url
     *   needSaveWork: 是否要保存作品到云端
     * }
     * 返回
     * {
     *  ret: 0, // ret为0成功，失败小于0的错误码
     *  err: "ok" // err为具体错误信息，用于UI提示
     * },
     * 错误码:
     * -20001 reqUploadMCode失败 -20002 save_work失败
     * -20003 服务器操作失败 -20004 用户不存在 -20005 用户取消上传
     */
    this.uploadCloud = async (reqParams) => {
      const _id = get(reqParams, '_id');
      const author_id = window.userInfo.uin;
      const time = get(reqParams, 'time');
      const sign = get(reqParams, 'sign');
      const s2t = get(reqParams, 's2t');
      const title = get(reqParams, 'title');
      const stage_id = get(reqParams, 'stage_id');
      const target_id = get(reqParams, 'target_id');
      const course_id = get(reqParams, 'course_id');
      const donotSaveWork = get(reqParams, 'donotSaveWork') || false;

      // 从jmi获取orig_info、last_info
      const jmiValue = await localBackup.getJmiVal(_id);
      let ori_info = get(jmiValue, 'ori_info');
      let last_info = get(jmiValue, 'last_info');
      const bNeedUploadOpenSourceData = ori_info !== undefined && last_info !== undefined;

      // 前置判断取消上传
      if (this.bCancelUpload) {
        this.bCancelUpload = false;
        return {
          ret: -20005,
          err: 'cancel upload',
        };
      }

      // 上传mcode、cover等文件到服务器
      let res;
      try {
        res = await this.reqUploadMCode(author_id, time, sign, s2t);
      } catch (err) {
        // C++接口返回的错误
        console.log('save_works failed ', err);
        // Toast.fail('保存失败', Toast.SHORT, undefined, false);
        return {
          ret: -20001,
          err: 'reqUploadMCode failed',
          step: 'call reqUploadMCode',
        };
      }
      // 后置判断取消上传
      if (this.bCancelUpload) {
        this.bCancelUpload = false;
        return {
          ret: -20005,
          err: 'cancel upload',
        };
      }

      let coverUrl = get(res, 'coverUrl');
      let mcodeUrl = get(res, 'mcodeUrl');

      //  调用后台保存接口
      try {
        if (mcodeUrl === undefined) {
          throw new Error('requploadMCode mcodeUrl is Empty');
        }
        if (!donotSaveWork) {
          let saveWorkData = {
            sign,
            s2t: Number(s2t),
            time: Number(time),
            worksId: String(_id),
            uin: String(author_id),
            title,
            coverUrl,
            mcodeUrl,
          };
          // 课包id相关信息
          if (course_id) {
            saveWorkData = {
              ...saveWorkData,
              themeId: String(course_id),
            };
          }
          // 改编相关信息
          if (bNeedUploadOpenSourceData) {
            saveWorkData = {
              ...saveWorkData,
              originInfo: {
                originAuthorId: get(ori_info, 'ori_author_id'),
                originNickname: get(ori_info, 'ori_nick_name'),
                originWorksName: get(ori_info, 'ori_work_name'),
                originWorksId: get(ori_info, 'ori_work_id'),
              },
              lastInfo: {
                lastAuthorId: get(last_info, 'last_author_id'),
                lastNickname: get(last_info, 'last_nick_name'),
                lastWorksName: get(last_info, 'last_work_name'),
                lastWorksId: get(last_info, 'last_work_id'),
              },
            };
          }
          const saveWrokRet = await request({
            method: 'post',
            url: `${env.serverSiriusUrl}/v1/works/save/works`,
            data: saveWorkData,
          });
        }
        // 返回值判断
      } catch (err) {
        // 服务器返回的错误
        let ret = get(err, ['data', 'ret']);
        let errText = '保存失败';
        if (ret === -3) {
          ret = -20003;
        } else if (ret === -4) {
          ret = -20004;
        } else if (ret === -100) {
          errText = '保存失败，作者信息与你不符';
          ret = -3;
        } else if (ret === -124) {
          errText = '保存失败，存档数已达上限，请删除后重试';
          ret = -4;
        }
        console.log('save_works failed ', err);
        // Toast.fail(errText, Toast.SHORT, undefined, false);
        return {
          ret,
          err,
          setp: 'call /works_share/save_works',
          coverUrl,
          mcodeUrl,
        };
      }
      // 正常返回
      return {
        ret: 0,
        err: 'ok',
        coverUrl,
        mcodeUrl,
      };
    };

    this._uploadError = {
      // 非Lite版内错误
      overCount: '作品数量超过允许数量', // "云端作品已达50个",
      notAuthor: '作品原作者与您的信息不符',

      // reqPreUpload Lite版内报的错误
      client_error_1: '未知错误(-101)',
      client_error_2: '未知错误(-102)',
      client_error_3: '未知错误(-103)',
      auth_fa: 'auth_fail', // auth_fa -> auth_fail,去掉最后两个字符是因为地图服的报错有时会在结尾带一些换行符导致未知bug
      not_log: 'auth_fail', // not_log -> not_login,
      set_map_da: '您的作品数量已经达到上限', // fail:set_map_da
      map_list_lim: '您的作品数量已经达到上限', // fail:map_list_limi
      check_sco: '迷你世界信用分不足，暂时无法上传地图', // fail:check_score

      filte: '请修改名称或介绍后重试',
      checki: '地图正在等待审核',
      noRealNameMobi: '实名制或手机验证失败', // fail:noRealNameMobile    实名制或手机验证失败  （后面会加00 01 10, 第一位表示手机验证,  第二位表示实名 ）
      uin_not_mat: '玩家不是地图的作者', // fail:uin_not_match       玩家不是地图的作者
      need_uin_au: '未实名认证', // fail:need_uin_auth       未实名认证（旧版本）
      // 其他错误
      other_error: '未知错误(1)',
    };

    this.getUploadError = (err) => {
      const keysArray = Object.keys(this._uploadError);
      for (let i = 0; i < keysArray.length; ++i) {
        if (err.indexOf(keysArray[i]) >= 0) {
          return this._uploadError[keysArray[i]];
        }
      }

      return '未知错误';
    };

    this.ErrIsEqualKey = (err, key) => err.indexOf(key) >= 0;

    // 撤销审核当前地图接口
    this.repealMiniworldShare = (mapid) =>
      commands.reqDeleteUpload(String(mapid)).then((url) =>
        request({
          method: 'get',
          url: url[0],
        }).then(
          (resp) => {
            // 判断是否撤销成功
            const data = get(resp, 'data');
            if (data.indexOf('ok') !== 0) {
              return Promise.reject(`map_rm action failed, ret: ${data}`);
            }
          },
          (err) => Promise.reject(err)
        )
      );

    // 单独分享到迷你世界的接口
    // 返回值：Promise<json>, 成功errorCode为0，失败errorCode为-1
    // 成功返回所带参数: gameMode, openCode, miniworldLabel
    this.shareLocalbackupToMiniworld = (mapId, title) => {
      return this.shareMCodeToMinicode({
        title: title || '', // 标题默认为空
        onlyShareToMiniworld: true, // 表单独上传到迷你世界
        _id: mapId, // 作品id
        summary: '', // 默认无介绍
      })
        .then((ret) => {
          const gameMode = Number(get(ret, 'curGameMode'));
          return {
            gameMode,
            openCode: 0,
            miniworldLabel: gameMode == 4 ? 3 : 8,
            errorCode: get(ret, 'errCode'),
          };
        })
        .catch((e) => ({
          errorCode: -1,
        }));
    };

    // 分享到迷你世界接口
    // 参数
    // _id 地图id
    // 返回Promise<'ok'/'failed'>
    this.shareMiniWorld = async (_id) => {
      return this._uploadToMiniWorld(_id)
        .then(() => 'ok')
        .catch((e) => {
          if (!e.status) {
            Toast.show('未知错误', Toast.SHORT, undefined, false);
            return 'failed';
          }
          const msg = `shareMiniWorld failed, ErrorMessage: ${e.err}, mapid: ${_id}, uin : ${window.userInfo.uin}`;
          this.shareJsonErrAnalysis(msg);
          Toast.show(this.getUploadError(e.err), Toast.SHORT, undefined, false);
          return 'failed';
        });
    }; // function end

    /*
     * 分享到工坊接口--迷你编程云端
     * 参数:
     * 分享信息 reqParams
     * *****字段都传string*****
     * reqParams = {
     *   title: 标题
     *   summary: 简介
     *   strWorldType: 游戏类型
     *   tag: 标签
     *   sign: token相关,
     *   s2t: token相关,
     *   time: token相关,
     *   _id: 作品ID,
     *   inMiniWorldMap: 当前是否在场景内,
     *   shareToMiniWorld: 是否分享到迷你世界,
     *   open_code: 是否开源
     *   donotSaveWork: 是否不要保存作品到云端
     * }
     * 返回值:
     * 字段 ret 成功返回0, 失败返回小于0的错误码
     *   错误码说明:
     *   -20001 reqUploadMCode失败 -20002 save_work失败
     *   -20003 服务器操作失败 -20004 用户不存在 -20005 用户取消上传
     *   -20011, 参数出错 -20012 分享出错 -20013 上传出错 -20014 加载地图出错 -20015 上传到迷你世界出错
     * 字段 coverUrl 封面url (分享到迷你编程云端的封面)
     * 字段 mcodeUrl 封面url (分享到迷你编程云端的mcode)
     */
    this.shareMCodeToMinicode = async (reqParams) => {
      this.bSetShareBreakPoint = false;
      // 获取分享参数
      const title = get(reqParams, 'title'); // 地图名
      const summary = get(reqParams, 'summary'); // 描述
      const worldType = get(reqParams, 'worldType'); // 后面处理
      const tag = get(reqParams, 'tag'); // 标签
      const sign = get(reqParams, 'sign'); //
      const s2t = get(reqParams, 's2t'); //
      const time = get(reqParams, 'time'); //
      const _id = get(reqParams, '_id'); // mapId
      const author_id = window.userInfo.uin;
      const inMiniWorldMap = get(reqParams, 'inMiniWorldMap');
      let shareToMiniWorld = get(reqParams, 'shareToMiniWorld');
      const open_code = get(reqParams, 'openCode') || 0;
      const onlyUploadCloud = get(reqParams, 'onlyUploadCloud') || false;
      const onlyShareToMiniworld = get(reqParams, 'onlyShareToMiniworld') || false; // 允许单独上传到迷你世界
      const stage_id = get(reqParams, 'stage_id');
      const target_id = get(reqParams, 'target_id');
      const course_id = get(reqParams, 'course_id');
      const coverVideoUrl = get(reqParams, 'coverVideoUrl');
      const donotSaveWork = get(reqParams, 'donotSaveWork') || false;
      console.log('shareMCodeToMinicode', reqParams);

      let curGameMode = 4;
      if (onlyShareToMiniworld) {
        shareToMiniWorld = true;
      }

      // 参数检查，但仅上传到迷你世界不检查
      if (!onlyShareToMiniworld && !(_id && author_id && time && sign && s2t)) {
        return { ret: -20011 };
      }

      const that = this;
      let doUntilLoadedStep;
      try {
        this.checkBreakPoint(); // 检测断点：等待进地图前
      } catch (err) {
        return { ret: -20005 };
      }
      const waitEnterMapPromise = new Promise((resolve, reject) => {
        doUntilLoaded(async () => {
          // 先进入地图，获取玩法模式
          try {
            let p2 = null;
            let p = null;
            if (!inMiniWorldMap) {
              doUntilLoadedStep = 'call enterLocalBackup';
              const result = await localBackup.enterLocalBackup(`${_id}`, false, false); // 第3个参数传false 表示不需要定时存盘
              console.log('shareMCodeToMinicode enterLocalBackup', result);

              // 这里不要等 -14回调的 eventType.miniWorldMode 消息再发， webview那边估计收到-14回调后，不会处理 webMessageType.enterLocalBackup消息了， 导致p2永远等不到。
              sendMessageToMinicodeWeb(messageTargetType.rn, {
                type: webMessageType.enterLocalBackup,
                data: {
                  sb3Url: get(result, 'url'),
                },
              });

              p = Promise.race([
                new Promise((resolve2) => {
                  MWContext.eventBus.once(eventType.miniWorldMode, (mode) => {
                    if (that.shareMCodeToMinicodePTimer) {
                      clearTimeout(that.shareMCodeToMinicodePTimer);
                      that.shareMCodeToMinicodePTimer = null;
                    }
                    resolve2({ mode });
                  });
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodePTimer = setTimeout(() => {
                    console.log('获取游戏mode失败');
                    reject2(-4);
                  }, 25 * 1000);
                }),
              ]);
            } else {
              p = commands.getMiniWorldMode();
            }
            if (!MWContext.allRolesAdded) {
              // 等待页面加载完毕
              p2 = Promise.race([
                new Promise((resolve2) => {
                  MWContext.eventBus.once(messageType.allRolesAdded, () => {
                    if (that.shareMCodeToMinicodeP2Timer) {
                      clearTimeout(that.shareMCodeToMinicodeP2Timer);
                      that.shareMCodeToMinicodeP2Timer = null;
                    }
                    resolve2(true);
                  });
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodeP2Timer = setTimeout(() => {
                    console.log('webview 加载角色失败');
                    reject2(-4);
                  }, 25 * 1000);
                }),
              ]);
            } else {
              p2 = new Promise((resolve2) => {
                resolve2(true);
              });
            }

            // 获取游戏mode
            doUntilLoadedStep = 'get gameMode';
            const { mode: miniWorldMode } = await p;
            curGameMode = miniWorldMode;

            console.log('shareMCodeToMinicode miniWorldMode', miniWorldMode);

            // 等待webview 加载角色
            doUntilLoadedStep = 'wait allRolesAdded';
            await p2;

            const needMiniWorldMode = worldType === '2' ? 5 : 4;
            let nCurMiniWorldMode = miniWorldMode;
            if (!onlyShareToMiniworld && !onlyUploadCloud && miniWorldMode !== needMiniWorldMode) {
              doUntilLoadedStep = 'call changeMiniWorldMode';
              const { mode } = await Promise.race([
                new Promise(async (resolve2) => {
                  const ret = await commands.changeMiniWorldMode({ curMode: miniWorldMode });
                  if (that.shareMCodeToMinicodeChgMWModeTimer) {
                    clearTimeout(that.shareMCodeToMinicodeChgMWModeTimer);
                    that.shareMCodeToMinicodeChgMWModeTimer = null;
                  }
                  resolve2(ret);
                }),

                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodeChgMWModeTimer = setTimeout(() => {
                    console.log('切换地图玩法失败');
                    reject2(-4);
                  }, 10 * 1000);
                }),
              ]); // 这里需要传当前的模式
              nCurMiniWorldMode = mode;
            }

            if (!onlyUploadCloud) {
              doUntilLoadedStep = 'set mapInformation';
              await Promise.race([
                new Promise(async (resolve2) => {
                  await Promise.all([
                    commands.setMapName(title),
                    commands.setMapLabel(Number(miniWorldMode === 4 ? 3 : 8)), // '其他'标签
                    commands.setMapOpenMode(2), // 默认为私有
                    commands.setMapMemo(summary),
                    commands.setMapCanRecord(0),
                    commands.setMapOpenCode(Number(open_code)), // 设置迷你世界是否开源
                  ]);
                  if (that.shareMCodeToMinicodeSetMapTimer) {
                    clearTimeout(that.shareMCodeToMinicodeSetMapTimer);
                    that.shareMCodeToMinicodeSetMapTimer = null;
                  }
                  resolve2(true);
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodeSetMapTimer = setTimeout(() => {
                    console.log('地图信息设置失败');
                    reject2(-4);
                  }, 10 * 1000);
                }),
              ]);
            } else {
              doUntilLoadedStep = 'set mapInformation';
              await Promise.race([
                new Promise(async (resolve2) => {
                  await Promise.all([commands.setMapName(title)]);
                  if (that.shareMCodeToMinicodeSetMapTimer) {
                    clearTimeout(that.shareMCodeToMinicodeSetMapTimer);
                    that.shareMCodeToMinicodeSetMapTimer = null;
                  }
                  resolve2(true);
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodeSetMapTimer = setTimeout(() => {
                    console.log('地图信息设置失败');
                    reject2(-4);
                  }, 10 * 1000);
                }),
              ]);
            }

            // 保存当前作品
            doUntilLoadedStep = 'call saveCurMapForShare';
            await Promise.race([
              new Promise(async (resolve2) => {
                await localBackup.saveCurMapForShare(true, Number(open_code), title);
                if (that.shareMCodeToMinicodeSaveMapTimer) {
                  clearTimeout(that.shareMCodeToMinicodeSaveMapTimer);
                  that.shareMCodeToMinicodeSaveMapTimer = null;
                }
                resolve2(true);
              }),
              new Promise((resolve2, reject2) => {
                that.shareMCodeToMinicodeSaveMapTimer = setTimeout(() => {
                  console.log('作品保存失败');
                  reject2(-4);
                }, 20 * 1000);
              }),
            ]);

            resolve('ok');
          } catch (err) {
            const msg = `shareMCodeToMinicode doUntilLoaded failed,  FailedStep: ${doUntilLoadedStep}, CatchErr: ${err}, mapid: ${_id}, uin : ${author_id}`;
            this.shareJsonErrAnalysis(msg);
            console.log('shareMCodeToMinicode doUntilLoaded err', err);
            reject(err);
          }
        });
      });

      // 上传minicode
      let retObj = {};
      retObj.ret = -20014;
      try {
        await waitEnterMapPromise;
        this.checkBreakPoint(); // 检测断点：进地图后
        // 只分享到迷你世界的话不走uploadCloud流程
        if (!onlyShareToMiniworld) {
          retObj.ret = -20013;
          doUntilLoadedStep = 'call uploadCloud';
          const uploadCloudRet = await that.uploadCloud({
            _id,
            author_id,
            time,
            sign,
            s2t,
            title,
            target_id: (target_id && String(target_id)) || '',
            stage_id: (stage_id && String(stage_id)) || '',
            course_id: (course_id && String(course_id)) || '',
            donotSaveWork,
          });
          if (!uploadCloudRet) {
            return retObj;
          }
          if (uploadCloudRet.ret !== 0) {
            // 尝试转换json
            let err;
            try {
              if (typeof uploadCloudRet === 'object') {
                err = JSON.stringify(uploadCloudRet);
              }
            } catch (error) {
              console.log('transform json failed, ignore, ', error);
            }
            const msg = `shareMCodeToMinicode failed, FailStep: ${doUntilLoadedStep}, ErrorCode: ${uploadCloudRet.ret}, CatchErr: ${err}, mapid: ${_id}, uin : ${author_id}`;
            this.shareJsonErrAnalysis(msg);
            retObj.ret = uploadCloudRet.ret;
            return retObj;
          }

          retObj.coverUrl = get(uploadCloudRet, 'coverUrl');
          retObj.mcodeUrl = get(uploadCloudRet, 'mcodeUrl');
        }
        this.checkBreakPoint(); // 检测断点：上传完mcode到云端
        if (!onlyUploadCloud) {
          if (!onlyShareToMiniworld) {
            retObj.ret = -20012;
            doUntilLoadedStep = 'call /works_share/share';
            let shareData = {
              uin: String(author_id),
              time: Number(time),
              s2t: Number(s2t),
              sign,
              worksId: String(_id),
              openCode: Number(open_code),
              tag: Number(tag[0]),
              title,
              summary,
            };
            // 有封面Video url
            if (coverVideoUrl) {
              shareData = {
                ...shareData,
                coverVideoUrl,
              };
            }
            let shareRet = await request({
              method: 'post',
              url: `${env.serverSiriusUrl}/v1/works/share/works`,
              data: shareData,
            });
            shareRet = get(shareRet, 'data');
            if (get(shareRet, 'code') !== 0) {
              throw new Error('call /v1/works/share/works failed');
            }
          }
          this.checkBreakPoint(); // 检测断点：调用完share后端接口
          // 上传到迷你世界
          if (shareToMiniWorld) {
            retObj.ret = -20015;
            doUntilLoadedStep = 'call shareMiniWorld';
            const shareMiniWRet = await this.shareMiniWorld(_id);
            if (shareMiniWRet !== 'ok') {
              throw new Error('shareMiniWorld failed');
            }
          }
          this.checkBreakPoint(); // 检测断点：上传完mcode到迷你世界
        }

        retObj.ret = 0;
      } catch (err) {
        // 尝试转换json
        try {
          if (typeof err === 'object') {
            err = JSON.stringify(err);
          }
        } catch (error) {
          console.log('transform json failed, ignore, ', error);
        }
        console.log('uploadCloud err', err, 'step: ', doUntilLoadedStep);
        const msg = `shareMCodeToMinicode failed, FailStep: ${doUntilLoadedStep}, ErrorCode: ${err}, CatchErr: ${err}, mapid: ${_id}, uin : ${author_id}`;
        this.shareJsonErrAnalysis(msg);
      } finally {
        if (!inMiniWorldMap) {
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            type: webMessageType.webviewClear,
            data: {},
          });
          await commands.gotoMainMenuStage('none');
          await commands.gotoMainMenuStage();
        }

        // 检测是否为用户取消
        retObj.ret = this.bSetShareBreakPoint ? -20005 : retObj.ret;

        if (onlyShareToMiniworld) {
          // 单独上传迷你世界返回值定制
          return {
            curGameMode,
            errCode: retObj.ret,
          };
        } else {
          return retObj;
        }
      }
    };

    this._uploadToMiniWorld = async (mapId) => {
      await commands.reqPreUpload(mapId, -1);
    };

    this._getVer = () => {
      if (this.ver) {
        const V = this.ver;
        return new Promise((resolve) => {
          resolve(V);
        });
      }
      if (!window.sendMWCommand) {
        return new Promise((resolve) => {
          resolve('0.35.1');
        });
      }
      return commands.getVersionForEducation().then((data) => {
        this.ver = data;
        return data;
      });
    };

    this._fetchProjectRequest = (uin, targetUin, sign, time, s2t, mapFilter) =>
      this._getVer().then((ver) => {
        const queryObj = {
          act: 'search_user_maps',
          op_uin: `${targetUin}`,
          time: `${time}`,
          auth: sign,
          s2t: `${s2t}`,
          uin: `${uin}`,
          ver,
          apiid: '299',
          lang: 0,
          country: 'CN',
          channel_id: '1',
          production_id: '11000001',
          json: 1,
        };
        const queryParams = QueryString.encode(queryObj);
        const url = `${`${env.mapUrl}/${MAP_UPLOAD_PATH}`}?${queryParams}`;
        return xhrGet(url, 'json').then(
          (res) => {
            const res2 = {};
            if (!res) {
              res = {};
            }
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
      });

    this.downloadMiniWorldMap = (node, dir, md5) => {
      const url = `${env.mapUrl}/${node}/${dir}/${md5}`;
      return xhrGet(url, 'arraybuffer')
        .then((res) => res)
        .catch((err) => Promise.reject(err));
    };

    //课程作业相关接口
    /*
     * 上传课程作业到云端
     * 参数:
     * reqParams
     * *****字段都传string*****
     * reqParams = {
     *   title: 作业名字
     *   sign: token相关,
     *   s2t: token相关,
     *   time: token相关,
     *   courseId: 课程包id,
     *   lessonId:    课时id
     *   taskId:    任务id
     *   author_id: uin,
     *   uploadMCodeUrl: 上传到云端的目标url,
     *   inMiniWorldMap: 当前是否在场景内,
     *   isSaveLocalBackup: 是否同时存一个本地的作品备份, 目前仅在 inMiniWorldMap 为ture时有效果。
     *   resultMcodeUrl: 上传失败保底的标准作业url
     * }
     * 返回值: ret 成功返回0, 失败返回小于0的错误码
     *   错误码说明:
     *   -20001 reqUploadMCode失败 -20002 save_work失败
     *   -20003 服务器操作失败 -20004 用户不存在 -20005 用户取消上传
     *   -20011, 参数出错 -20012 上传出错 -20014 加载地图出错
     *
     * localBackupMapId: 如果选择本地保存一个备份, 这个字段返回本地作品id
     */
    this.uploadCloudForCourseHW = async (reqParams) => {
      // 获取分享参数
      const title = get(reqParams, 'title'); // 作业名字
      const sign = get(reqParams, 'sign'); //
      const s2t = get(reqParams, 's2t'); //
      const time = get(reqParams, 'time'); //
      const courseId = get(reqParams, 'courseId');
      const lessonId = get(reqParams, 'lessonId');
      const taskId = get(reqParams, 'taskId');
      const author_id = get(reqParams, 'author_id');
      const url = get(reqParams, 'uploadMCodeUrl');
      const inMiniWorldMap = get(reqParams, 'inMiniWorldMap');
      const isSaveLocalBackup = get(reqParams, 'isSaveLocalBackup');
      const resultMcodeUrl = get(reqParams, 'resultMcodeUrl');
      const progressCB = get(reqParams, 'progressCB');

      console.log('uploadCloudForCourseHW', reqParams);
      if (!(courseId && lessonId && url && author_id && time && sign && s2t)) {
        return {
          ret: -20011,
        };
      }
      const that = this;
      let localMapIdData;
      const waitEnterMapPromise = new Promise((resolve, reject) => {
        doUntilLoaded(async () => {
          // 先进入地图，获取玩法模式
          try {
            let p2 = null;
            let p = null;
            if (!inMiniWorldMap) {
              const result = await localCourse
                .enterCourseHomeWork(lessonId, taskId, false, false)
                .catch((e) => {
                  throw -200141;
                }); // 第3个参数传false 表示不需要定时存盘
              console.log('uploadCloudForCourseHW enterCourseHomeWork', result);

              // 这里不要等 -14回调的 eventType.miniWorldMode 消息再发， webview那边估计收到-14回调后，不会处理 webMessageType.enterLocalBackup消息了， 导致p2永远等不到。
              sendMessageToMinicodeWeb(messageTargetType.rn, {
                type: webMessageType.enterLocalBackup,
                data: {
                  sb3Url: get(result, 'url'),
                },
              });

              p = Promise.race([
                new Promise((resolve2) => {
                  MWContext.eventBus.once(eventType.miniWorldMode, (mode) => {
                    if (that.shareMCodeToMinicodePTimer) {
                      clearTimeout(that.shareMCodeToMinicodePTimer);
                      that.shareMCodeToMinicodePTimer = null;
                    }
                    resolve2({ mode });
                  });
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodePTimer = setTimeout(() => {
                    console.log('获取游戏mode失败');
                    MWContext.jsonErrAnalysis({
                      type: 'minicode_reqUploadCourseHomeWork_error',
                      msg: `getMiniWorldMode err -200142 timeout`,
                    });
                    resolve2({ mode: 4 }); // 异常情况默认返回编辑模式
                  }, 25 * 1000);
                }),
              ]);
            } else {
              p = commands.getMiniWorldMode().catch((e) => {
                MWContext.jsonErrAnalysis({
                  type: 'minicode_reqUploadCourseHomeWork_error',
                  msg: `getMiniWorldMode err -200143 ${JSON_SAFE.stringify(e)}`,
                });
                return { mode: 4 }; // 异常情况默认返回编辑模式
              });
            }
            let useSb3WhenAllRolesAdded = false;
            if (!MWContext.allRolesAdded) {
              // 等待页面加载完毕
              p2 = Promise.race([
                new Promise((resolve2) => {
                  MWContext.eventBus.once(messageType.allRolesAdded, () => {
                    if (that.shareMCodeToMinicodeP2Timer) {
                      clearTimeout(that.shareMCodeToMinicodeP2Timer);
                      that.shareMCodeToMinicodeP2Timer = null;
                    }
                    // 刚加载好sb3, 可以直接用webview allRolesAdded 事件带下来的sb3
                    useSb3WhenAllRolesAdded = true;
                    resolve2(true);
                  });
                }),
                new Promise((resolve2, reject2) => {
                  that.shareMCodeToMinicodeP2Timer = setTimeout(() => {
                    console.log('webview 加载角色失败');
                    MWContext.jsonErrAnalysis({
                      type: 'minicode_reqUploadCourseHomeWork_error',
                      msg: `wait allRolesAdded timeout -200144`,
                    });
                    resolve2(true); // 这里不强制失败了, 后面的逻辑自己判断处理
                  }, 5 * 1000);
                }),
              ]);
            } else {
              p2 = new Promise((resolve2) => {
                resolve2(true);
              });
            }

            // 获取游戏mode
            const { mode: miniWorldMode } = await p;

            console.log('uploadCloudForCourseHW miniWorldMode', miniWorldMode);

            //
            await p2;

            await Promise.race([
              new Promise(async (resolve2) => {
                await Promise.all([commands.setMapName(title)]);
                if (that.shareMCodeToMinicodeSetMapTimer) {
                  clearTimeout(that.shareMCodeToMinicodeSetMapTimer);
                  that.shareMCodeToMinicodeSetMapTimer = null;
                }
                resolve2(true);
              }),
              new Promise((resolve2, reject2) => {
                that.shareMCodeToMinicodeSetMapTimer = setTimeout(() => {
                  console.log('地图信息设置失败');
                  MWContext.jsonErrAnalysis({
                    type: 'minicode_reqUploadCourseHomeWork_error',
                    msg: `wait MinicodeSetMap timeout -200145`,
                  });
                  resolve2(true);
                }, 10 * 1000);
              }),
            ]);
            // 重新生成一张截图
            await localCourse.reSnapShot();

            // 保存当前作品
            await Promise.race([
              new Promise(async (resolve2, reject2) => {
                if (inMiniWorldMap) {
                  // 可能在场景中sb3有变化 需要用 saveCurCourseHomeWork
                  let saveHWRet = await localCourse.saveCurCourseHomeWork(
                    title,
                    false,
                    false,
                    useSb3WhenAllRolesAdded
                  );
                  if (saveHWRet.status !== 0) {
                    reject2(-200146);
                    return;
                  }

                  if (isSaveLocalBackup) {
                    localMapIdData = await localBackup.saveCurMap(
                      title,
                      '',
                      false,
                      false,
                      useSb3WhenAllRolesAdded,
                      '',
                      '',
                      courseId,
                      lessonId
                    );
                  }
                } else {
                  // 当前不在场景不用保存sb3
                  let saveHWRet = await localCourse.saveCurCourseHomeWorkForShare();
                  if (saveHWRet.status !== 0) {
                    // 记录一下服务器日志
                    reject2(-200147);
                    return;
                  }
                }
                if (that.shareMCodeToMinicodeSaveMapTimer) {
                  clearTimeout(that.shareMCodeToMinicodeSaveMapTimer);
                  that.shareMCodeToMinicodeSaveMapTimer = null;
                }

                if (isFunction(progressCB)) {
                  // 通知进度
                  progressCB(1);
                }

                resolve2(true);
              }),
              new Promise((resolve2, reject2) => {
                that.shareMCodeToMinicodeSaveMapTimer = setTimeout(() => {
                  console.log('作品保存失败');
                  reject2(-200148);
                }, 90 * 1000);
              }),
            ]);

            resolve('ok');
          } catch (err) {
            console.log('shareMCodeToMinicode doUntilLoaded err', err);
            reject(err);
          }
        });
      });

      // 上传minicode
      let returnRet = {
        ret: -20014,
      };
      try {
        await waitEnterMapPromise.catch((e) => {
          MWContext.jsonErrAnalysis({
            type: 'minicode_reqUploadCourseHomeWork_error',
            msg: `waitEnterMapPromise err exception ${JSON_SAFE.stringify(e)}`,
          });
        });
        returnRet.ret = -20013;
        const uploadCloudRet = await that
          ._uploadCloudForCourseHW({
            url,
            author_id,
            time,
            sign,
            s2t,
            title,
            coursePkgId: (lessonId && String(lessonId)) || '',
            courseId: (taskId && String(taskId)) || '',
            resultMcodeUrl,
          })
          .catch((e) => {
            returnRet.ret = -200131;
            throw e;
          });
        if (!uploadCloudRet) {
          return; // 等finally 去return
        }
        returnRet = uploadCloudRet;
      } catch (err) {
        console.log('uploadCloudForCourseHW err', err);
      } finally {
        if (!inMiniWorldMap) {
          sendMessageToMinicodeWeb(messageTargetType.rn, {
            type: webMessageType.webviewClear,
            data: {},
          });

          await commands.gotoMainMenuStage('none');
          await commands.gotoMainMenuStage();
        }
        returnRet.localBackupMapId = isObject(localMapIdData)
          ? get(localMapIdData, 'mapId')
          : undefined;
        return returnRet;
      }
    };

    /*
     * 取消当前上传课程作业云端操作
     */
    this.cancelCurCourseHWUpload = async () => {
      this.bCancelUploadCourseHW = true;
      return Promise.race([
        new Promise((resolve, reject) => {
          const ret = commands.cancelUploadCourseHomeWork();
          resolve(ret[0] === 0 ? 'successful' : 'failed');
        }),
        new Promise((resolve, reject) => {
          setTimeout(() => {
            this.bCancelUploadCourseHW = false;
            resolve('canceling');
          }, 4000);
        }),
      ]);
    };

    /*
     * 上传课程作业到云端(私有接口不要直接调用)
     * 参数:
     * 分享信息 reqParams
     * *****字段都传string*****
     * reqParams = {
     *   title,
     *   sign,
     *   s2t,
     *   time,
     *   coursePkgId: 课程包id,
     *   courseId:    课程id
     *   author_id: uin,
     *   url: 上传到云端的目标url
     *   resultMcodeUrl: 保底标准作业url
     * }
     * 返回
     * {
     *  ret: 0, // ret为0成功，失败小于0的错误码
     *  err: "ok" // err为具体错误信息，用于UI提示
     * },
     * 错误码:
     * -20001 reqUploadMCode失败 -20002 save_work失败
     * -20003 服务器操作失败 -20004 用户不存在 -20005 用户取消上传
     */
    this._uploadCloudForCourseHW = async (reqParams) => {
      const url = get(reqParams, 'url');
      const author_id = get(reqParams, 'author_id');
      const time = get(reqParams, 'time');
      const sign = get(reqParams, 'sign');
      const s2t = get(reqParams, 's2t');
      const title = get(reqParams, 'title');
      const lessonId = get(reqParams, 'coursePkgId');
      const taskId = get(reqParams, 'courseId');
      let resultMcodeUrl = get(reqParams, 'resultMcodeUrl');
      if (this.bCancelUploadCourseHW) {
        this.bCancelUploadCourseHW = false;
        return {
          ret: -20005,
          err: 'cancel upload',
        };
      }
      console.log(
        'pyf test _uploadCloudForCourseHW ',
        lessonId,
        taskId,
        url,
        author_id,
        time,
        sign,
        s2t,
        resultMcodeUrl
      );

      if (resultMcodeUrl === undefined) {
        resultMcodeUrl = ''; // 没有传 resultMcodeUrl 但是仍然要保底成功
      }

      // 上传mcode 但是不用上传封面
      return this.reqUploadMCode(author_id, time, sign, s2t, resultMcodeUrl, false)
        .then((res) => ({
          ret: 0,
          err: 'ok',
          url: get(res, 'mcodeUrl'),
        }))
        .catch((err) => {
          // {"status":-2,"err":"{\"ret\":-100,\"msg\":\"work auth fail\"}"}
          MWContext.jsonErrAnalysis({
            type: 'minicode_reqUploadCourseHomeWork_error',
            msg: `${JSON_SAFE.stringify(err)}`,
          });
          const status = get(err, ['status']);
          let ret = -200013; // 未知错误
          let errText = '保存失败';
          if (status === -2) {
            // 服务器返回的错误
            const data = JSON_SAFE.parse(get(err, ['err']));
            if (data && get(data, ['ret'])) {
              ret = get(data, ['ret']);
            }
            if (ret === -3) {
              ret = -20003;
            } else if (ret === -4) {
              ret = -20004;
            } else if (ret === -100) {
              errText = '保存失败，作者信息与你不符';
              ret = -200011;
            } else if (ret === -124) {
              errText = '保存失败，存档数已达上限，请删除后重试';
              ret = -200012;
            }
          } else {
            if (typeof status === 'number') {
              // pyf -xxxx20001 xxxx表示c++接口返回的错误
              ret = -(Math.abs(status) * 100000 + 20001);
            }
          }
          console.log('save_works failed ', err);

          // Toast.fail(errText, Toast.SHORT, undefined, false);
          return {
            ret,
            err: errText,
          };
        });
    };

    // 检查断点
    this.checkBreakPoint = () => {
      if (this.bSetShareBreakPoint) throw new Error('Stop Share, Cancel By User!');
    };

    // 设置分享断点
    this.setShareBreakPoint = () => {
      this.bSetShareBreakPoint = true;
    };

    // 打印日志到服务器
    this.shareJsonErrAnalysis = async (strMsg) => {
      const manufacturer = await deviceInfo.getManufacturer();
      const phoneInfo = `, manufacturer : ${manufacturer}, brand : ${deviceInfo.getBrand()}, deviceId : ${deviceInfo.getDeviceId()}, model : ${deviceInfo.getModel()}, systemName : ${deviceInfo.getSystemName()}, systemVersion : ${deviceInfo.getSystemVersion()}, uniqueId : ${deviceInfo.getUniqueId()}, version : ${deviceInfo.getVersion()}`;
      let msg = strMsg + phoneInfo;
      // console.log('==============1047', msg);
      MWContext.jsonErrAnalysis({
        type: 'minicode_save_and_share_error',
        msg,
      });
    };
  } // constructor end
}

const objNetworkInterface = new NetworkInterface();

export default objNetworkInterface;
