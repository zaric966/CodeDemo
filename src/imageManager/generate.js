/*
 * @Author: maoguijun
 * @Date: 2020-02-26 10:54:42
 * @LastEditors: maoguijun
 * @LastEditTime: 2021-06-24 10:51:36
 * @FilePath: \minicode_app_rn\src\imageManager\generate.js
 */
const fs = require('fs');
const path = require('path');
const mimeType = require('mime-types');
const rootPath = process.cwd();
const imageDirPath = path.resolve(rootPath, './src/resource/images');
const lodash = require('lodash');
const { setWith, isObject } = lodash;

// 最后返回的数据
const imagePathMap = {};
const imageNames = {};

/**
 * 判断某个path对应是不是文件夹
 * @param {string} path
 * @returns {boolean}
 */
const isDirectory = (path) => {
  const stats = fs.lstatSync(path);
  return stats.isDirectory();
};
/**
 * 生成图片数据
 * @param {array} steps
 */
const getImageData = (steps) => {
  const currentPath = path.resolve(imageDirPath, './' + steps.join('/'));
  const dirs = fs.readdirSync(currentPath);
  dirs.forEach((key) => {
    const keyPath = path.resolve(currentPath, `./${key}`);
    const newSteps = [...steps, key];
    if (isDirectory(keyPath)) {
      // 文件夹
      setWith(imagePathMap, newSteps, {});

      getImageData(newSteps);
      return;
    }
    // 文件
    // 判断是否是图片
    const imageReg = /.(jpg|png|svg|gif|webp)$/gi;
    if (!imageReg.test(key)) {
      return;
    }
    const reg = /(\_(2x|3x)|\@(2x|3x))/gi;
    let newKey;
    if (!reg.test(key)) {
      newKey = key.replace(imageReg, (s) => `@2x${s}`);
    } else {
      newKey = key.replace(reg, (s) => {
        const newS = s.replace(/(\_|\@)/, '@');
        return newS;
      });
    }

    fs.renameSync(
      path.join(__dirname, '../resource/images/', [...steps, key].join('/')),
      path.join(__dirname, '../resource/images/', [...steps, newKey].join('/'))
    );

    const name = key.replace(/.(jpg|png|svg|gif|webp)$/, '');

    const singleName = name.replace(reg, '');
    setWith(
      imagePathMap,
      [...steps, singleName],
      `require('../resource/images/${[...steps, newKey.replace(reg, '')].join('/')}')`
    );

    setWith(imageNames, [...steps, singleName].join('.'), [...steps, singleName], Object);
  });
};

/**
 * 需要处理的文件夹， 暂定是imageDirPath
 * @param {string} path
 */
const formatImage = (path) => {
  console.log('开始生成图片文件');
  getImageData([]);
  const data = JSON.stringify(imagePathMap);
  const newData = data.replace(/\"require\(/gi, 'require(').replace(/\)"/gi, ')');
  fs.writeFileSync(__dirname + '/imageData.js', `export default ${newData}`);
  fs.writeFileSync(__dirname + '/imageName.json', JSON.stringify(imageNames));
  console.log('图片文件已生成成功, ' + __dirname);
};
formatImage();
