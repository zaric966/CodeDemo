/*
 * @Author: maoguijun
 * @Date: 2020-06-16 19:16:43
 * @LastEditors: maoguijun
 * @LastEditTime: 2020-06-17 20:03:11
 * @FilePath: \minicodeAppRn1.2\src\utils\crypto-xor.js
 */

import Base64 from './base64';

/**
 * @description 字符串异或加密，并做base64转码
 * 异或加密即对当前字符串每位与当前约定的key的每位进行异或操作，求出结果
 * charCodeAt: 返回当前字符的Unicode 编码
 * 异或：两个值相同返回1，两个值不同，返回0
 * @param {String} val 需要加密的文字
 * @param { Boolean } isBase64 是否经过base64处理，默认true
 */
export const XORencryption = (val, isBase64 = true) => {
  if (typeof val !== 'string') {
    return val;
  }
  let key = 'k1k2frCETI8bkyLzW25KVZ5ZAjaKrtzbnBlpYCob+IsHBPe/N6g7Vw==';
  let message = '';
  for (var i = 0; i < val.length; i++) {
    message += String.fromCharCode(val.charCodeAt(i) ^ key.charCodeAt(i));
  }
  if (isBase64) {
    return Base64.btoa(message);
  }
  return message;
};

/**
 * @description 解密异或加密的密文
 * @param { String } val  密文
 * @param { Boolean } isBase64 是否经过了base64处理，默认true
 */
export const decodeXOR = (val, isBase64 = true) => {
  if (typeof val !== 'string') {
    return val;
  }
  let XORmsg = isBase64 ? Base64.atob(val) : val;
  let key = 'k1k2frCETI8bkyLzW25KVZ5ZAjaKrtzbnBlpYCob+IsHBPe/N6g7Vw==';
  let message = '';
  for (var i = 0; i < XORmsg.length; i++) {
    message += String.fromCharCode(XORmsg.charCodeAt(i) ^ key.charCodeAt(i));
  }
  return message;
};
