import { get } from 'lodash';

import commands from '../mini-global/commands';
import JSON_SAFE from './json-safe';
import config from './liveServer/config';
import pathUtil from './path-util';
import RNFS from './react-native-fs';

const { path: serverRootPath } = config;

const isEmptyString = (s) => s === undefined || s === null || s === '';

const baseUrl = 'http://127.0.0.1:8080';

class ResourceCache {
  constructor() {
    this.downloadContext = { ...this.downloadContext };
  }

  cachePathOfUrl = async (urlString) => {
    const fileName = pathUtil.lastComponent(urlString);
    return `${serverRootPath}/cachefiles/${fileName}`;
  };

  cacheUrlOfUrl = async (urlString) => {
    const p = await this.cachePathOfUrl(urlString);
    const u = p.replace(serverRootPath, baseUrl);
    // console.log(`cacheUrl: ${u}`);
    return u;
  };

  createDirRecursion = async (path) => {
    // console.log('**************');
    const pathPart = path.split('/');
    // console.log(path);
    // console.log(pathPart);
    let curPath = '';
    for (let i = 0; i < pathPart.length; ++i) {
      const item = pathPart[i];
      if (!item) {
        continue;
      }
      curPath += `/${item}`;
      // console.log(curPath);
      if (!(await RNFS.exists(curPath))) {
        await RNFS.mkdir(curPath);
      }
    }
  };

  /*
   * 获取url对应的资源
   * paramters:
   * 		url: mini-pan 资源url
   * return:
   * 		Promise<{url, path}>, 返回该资源对应的本地http url，例如:http://127.0.0.1:8080/cache/image/xxx.png
   * 该函数首先检查本地有没有缓存, 有则直接返回, 否则下载后返回
   */
  getUrlRes = async (urlString) => {
    if (isEmptyString(urlString)) {
      return {};
    }
    const t = Number(new Date());
    const ret = await this._downloadCacheDo(urlString, 1);
    const catchPath = await this.cachePathOfUrl(urlString);
    if (ret) {
      return {
        url: `${ret}?t=${t}`,
        path: `${catchPath}`,
      };
    }
    return {
      url: `${urlString}`,
      path: undefined,
    };
  };

  /**
   * 文件的预下载
   *
   * @memberof ResourceCache
   */
  prevCacheFiles = async (urlString) => {
    return await this.getUrlRes(urlString);
  };

  /*
   * 获取工坊workshop url对应的资源
   * paramters:
   * 		url: mini-pan 资源url
   * return:
   * 		Promise<{url, path}>, 返回该资源对应的本地http url，例如:http://127.0.0.1:8080/cache/image/xxx.png
   * 该函数首先检查本地有没有缓存, 有则直接返回, 否则下载后返回
   */
  getWorkShopUrlRes = async (urlString) => await this.getUrlRes(urlString);

  /*
   * 删除一个url对应的缓存资源
   * paramters:
   * 		url: mini-pan 资源url
   * return:
   * 		Promise<{url, path}>, 返回该资源对应的本地http url，例如:http://127.0.0.1:8080/cache/image/xxx.png
   * 该函数首先检查本地有没有缓存, 有则直接返回, 否则下载后返回
   */
  delCachedRes = async (urlString) => {
    if (isEmptyString(urlString)) {
      return;
    }
    const cachePath = await this.cachePathOfUrl(urlString);
    const exist = await RNFS.exists(cachePath).catch(() => false);
    if (exist) {
      await RNFS.unlink(cachePath).catch(() => false);
    }
  };

  /*
   * 删除一个url对应的缓存资源
   * paramters:
   * 		url: mini-pan 资源url
   * return:
   * 		Promise<{url, path}>, 返回该资源对应的本地http url，例如:http://127.0.0.1:8080/cache/image/xxx.png
   * 该函数首先检查本地有没有缓存, 有则直接返回, 否则下载后返回
   */
  delCachedWorkShopUrlRes = async (urlString) => {
    if (isEmptyString(urlString)) {
      return;
    }
    const cachePath = await this.cachePathOfUrl(urlString);
    const exist = await RNFS.exists(cachePath).catch(() => false);
    if (exist) {
      await RNFS.unlink(cachePath).catch(() => false);
    }
  };

