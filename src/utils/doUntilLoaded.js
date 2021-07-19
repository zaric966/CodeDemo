/*
 * @Author: maoguijun
 * @Date: 2020-04-07 17:18:53
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-03-30 14:48:10
 * @FilePath: \minicodeAppRn\src\utils\doUntilLoaded.js
 */
import { get, isFunction } from 'lodash';
import commands from '../mini-global/commands';

class DoUntilLoadedInfo {
  constructor() {
    this.intervalId = null;
    this.cbsPriority0 = [];
    this.cbs = [];
    this.getLoadingStatus = false;
    this.canCallCBDirectly = false;
  }

  pushCallBack = (callback, priority) => {
    const that = this;
    if (that.canCallCBDirectly) {
      if (isFunction(callback)) {
        callback();
      }
      return;
    }
    if (priority === 0) {
      that.cbsPriority0.push(callback);
    } else {
      that.cbs.push(callback);
    }
    if (that.intervalId == null) {
      that.intervalId = setInterval(async () => {
        if (that.getLoadingStatus || that.canCallCBDirectly) {
          return;
        }
        that.getLoadingStatus = true;
        const result = await commands.getLoadingStatus().catch(() => [-1]);
        that.getLoadingStatus = false;
        if (result) {
          const status = get(result, ['0']);
          if (status >= 1 && window.webloaded) {
            that.cbsPriority0.forEach((cb, index, cbs) => {
              if (isFunction(cb)) {
                cb();
              }
            });
            that.cbs.forEach((cb, index, cbs) => {
              if (isFunction(cb)) {
                cb();
              }
            });

            clearInterval(that.intervalId);
            that.intervalId = null;
            that.cbsPriority0.splice(0);
            that.cbs.splice(0);
            that.canCallCBDirectly = true;
          }
        }
      }, 1000);
    }
  };
}

const doUntilLoadedInfo = new DoUntilLoadedInfo();

export default (callback, priority = null) => {
  doUntilLoadedInfo.pushCallBack(callback, priority);
};
