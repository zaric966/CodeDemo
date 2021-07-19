/*
 * @Author: maoguijun
 * @Date: 2019-11-13 17:10:58
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-06-22 11:18:36
 * @FilePath: \minicode_app_rn\src\utils\request.js
 */
// import { Toast } from '@ant-design/react-native';
import Axios from 'axios';
import { get } from 'lodash';
import { Platform } from 'react-native';
import responseDataErrorCode from '../data/responseDataErrorCode';
import ConfigPlatform from 'react-native-config';
import env from './env';
import showToast from './showToast';

const request = Axios.create();
// Add a request interceptor
request.interceptors.request.use(
  (config) => {
    // Do something before request is sent
    let headers = get(config, ['headers']);
    headers = {
      ...headers,
      'x-minicode-version': ConfigPlatform.VERSION_NAME,
      'x-minicode-platform': Platform.OS === 'ios' ? 'iOS' : 'Android',
      'x-minicode-channel': env.CHANNE_ID,
    };
    config = { ...config, headers: headers };
    // log(JSON_SAFE.stringify(config));  先注释掉，没有限制条件的把所有请求写到文件里面不太合适
    return config;
  },
  (error) => {
    // Do something with request error
    console.warn('request.interceptors.request.use error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
request.interceptors.response.use(
  async (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data

    // console.log('response', response);
    const responseCode = get(response, ['data', 'code']);
    const responseRet = get(response, ['data', 'ret']);
    const url = get(response, ['config', 'url']);

    // 迷你世界相关的登录接口特殊的错误code...
    const codeMsg = responseDataErrorCode.newFrameworkCode[responseCode];
    if (codeMsg !== undefined) {
      showToast(codeMsg);
    }
    const retMsg = responseDataErrorCode.newFrameworkCode[responseRet];
    if (retMsg !== undefined) {
      showToast(retMsg);
    }

    // 没有特殊code带来的message，再来判断迷你编程常规接口的code是否小于0，小于0就直接弹🍞
    if (!codeMsg && !retMsg) {
      // 新的serverSiriusUrl 状态码是 'code'
      if (responseCode && responseCode < 0) {
        const msg = get(response, ['data', 'message']);
        showToast(msg);
      }
      // 旧的serverUrl 状态码是 'ret'
      if (responseRet && responseRet < 0) {
        const msg = get(response, ['data', 'msg']);
        showToast(msg);
      }
    }

    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    console.log('request.interceptors.response.use error:', error);
    return Promise.reject(error);
  }
);

/**
 * 请求网络接口，所有的网络请求都应该在外层调用catch住。
 */
export default (config) => {
  // 先判断网络
  if (window.netInfo && !get(window.netInfo, 'isConnected')) {
    return new Promise((resolve, reject) => {
      reject(new Error('无法连接网络'));
    });
  }
  // 后进行请求
  return request({
    timeout: 5000,
    validateStatus: (status) => status >= 200 && status < 300,
    ...config,
  });
};
