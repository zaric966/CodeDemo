/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/*
 * @Author: maoguijun
 * @Date: 2020-03-20 18:30:03
 * @LastEditors: qiuwen
 * @LastEditTime: 2021-04-26 16:07:15
 * @FilePath: \minicode_app_rn\src\utils\curriculum-update-cache.js
 * 章节数据缓存包含文件缓存
 */
import { get, isArray } from 'lodash';
import Config from 'react-native-config';

import env from './env';
import JSONSAFE from './json-safe';
import config from './liveServer/config';
import RNFS from './react-native-fs';
import request from './request';

const { path } = config;

const getCurriculumDiffVersion = (target, local = []) => {
  if (!isArray(target) || !isArray(local)) {
    return;
  }
  const restLocal = [];
  const deleteLocal = [];
  // 同步服务器的删除的数据
  local = local.filter((item) => {
    const f = target.find((l) => get(l, 'course_id') === get(item, 'course_id'));
    if (f) {
      return true;
    }
    deleteLocal.push(item);
    return false;
  });
  target = target.filter((item) => {
    const f = local.find(
      (l) =>
        get(l, 'course_id') === get(item, 'course_id') && get(l, 'version') === get(item, 'version')
      // &&
      // //未购买的课包需要再一次请求课包详情才能知道是否购买
      // purchased_courses.includes(get(item, 'course_id')) &&
      // get(item, 'lessons')
    );
    if (f) {
      restLocal.push(f);
    }
    return Boolean(!f);
  });
  return {
    target,
    restLocal,
    deleteLocal,
  };
};

const getAllCurriculumVersion = async ({ purchased_courses, ...paramsData }, curriclumnData) => {
  const result = await request({
    method: 'get',
    url: `${env.serverUrl}/course/course_profile_list`,
    params: {
      ...paramsData,
    },
    headers: {
      'x-minicode-version': Config.VERSION_NAME,
    },
    timeout: 10000,
  }).catch(() => {
    //
  });
  let curriculumVersions = get(result, ['data', 'data', 'course_profile']);

  // 刚开始进入编程页面还没有写完课包相关的数据，所以先设置课包信息
  // if (coursesListWithUser.length === 0) {
  //   setCoursesListWithUser(curriculumVersions);
  // }
  if (!curriculumVersions && !isArray(curriculumVersions)) {
    return false;
  }

  curriculumVersions = getCurriculumDiffVersion(curriculumVersions, curriclumnData);
  const curriculums = get(curriculumVersions, 'target');
  const restCurriculums = get(curriculumVersions, 'restLocal');
  const deleteCurriculums = get(curriculumVersions, 'deleteLocal');
  // 如果返回的是空或者空字符串则不更新
  if (!isArray(curriculums) || !curriculums.length) {
    const newCurriculum = restCurriculums;
    // 更新后台已删除的数据
    if (deleteCurriculums) {
      window.originCurrilculmList = newCurriculum;
      // 存储数据
      await RNFS.writeFile(
        `${path}/chaptercache/curriculum/data.json`,
        JSONSAFE.stringify({ curriculum: newCurriculum })
      );
    }

    return false;
  }
  return {
    data: {
      curriculums,
    },
    restData: {
      restCurriculums,
    },
  };
};

/**
 *  更新课程数据
 */
export const updateCurriculumCache = async (params) => {
  let currculum;
  if (window.originCurrilculmList) {
    currculum = {
      curriculum: window.originCurrilculmList,
    };
  } else {
    // 判断文件夹是否存在，不在则新建一个文件夹
    const hasCurriculumDir = await RNFS.exists(`${path}/chaptercache/curriculum`);
    if (!hasCurriculumDir) {
      RNFS.mkdir(`${path}/chaptercache/curriculum`);
    }
    const currculumJson = await RNFS.readFile(`${path}/chaptercache/curriculum/data.json`).catch(
      () =>
        JSON.stringify({
          curriculum: [],
        })
    );
    currculum = JSONSAFE.parse(currculumJson);
  }

  // 如果没有东西，说明解析报错，则删除重置数据，重新更新
  const version = await getAllCurriculumVersion(params, get(currculum, 'curriculum'));
  // 没有version 就不需要更新
  if (!version) {
    window.originCurrilculmList = get(currculum, 'curriculum');
    return {
      curriculum: get(currculum, 'curriculum'),
    };
  }
  const result = await request({
    method: 'post',
    url: `${env.serverUrl}/course/course_list`,
    data: {
      course_ids: Object.assign([], get(version, ['data', 'curriculums'])).map((item) =>
        get(item, 'course_id')
      ),
      time: get(params, 'time'),
      s2t: get(params, 's2t'),
      sign: get(params, 'sign'),
      uin: get(params, 'uin').toString(),
    },
    headers: {
      'x-minicode-version': Config.VERSION_NAME,
    },
    timeout: 10000,
  });
  const curriculumsList = get(version, ['data', 'curriculums']);
  const restCurriculums = get(version, ['restData', 'restCurriculums']);

  const resultCurriculum = get(result, ['data', 'data', 'courses']);
  let newCurriculum = [];
  if (resultCurriculum.length > 0) {
    newCurriculum = Object.assign([], curriculumsList).map((item) => {
      const f = resultCurriculum.find((l) => get(l, 'course_id') === get(item, 'course_id'));
      return { ...f, ...item };
    });
  } else {
    newCurriculum = curriculumsList;
  }
  newCurriculum = Object.assign([], newCurriculum)
    .concat(restCurriculums)
    .filter(Boolean)
    .sort((a, b) => {
      if (get(b, 'sort_num') === get(a, 'sort_num')) {
        get(b, 'modify_time') - get(a, 'modify_time');
      } else {
        get(b, 'sort_num') - get(a, 'sort_num');
      }
    });
  window.originCurrilculmList = newCurriculum;
  // 存储数据
  RNFS.writeFile(
    `${path}/chaptercache/curriculum/data.json`,
    JSONSAFE.stringify({
      curriculum: newCurriculum,
    })
  );
  return {
    curriculum: newCurriculum,
  };
};
