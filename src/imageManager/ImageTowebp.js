/*
 * @Author: maoguijun
 * @Date: 2021-07-01 10:22:58
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-07-10 14:31:16
 * @FilePath: \minicode_app_rn\src\imageManager\ImageTowebp.js
 */

const tinify = require('tinify');
const fs = require('fs');
const path = require('path');
const rootPath = process.cwd();
const imageDirPath = path.resolve(rootPath, './src/resource/images/');
const { default: Axios } = require('axios');
const webp = require('webp-converter');

// 不用转的文件
const whiteList = [
  'bg1@2x.png',
  'bg2@2x.png',
  'bg3@2x.png',
  'bg4@2x.png',
  'content_2x',
  'bannerr',
  'creativeCommunityBg@2x',
  'placeholder@2x',
];

/**
 * 判断某个path对应是不是文件夹
 * @param {string} path
 * @returns {boolean}
 */
const isDirectory = (path) => {
  const stats = fs.lstatSync(path);
  return stats.isDirectory();
};

const getImageData = async (steps) => {
  const currentPath = path.resolve(imageDirPath, './' + steps.join('/'));
  const dirs = fs.readdirSync(currentPath);
  dirs.forEach(async (key) => {
    const keyPath = path.resolve(currentPath, `./${key}`);
    const newSteps = [...steps, key];
    if (isDirectory(keyPath)) {
      // 文件夹
      getImageData(newSteps);
      return;
    }
    // 文件
    // 判断是否是jpg、png
    const reg = /.(jpg|png)$/gi;
    if (!reg.test(key)) {
      return;
    }
    // 白名单 不转换
    if (whiteList.find((item) => keyPath.includes(item))) {
      return;
    }
    const newKeyPath = keyPath.replace(reg, '');
    webp
      .cwebp(keyPath, `${newKeyPath}.webp`, '-q 95', (logging = '-v'))
      .then((e) => {
        console.log('toWebp success:', keyPath);
        fs.rmdirSync(keyPath, { recursive: true, force: true });
      })
      .catch((err) => {
        console.error(err);
      });
  });
};

const compressImage = async () => {
  // 其他类型转webp
  getImageData([]);
};

compressImage();
