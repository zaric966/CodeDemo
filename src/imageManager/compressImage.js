/*
 * @Author: maoguijun
 * @Date: 2020-07-22 19:35:49
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-06-08 20:14:15
 * @FilePath: \minicode_app_rn\src\imageManager\compressImage.js
 */
const tinify = require('tinify');
const fs = require('fs');
const path = require('path');
const rootPath = process.cwd();
const imageDirPath = path.resolve(rootPath, './src/resource/images/');
const { default: Axios } = require('axios');

const short = require('short-uuid');
const { get } = require('lodash');

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
    if (!/.(jpg|png)$/.test(key)) {
      return;
    }
    tinify.fromFile(keyPath).toFile(keyPath);
  });
};

const compressImage = async () => {
  tinify.key = 'ldQ07PpC95Qq0m74bzwY2dsvWFq9V1H9';
  tinify.proxy = 'http://127.0.0.1:1080';

  // // 生成邮箱
  // const mailResult = await Axios.get('https://10minutemail.com/session/address').catch(err => {
  //   console.log(57, err)
  // })

  // console.log(58, mailResult)
  // const email = get(mailResult, ['data', 'address'])

  // 压缩
  getImageData([]);
};

compressImage();
