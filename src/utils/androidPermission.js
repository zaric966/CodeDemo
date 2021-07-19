/*
 * @Author: maoguijun
 * @Date: 2021-01-06 10:24:01
 * @LastEditors: qiuwen
 * @LastEditTime: 2021-03-30 11:10:31
 * @FilePath: \minicode_app_rn\src\utils\androidPermission.js
 * @desc: android 设备上读写权限相关
 */
import { PermissionsAndroid, Platform } from 'react-native';

/**
 *  校验设备的读写权限
 */
export const checkPermission = async (permission) => {
  if (Platform.OS === 'ios') {
    return true;
  }
  // 返回Promise类型
  const granted = await PermissionsAndroid.check(permission);
  return granted;
};

/**
 * 申请设备的读写权限
 */
export const requesPermission = async (permission) => {
  if (await checkPermission(permission)) {
    return true;
  }
  const granted = await PermissionsAndroid.request(permission).catch(() => ({}));
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};
