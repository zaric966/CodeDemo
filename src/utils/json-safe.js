/*
 * @Author: maoguijun
 * @Date: 2020-06-16 19:16:43
 * @LastEditors: maoguijun
 * @LastEditTime: 2020-06-17 20:00:53
 * @FilePath: \minicodeAppRn1.2\src\utils\json-safe.js
 */

const JSON_SAFE = {
  parse: (s) => {
    let o = null;
    try {
      o = JSON.parse(s);
    } catch (ignore) {}
    return o;
  },
  stringify: (o) => {
    let s = '';
    try {
      s = JSON.stringify(o);
    } catch (ignore) {}
    return s;
  },
};

export default JSON_SAFE;