  /**
   * 停止所有预加载
   *
   * @memberof ResourceCache
   */
  downloadCleanAllTask = async () => {
    console.log('停止所有预加载');
    commands.downloadCleanAllTask();
  };

  /**
   * 提供优先级管理的预加载方法
   * @param {String} urlString 需要下载的资源url
   * @param {Number} prior 优先级 1 高  2 低  （低优先级一般是那些需要预加载的资源用的，不是马上就要使用的资源，只是先下载好以后会需要用。）
   * @param {Boolean} throwErr 是否抛出错误
   * @returns 返回 成功：本地静态服的url 如 http://127.0.0.1/xxxx.xx， 失败：返回原始的url
   */
  downloadCacheDo = async (urlString, prior, throwErr = false) => {
    let timeOutId;
    const pTimeout = new Promise((resolve, reject) => {
      timeOutId = setTimeout(() => {
        console.log('pyf test downloadCacheDo timeout', urlString);
        resolve([1, '', 999]);
      }, 3 * 60 * 1000); // 3分钟超时，防止外部的await越来越多。
    });
    const downRet = await Promise.race([commands.downloadCacheDo(urlString, prior), pTimeout]);
    clearTimeout(timeOutId);

    if (downRet[0] == 0) {
      // 成功
      // const fileName = downRet[1];
      const urlRet = await this.cacheUrlOfUrl(urlString);
      return urlRet;
    } else {
      // 记录一个服务器日志， 方便以后分析问题
      const MWContext = require('../mini-global/mwcommand-context');
      const fileName = downRet[1];
      const errCode = downRet[2];
      MWContext.jsonErrAnalysis({
        type: 'minicode_downloadCacheDo_error',
        errCode: `${errCode}`,
        urlString: urlString,
        prior: `${prior}`,
      });
      if (throwErr) {
        return Promise.reject();
      }
    }
    return urlString;
  };

  // 内部使用
  // url 资源的url
  // 优先级 1 高  2 低  （低优先级一般是那些需要预加载的资源用的，不是马上就要使用的资源，只是先下载好以后会需要用。）
  // 返回 本地静态服的url 如 http://127.0.0.1/xxxx.xx
  _downloadCacheDo = async (urlString, prior) => {
    const downRet = await commands.downloadCacheDo(urlString, prior);
    if (downRet[0] == 0) {
      // 成功
      // const fileName = downRet[1];
      const urlRet = await this.cacheUrlOfUrl(urlString);
      return urlRet;
    } else {
      // 记录一个服务器日志， 方便以后分析问题
      const MWContext = require('../mini-global/mwcommand-context');
      const fileName = downRet[1];
      const errCode = downRet[2];
      MWContext.jsonErrAnalysis({
        type: 'minicode_downloadCacheDo_error',
        errCode: `${errCode}`,
        urlString: urlString,
        prior: `${prior}`,
      });
    }
    return undefined;
  };

