/*
 * @Author: maoguijun
 * @Date: 2020-02-21 16:12:33
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-03-16 16:23:51
 * @FilePath: \minicode_app_rn\src\utils\format.js
 */

import { isString, isNumber } from 'lodash';

/**
 * 格式化手机号码
 * @param {string} text
 * @returns {string}
 */
export const formatPhone = (text) => {
  if (!isString(text)) {
    return;
  }
  const reg = /^(\d{0,3})(\d{0,4})(\d{0,4})$/gi;
  return text.replace(/[^\d]/gi, '').replace(reg, '$1 $2 $3').trim();
};

/**
 *
 * @param {string} text
 */
export const testPhone = (text) => {
  if (!isString(text)) {
    return false;
  }
  text = text.replace(/\s/gi, '');
  const reg = /^[1]([3-9])[0-9]{9}$/;
  return reg.test(text);
};

/**
 * 格式化纯数字
 * @param {string|number} text
 * @returns {string}
 */
export const formatNumber = (text) => {
  if (isNumber(text)) {
    text = String(text);
  }
  if (!isString(text)) {
    return '0';
  }
  const reg = /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,3})$/gi;
  return text.replace(/[^\d]/gi, '').replace(reg, '$1 $2 $3 $4').trim();
};

/**
 *
 * @param {string} text
 */
export const testUin = (text) => {
  if (!isString(text)) {
    return false;
  }
  text = text.replace(/\s/gi, '');
  const reg = /\d{4,10}$/;
  return reg.test(text);
};

/**
 * 从 键值对 转换成 数组
 * @param {Object} obj
 */
export const formatKeyValueToArray = (obj) => {
  if (!Object[Symbol.hasInstance](obj)) {
    return [];
  }
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    obj[key]._id = key;
  });
  return Object.values(obj);
};
