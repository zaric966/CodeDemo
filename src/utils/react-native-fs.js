/*
 * @Author: maoguijun
 * @Date: 2020-03-27 10:19:28
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-01-19 14:22:47
 * @FilePath: \minicode_app_rn\src\utils\react-native-fs.js
 */
// import { Toast } from '@ant-design/react-native';
import { PermissionsAndroid } from 'react-native';
import RNF from 'react-native-fs';

import { requesPermission } from './androidPermission';

class RNFS {
  constructor() {
    return Object.assign({}, RNF, this);
  }

  /**
   * android 外部存储的根路径。需要在外部存储时先加上这个路径。
   */
  externalRoot = '/miniCode';

  /**
   * 读取文件内容， 覆盖默认的
   *
   * @memberof RNFS
   */
  readFile = async (filepath, encoding = 'utf8') => {
    if (filepath.includes(RNF.ExternalStorageDirectoryPath)) {
      const result = await requesPermission(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      if (!result) {
        // Toast.info('请先同意权限申请', Toast.SHORT, undefined, false);
        return;
      }
    }
    const file = await RNF.exists(filepath).catch(() => false);
    if (!file) {
      return false;
    }

    return await RNF.readFile(filepath, encoding);
  };

  /**
   * 写文件， 默认的是部分覆盖，改为整体覆盖
   *
   * @memberof RNFS
   */
  writeFile = async (filepath, content, encoding = 'utf8') => {
    if (filepath.includes(RNF.ExternalStorageDirectoryPath)) {
      console.warn('writeFile 申请存储权限');
      const result = await requesPermission(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      console.log('申请结果', result);
      if (!result) {
        // Toast.info('请先同意权限申请', Toast.SHORT, undefined, false);
        return;
      }
    }
    return await RNF.writeFile(filepath, content, encoding);
  };

  /**
   * 删除文件
   *
   * @memberof RNFS
   */
  unlink = async (filepath) => {
    if (!filepath) {
      console.info('unlink filepath 不能为空');
      return;
    }
    const file = await RNF.exists(filepath).catch(() => false);
    if (!file) {
      return;
    }
    return await RNF.unlink(filepath);
  };
}

export default new RNFS();