  // progressCB = (jobID, bytesWritten, totalSize) => {}
  // 上传小文件时，调用progressCB非常稳定，不应太依赖这个回调
  download = async (urlString, dest, progressCB) => {
    let s = {};
    try {
      s = RNFS.downloadFile({
        fromUrl: urlString,
        toFile: dest,
        progressDivider: 25, // 上报步数为25
        begin: (beginRes) => {
          this.downloadContext[beginRes.jobId] = {
            size: beginRes.contentLength,
            url: urlString,
            dest,
          };
        },
        progress: (progressRes) => {
          if (progressCB) {
            progressCB(progressRes.jobId, progressRes.bytesWritten, progressRes.contentLength);
          }
        },
      });
    } catch (error) {
      console.error(error);
    }

    // type DownloadResult = {
    //     jobId: number;          // The download job ID, required if one wishes to cancel the download. See `stopDownload`.
    //     statusCode: number;     // The HTTP status code
    //     bytesWritten: number;   // The number of bytes written to the file
    //   };

    const { jobId } = s;
    return s.promise
      .then(async (result) => {
        if (result.statusCode !== 200) {
          console.log('download result.statusCode !== 200', result.statusCode);
          // 尝试删除残留文件
          const destPath = get(this.downloadContext, [jobId, 'dest']);
          const destPathExist = await RNFS.exists(destPath).catch(() => false);
          if (destPathExist) {
            await RNFS.unlink(destPath).catch(() => false);
          }
          this.downloadContext[jobId] = null;
          return Promise.reject(-1);
        }
        if (get(this.downloadContext, [jobId, 'size']) > result.bytesWritten) {
          console.log('download file broken !!!!');
          try {
            await RNFS.unlink(get(this.downloadContext, [jobId, 'dest']));
          } catch (err) {
            console.log('download RNFS.unlink', err);
          }
          this.downloadContext[jobId] = null;
          return Promise.reject(-1);
        }
        this.downloadContext[jobId] = null;
        return Promise.resolve(jobId);
      })
      .catch(async (e) => {
        console.log('download error', e);
        // 尝试删除残留文件
        const destPath = get(this.downloadContext, [jobId, 'dest']);
        const destPathExist = await RNFS.exists(destPath).catch(() => false);
        if (destPathExist) {
          await RNFS.unlink(destPath).catch(() => false);
        }
        this.downloadContext[jobId] = null;
        return Promise.reject(-1);
      });
  };

  // 拷贝一个分享上传的mp4资源到缓存，之后如果要下载的话可以直接取到缓存的资源
  // localRelativePath mp4当前所在的目录 "/mobile_backup/206306525/7293060775133/minicodeRecord1.mp4"
  // downloadUrl 分享上传成功后服务器返回的mp4下载地址 "http://xuedownload.mini1.cn/share/mcode/test/729/3060/b91ae58c015c4ec3ce588417f9c1fc49.mp4"
  copyShareWorkMp4ToCache = async (localRelativePath, downloadUrl) => {
    const localSrcMp4Path = `${serverRootPath}/cache${localRelativePath}`;
    const localDesMp4Path = await this.cachePathOfUrl(downloadUrl);
    await RNFS.copyFile(localSrcMp4Path, localDesMp4Path);
  };

