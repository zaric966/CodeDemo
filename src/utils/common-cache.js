/*
 * @Author: gebulin
 * @Date: 2020-03-20 18:30:03
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-03-13 15:59:39
 * @FilePath: \minicode_app_rn\src\utils\common-cache.js
 * 普通缓存接口
 */
import { get, reject } from 'lodash';
import { sleep } from './common';

import env from './env';
import JSONSAFE from './json-safe';
import config from './liveServer/config';
import { resolve } from './path-util';
import RNFS from './react-native-fs';
import request from './request';

const { path } = config;

// 存储commonCache的状态
let _commonCacheStatus = {};
// 初始化commandcahe基础目录
const initCommonCachePath = async () => {
  const dirPath = `${path}/commoncache`;
  const existDir = await RNFS.exists(dirPath);
  if (!existDir) {
    await RNFS.mkdir(dirPath);
    console.log(`Not Exist ${dirPath}, Create it.`);
  }
};

// 异步管理writeFile任务
let _writeFileTaskQueue = {};
// 延迟0.1秒执行任务
const _asyncWriteFileTask = (cacheFileName, jsonPath, jsonData) => {
  _writeFileTaskQueue[cacheFileName] = true; // 记为占用
  setTimeout(async () => {
    await RNFS.writeFile(jsonPath, JSON.stringify(jsonData), 'utf8');
    _writeFileTaskQueue[cacheFileName] = false;
  }, 50);
};

// 检查并等待之前的任务完成
const _waitWriteFileTaskFinish = async (cacheFileName) => {
  // 初始化状态即为非占用状态
  if (_writeFileTaskQueue[cacheFileName] === undefined) {
    _writeFileTaskQueue[cacheFileName] = false;
  }
  // 等待前面的任务解除占用
  const waitPreTaskFinishProc = new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      if (_writeFileTaskQueue[cacheFileName] === false) {
        clearInterval(intervalId);
        resolve();
      }
    }, 100);
  });
  await waitPreTaskFinishProc;
};

const _commonCacheStrategiesA = async (cacheFileName, requestFunc) => {
  // 本地缓存文件, json路径都为: path/commoncache/xxxxx.json
  _waitWriteFileTaskFinish(cacheFileName);
  const dirPath = `${path}/commoncache`;
  const jsonPath = `${dirPath}/${cacheFileName}`;
  let existJson;
  if (_commonCacheStatus[cacheFileName] === undefined) {
    existJson = await RNFS.exists(jsonPath);
    _commonCacheStatus[cacheFileName] = existJson;
  } else {
    existJson = _commonCacheStatus[cacheFileName];
  }
  const localJson = existJson ? await RNFS.readFile(jsonPath) : undefined;
  // console.log("localFileRes = " + specialLocalJson);
  const localData = JSONSAFE.parse(localJson);
  const localVersion = get(localData, 'version');
  // 网络请求
  // let curTs = Date.now();
  let serverResp = await requestFunc(localVersion);
  // console.log(cacheFileName, ', 网络请求耗时:', Date.now() - curTs);
  // console.log(
  //   cacheFileName,
  //   ', 网络请求返回数据量:',
  //   JSON.stringify(serverResp).length / 1024,
  //   ' KB'
  // );

  // 清洗数据
  serverResp = get(serverResp, 'data');
  // console.log("************************");
  // console.log("serverResp = " + JSON.stringify(serverResp))
  // console.log("************************");
  if (
    serverResp == undefined ||
    get(serverResp, 'version') === localVersion ||
    (get(serverResp, 'data') !== undefined && Object.keys(get(serverResp, 'data')).length == 0)
  ) {
    return localVersion !== undefined ? get(localData, 'data') : undefined;
  }

  // console.log("serverResp = " + JSON.stringify(serverResp))
  // 更新本地緩存文件
  _asyncWriteFileTask(cacheFileName, jsonPath, serverResp);
  return get(serverResp, 'data');
};

const _getListData = (cacheFileName, apiPath, uin, time, s2t, sign, page, pageSize) =>
  _commonCacheStrategiesA(cacheFileName, (localVersion) =>
    request({
      url: `${env.serverUrl}${apiPath}`,
      params: {
        uin,
        time,
        s2t,
        sign,
        version: localVersion == undefined ? 0 : localVersion,
        page: localVersion == undefined ? 0 : page,
        pageSize,
      },
      timeout: 10000,
    }).catch((err) => {
      console.log(`ERROR: ${err.message}`);
    })
  );

/*
 * 专题列表获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回一个专题信息json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getSpecialData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'specialData.json',
    '/workshop/get_special_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );
/*
 * 推荐列表获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回一个推荐信息json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getRecommendData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'recommendData.json',
    '/workshop/get_recommend_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );
/*
 * 人气列表获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getHotListData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'hotListData.json',
    '/workshop/get_hot_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );
/*
 * 最新列表获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getLastestListData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'lastestListData.json',
    '/workshop/get_latest_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );
/*
 * 模板获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getTemplateData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'templateData.json',
    '/workshop/get_template_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );
/*
 * 喜欢列表获取接口
 * 参数:
 * uin, time, s2t, sign详细询问贵军
 * page, pageSize目前均填0
 * 返回值:
 * 成功: 返回json对象
 * 失败: 返回undefined, 当且仅当本地缓存为空以及网络请求失败的情况
 */
const getLikeData = async (uin, time, s2t, sign, page, pageSize) =>
  await _getListData(
    'likeListData.json',
    '/workshop/get_like_list',
    uin,
    time,
    s2t,
    sign,
    page,
    pageSize
  );

// 初始化CommonCache Path
initCommonCachePath();

export {
  getSpecialData,
  getRecommendData,
  getHotListData,
  getLastestListData,
  getTemplateData,
  getLikeData,
};
