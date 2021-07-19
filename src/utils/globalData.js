import { get, isArray, isFunction, set } from 'lodash';

/*
 * @Author: maoguijun
 * @Date: 2021-04-23 11:41:42
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-06-18 15:56:15
 * @FilePath: \minicode_app_rn\src\utils\globalData.js
 * @desc: 用来统一记录所有挂在全局的变量，方便查询
 */
class GlobalData {
  constructor() {}

  data = {
    // vip课程中，每个任务点击运行按钮的次数
    vipCourseRunTimes: 0,

    // 是否是第一次进入首页
    isFirstHome: false,

    // 录播课的目标视频链接
    vipCourseTaskUrl: '',

    // 录播课的目标音频链接
    vipCourseVoiceUrl: '',

    // 录播课的提示视频链接
    vipCourseClueUrl: '',

    // 录播课任务视频链接
    vipCourseHdVideo: '',
  };

  // listeners
  listeners = [];

  /**
   * 设置数据
   *
   * @param {*} name
   * @param {*} value
   * @memberof GlobalData
   */
  setData = (name, value) => {
    const path = ['data'].concat(name);
    set(this, path, value);
    this.emit();
  };

  /**
   * 取数据
   *
   * @param {*} name
   * @param {*} value
   * @memberof GlobalData
   */
  getData = (name) => {
    const path = ['data'].concat(name);
    return get(this, path);
  };

  /**
   * 添加事件监听
   *
   * @param {*} name
   * @param {*} callback
   * @memberof GlobalData
   */
  addListener = (callback) => {
    if (!isFunction(callback)) {
      return;
    }
    this.listeners.push(callback);
  };

  /**
   * 移除事件监听
   *
   * @param {*} name
   * @param {*} callback
   * @memberof GlobalData
   */
  removeListener = (callback) => {
    this.listeners = this.listeners.filter((fn) => {
      return fn !== callback;
    });
  };

  /**
   * 调用
   *
   * @memberof GlobalData
   */
  emit = () => {
    this.listeners.forEach((fn) => {
      fn.callback(this);
    });
  };
}

const globalData = new GlobalData();

export default globalData;