  /*
   * 下载云端作品接口
   * paramters:
   * 		mcodeInfo = {coverUrl, mcodeUrl, uin, mapId, time, name}
   *     progressCB = (jobId, bytesWritten, contentLength) => {...}
   *       progressCB paramters:
   *         jobId: 该下载任务ID,
   *         bytesWritten: 到目前为止下载了多少,
   *         contentLength: 下载文件的总长度,
   *  ---当bytesWritten===contentLength时下载完成-----
   * 返回值: 成功返回<res, coverPath>,
   * res为0成功，非0为不成功, coverPath为截图的本地相对静态资源路径的路径
   */
  downloadCloudMCode = async (mcodeInfo, progressCB) => {
    // 通用参数
    const coverUrl = get(mcodeInfo, 'coverUrl'); // 封面图url(以静态服务器url开头)
    const uin = get(mcodeInfo, 'uin'); // uin
    const mapId = get(mcodeInfo, 'mapId'); // 作品ID
    const name = get(mcodeInfo, 'name'); // 作品名称
    const ori_info = get(mcodeInfo, 'ori_info');
    const last_info = get(mcodeInfo, 'last_info');
    // 下载迷你编程才需要传的参数
    const mcodeUrl = get(mcodeInfo, 'mcodeUrl'); // 下载的mcode url
    // 下载迷你世界才需要传的参数
    const mwMapFlag = get(mcodeInfo, 'isMiniWorld') || false; // 当下载迷你世界需要设为true,否则不管即可
    const mwNode = get(mcodeInfo, 'node'); // 迷你世界列表参数的'node'参数
    const mwDir = get(mcodeInfo, 'dir'); // 迷你世界列表参数的'dir'参数
    const mwMd5 = get(mcodeInfo, 'md5'); // 迷你世界列表参数的'md5'参数
    const mwTaskID = get(mcodeInfo, 'mwTaskID'); // 传入progressCB的objID, 需要调用者自行管理,取值范围为[10000-20000]
    const mapUrls = get(mcodeInfo, 'mapUrls'); // 传入urls

    // 参数判断
    if (!(uin && mapId && name)) {
      console.log('downloadCloudMCode: parameters error');
      return { res: -1, coverPath: '' };
    }

    // if (mwMapFlag) {
    //   // 迷你世界参数判断
    //   if (!(mwNode && mwDir && mwMd5 && mapUrls)) {
    //     console.log('downloadCloudMCode: parameters error');
    //     return { res: -1, coverPath: '' };
    //   }
    // } else {
    //   // 迷你编程参数判断
    //   if (!(mcodeUrl)) {
    //     console.log('downloadCloudMCode: parameters error');
    //     return { res: -1, coverPath: '' };
    //   }
    // }

    // 更新前自动备份
    const destMCodePath = (await commands.getBackupMcodePath(uin, mapId))[0];
    if (await RNFS.exists(destMCodePath)) {
      await commands.createAutoLocalBackupCopy(uin, mapId);
    }

    // 拷贝截图
    let relativeFilePath = '';
    if (coverUrl) {
      const coverLocalPath1 = coverUrl.replace(baseUrl, serverRootPath);
      const extName = coverLocalPath1.substring(coverLocalPath1.lastIndexOf('.'));
      const coverSaveAsPath2 = `${serverRootPath}/cache/mobile_backup/${uin}/${mapId}`;
      relativeFilePath = `/mobile_backup/${uin}/${mapId}/thumb${extName}`;
      await this.createDirRecursion(coverSaveAsPath2);
      await RNFS.copyFile(coverLocalPath1, `${coverSaveAsPath2}/thumb${extName}`).catch((e) => {});
    }

    // 更新json
    const jsonPath = destMCodePath && destMCodePath.replace('.mcode', '.jmi');
    const existJson = await RNFS.exists(jsonPath);
    const jsonContent = (existJson && (await RNFS.readFile(jsonPath))) || '';
    const jsonData = JSON_SAFE.parse(jsonContent);
    const time = get(jsonData, 'time');
    const autoCopyNum = get(jsonData, 'autoCopyNum');
    const manualCopyNum = get(jsonData, 'manualCopyNum');
    const tutorialUrl = get(jsonData, 'tutorialUrl');
    console.log(JSON_SAFE.stringify(jsonData));
    const jmiContent = {
      ...jsonData,
      name,
      mapId,
      authorUin: uin,
      time: (time && String(time)) || String(Date.now()),
      updateTime: String(Date.now()),
      thumbPath: relativeFilePath,
      autoCopyNum: (autoCopyNum && String(autoCopyNum)) || '0',
      manualCopyNum: (manualCopyNum && String(manualCopyNum)) || '0',
      ori_info,
      last_info,
    };
    if (tutorialUrl) {
      jmiContent.tutorialUrl = tutorialUrl;
    }
    await RNFS.writeFile(jsonPath, JSON_SAFE.stringify(jmiContent));

    // 下载mcode
    if (!mwMapFlag) {
      return this.download(mcodeUrl, destMCodePath, progressCB || undefined)
        .then((jobId) => {
          progressCB(jobId, -100, -100); // 主动通知为100%
          return { res: 0, coverPath: `${relativeFilePath}` };
        })
        .catch((err) => ({ res: -1, coverPath: '' }));
    }
    return commands
      .downloadFileReq(
        `${mapUrls.replace('%d', mwNode)}${mwNode}/${mwDir}/${mwMd5}`,
        destMCodePath,
        60
      ) // 该接口第三个参数为超时秒数
      .then((ret) => {
        console.log(
          '281',
          ret,
          destMCodePath,
          `${mapUrls.replace('%d', mwNode)}${mwNode}/${mwDir}/${mwMd5}`
        );
        if (ret != 0) {
          console.log('291 ret = ', ret);
          throw 'Download Failed.';
        }
        progressCB(mwTaskID, -100, -100); // 主动通知为100%
        return { res: 0, coverPath: `${relativeFilePath}` };
      })
      .catch((err) => ({ res: -1, coverPath: '' }));
  };
}

export default new ResourceCache();
