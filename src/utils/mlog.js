/*
 * @Author: maoguijun
 * @Date: 2021-07-08 21:34:10
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-09 15:55:44
 * @FilePath: \minicode_app_rn\src\utils\mlog.js
 */
import NetworkInterface from './networkInf';
import commands from '../mini-global/commands';
import MWContext from '../mini-global/mwcommand-context';
import { get} from 'lodash';

const mlog = {
  // 日志反馈接口
  // 参数 uin time s2t sign
  // 返回值：Promise<downloadUrl/undefined>
  app_log_upload: async (uin, time, s2t, sign) => {
    let ret;
    return NetworkInterface.getObsUploadUrl('resource', 'zip', uin, time, s2t, sign)
      .then((urls) => {
        ret = get(urls, 'downloadUrl');
        return get(urls, 'uploadUrl');
      })
      .then((url) => commands.app_log_upload(url))
      .then(() => ret)
      .catch((err) => {
        console.log('1311 app_log_upload failed, ', err);
        return undefined;
      });
  },

  // 交互开始
  app_log_act_start: (module_name, message) => commands.app_log_act_start(module_name, message),

  // 交互结束
  app_log_act_end: async (module_name, message, ret, delay_warn = 1500) => {
    return commands
      .app_log_act_end(module_name, message, ret, delay_warn)
      .then((param) => {
        const isDelay = param[0];
        if (isDelay === 1) {
          const useTime = param[1];
          mlog.mlogUploadPhp(
            `UI Timeout Warning,moduleName=${module_name},useTime=${useTime},ret=${ret},message=${message}`
          );
        }
      })
      .catch((err) => {
        console.log('1338 app_log_act_end, ', err);
        return err;
      });
  },

  // info级别日志
  app_log_info: (module_name, message) => {
    // console.log(module_name, message);
    commands.app_log_info(module_name, message);
  },

  // error级别日志
  app_log_err: (module_name, message) => {
    // console.warn(module_name, message);
    mlog.mlogUploadPhp(`app_log_err,moduleName=${module_name},message=${message}`);
    return commands.app_log_err(module_name, message).catch((err) => err);
  },

  mlogUploadPhp: (msg) =>
    MWContext.jsonErrAnalysis({
      type: 'minicode_mobile_app_log',
      msg,
    }),
};

export default mlog;
