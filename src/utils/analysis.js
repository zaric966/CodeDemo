/*
 * @Author: maoguijun
 * @Date: 2020-05-08 14:23:04
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2021-07-09 18:04:12
 * @FilePath: \minicode_app_rn\src\utils\analysis.js
 * @description  打点分析
 */
import { get } from 'lodash';
import md5 from 'md5';
import moment from 'moment';
import deviceInfo from 'react-native-device-info';
import { gameModes } from '../containers/game/model/data';
import { routePath } from '../routePath';
import globalData from './globalData';
import request from './request';
import screen from './screenInfo';
let env;

let CONTEXT;

const { deviceWidth, deviceHeight } = screen;

let uniqueId;
const getUniqueId = () => {
  if (uniqueId === undefined) {
    uniqueId = deviceInfo.getUniqueId();
  }
  return uniqueId;
};

const getEventId = () => `${Number(new Date())}${Math.floor(Math.random() * 1000)}`;

const startAppEventId = getEventId();

/**
 * 统计相关的配置数据
 *  pathname：当前所处在的路由组建，在src/containers/index.jsx中会修改此值
 */
export const configAnalysis = {
  // pathname: undefined,
};

/**
 *
 * @param {object} data
 */
const encode = (data) => {
  let result = '';
  if (!data) {
    return result;
  }

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== 'undefined' && value !== '') {
      result += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    }
  });

  return result;
};

/**
 *  大数据上报基本接口
 * @param {Object} params 除了基本上报数据之外的数据参数
 */
const baseAnalysis = (params) => {
  if (!env) {
    env = require('./env').default;
  }

  let eventId = getEventId();
  if (params.eventId) {
    eventId = params.eventId;
    delete params.eventId;
  }
  const local_id = getUniqueId();
  const sign = md5(`${eventId}g54dpk35xbne497w`);
  let uin = get(window, ['userInfo', 'uin']);
  // 手机品牌
  const deviceBrand = deviceInfo.getBrand();
  // 手机型号
  const deviceDeviceId = deviceInfo.getDeviceId();
  // 当uin为空的时候，设置为0
  uin = uin === undefined ? 0 : uin;
  const url = `${
    env.analysisUrl
  }&event_id=${eventId}&local_id=${local_id}&sign=${sign}&uin=${uin}${encode(params)}`;
  request({ url }).catch((e) => {});

  return eventId;
};

// ------------------------创意社区 start-----------------------

/**
 * 创意社区：进入打点
 */
export const minicodeCommunityEnter = () => {
  const type = 'minicode_originality_community_enter';
  const newParams = {
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区：离开打点(左上正常退出，主题、作品跳转到首页系统课，以上都算作离开创意社区)，包含时间内浏览的专题id数组（正常右上角返回退出除外）
 * @param {Object} params 非通用的统计数据
 *
 * <entry name=""duration"" type=""int""  desc=""停留时长，秒""/>
 * <entry name=""subjects"" type=""string"" desc=""本次浏览的专题id列表 id1,id2,id3"" />
 */
export const minicodeCommunitLeave = (params) => {
  const type = 'minicode_originality_community_leave';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区：浏览专题详情打点
 * @param {Object} params 非通用的统计数据
 * <entry name="subject" type="string" desc="本次浏览的专题id" />
 */
export const minicodeCommunitSpecialOpen = (params) => {
  const type = 'minicode_originality_community_subject_detail';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区：专题详情内跳转其他内容 系统课包id/作品id
 * @param {Object} params 非通用的统计数据
 * <entry name=""jump_subject"" type=""string"" desc=""专题id"" />
 * <entry name=""jump_type"" type=""string"" desc=""0 系统课包 1 作品"" />
 * <entry name=""jump_id"" type=""string"" desc=""目的地id，系统课包id或作品id"" />"
 */
export const minicodeCommunitSpecialJump = (params) => {
  const type = 'minicode_originality_community_subject_jump';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区选择作品tab
 */
export const minicodeCommunitEnterWorks = () => {
  const type = 'minicode_originality_works_enter';
  const newParams = {
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区进入作品详情
 * @param {*} params 非通用的统计数据
 * <entry name="wid" type="string" size="20" desc="作品id"/>
 */
export const minicodeCommunitEnterWorksDetail = (params) => {
  const type = 'minicode_originality_works_detail';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区作品详情离开
 * @param {*} params 非通用的统计数据
 * <entry name=""wid"" type=""string"" size=""20"" desc=""作品id""/>
 * <entry name=""leave_type"" type=""string""  desc=""0 左上角回退，1 跳转到系统课（未付费弹出vip），2 其他作品""/>
 * <entry name=""duration"" type=""int"" desc=""时长，秒""/>"
 */
export const minicodeCommunitEnterWorksDetailLeave = (params) => {
  const type = 'minicode_originality_works_detail_leave';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 创意社区作品详情操作
 * @param {*} params 非通用的统计数据
 * "<entry name=""wid"" type=""string"" desc=""作品id""/>
 * <entry name=""op"" type=""string"" desc=""0 体验， 1 改编，2 跳转到系统课， 3 点赞， 4 取消点赞， 5 跳转其他作品""/>
 * <entry name=""op_id"" type=""string"" desc=""op 1 表示改编后的作品id，2 跳转到系统课的课包id, 5 表示其他作品id, 0其他""/>
 * <entry name=""course_id"" type=""string"" desc=""如果是课包作业改编，则记录课包id，否则为0""/>"
 */
export const minicodeCommunitEnterWorksDetailOP = (params) => {
  const type = 'minicode_originality_works_op';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// ------------------------创意社区 end-----------------------

/**
 * 录播课：上报题目是否正确
 * @param {object} params 非通用的个信号数据
 */
export const minicodeQuestionAnswer = (params) => {
  const type = 'minicode_course_task_test';
  const stores = require('../stores').default;
  const state = stores.getState();
  const curCourse = get(state, ['curriculum', 'curCourse']);

  const newParams = {
    ...params,
    isbuy: Number(Boolean(!get(curCourse, 'isPurchased'))),
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 主题课程测练打点
 * @param {object} params 非通用的个信号数据
 */
export const minicodeThemeQuestionAnswer = (params) => {
  const type = 'minicode_syscourse_answer';
  // const stores = require('../stores').default;
  // const state = stores.getState();
  // const curCourse = get(state, ['curriculum', 'curCourse']);

  const newParams = {
    ...params,
    // isbuy: Number(Boolean(!get(curCourse, 'isPurchased'))),
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 答题分析点击上报
 * @param {*} params
 */
export const minicodeThemeQuestionAnswerAnalysisClick = (params) => {
  const type = 'minicode_syscourse_answer_analysis_click';

  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 工坊：标签切换。在工坊标签切换的时候发送，例如已经是“推荐”，再次点击是不发送的，只有发生变化才发送记录。
 * @param {object} params 非通用的统计数据
 */
export const minicodeGongfangSwitch = (params) => {
  const type = 'minicode_gongfang_switch';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 工坊：详情。工坊作品互动时记录，包括进入详情、点赞（多次点击只记录一次）、进入地图。
 * @param {object} params 非通用的统计数据
 */
export const minicodeGongfangWorksOp = (params) => {
  const type = 'minicode_gongfang_works_op';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 工坊：跳转课程购买页面。
 * @param {object} params 非通用的统计数据
 */
export const minicodeGongfangHomeworkCourse = (params) => {
  const type = 'minicode_gongfang_homework_link_course';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 工坊：banner。
 * @param {object} params 非通用的统计数据
 */
export const minicodeGongfangBanner = (params) => {
  const type = 'minicode_gongfang_banner';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 工坊：玩工坊作品的时长（进去一个时间戳，出来减）
 * @param {*} params 非通用的统计数据
 */
export const minicodeGongfangWorksDuration = (params) => {
  const type = 'minicode_gongfang_works_duration';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 新手指引
 * @param { object} params
 */
export const minicodeMobileRookie = (params) => {
  const type = 'minicode_mobile_rookie';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 在线时长
 * @param {object} params
 */
export const minicodeOnline = (params) => {
  const store = require('../stores').default;
  const rootState = store.getState();
  const currentGameMode = get(rootState, ['game', 'gameMode']);
  const currentParentKey = get(currentGameMode, 'parentKey');
  console.log('currentGameMode', currentGameMode);
  console.log('currentParentKey', currentParentKey);

  let scene = 0;
  if (currentParentKey === gameModes.creation.key) {
    scene = 1;
  } else if (currentParentKey === gameModes.workshop.key) {
    scene = 2;
  } else if (
    currentParentKey === gameModes.videoCoursePlay.key ||
    currentParentKey === gameModes.videoCoursePractice.key ||
    currentParentKey === gameModes.videoCourseMake.key
  ) {
    scene = 4;
  } else if (
    currentParentKey === gameModes.vipCoursePlay.key ||
    currentParentKey === gameModes.vipCoursePractice.key ||
    currentParentKey === gameModes.vipCourseMake.key
  ) {
    scene = 3;
  }
  const type = 'minicode_online';
  const newParams = {
    ...params,
    type,
    scene,
  };
  baseAnalysis(newParams);
};

/**
 * 登录机器信息
 * @param { object} params
 */

let minicodeMachineLogin_eventId = '';
export const minicodeMachineLogin = (params) => {
  minicodeMachineLogin_eventId = getEventId();
  const type = 'minicode_machine_login';
  const systemVersion =
    deviceInfo.getSystemName() + '_' + deviceInfo.getBrand() + '_' + deviceInfo.getSystemVersion();
  const newParams = {
    ...params,
    opsys: systemVersion,
    screen: `${Math.floor(deviceWidth)},${Math.floor(deviceHeight)}`,
    type,
    eventId: minicodeMachineLogin_eventId,
  };
  let uinCur = get(window, ['userInfo', 'uin']);
  if (!uinCur) {
    // 当前uin还取不到， 做一个定时器晚点再打一个点
    const reAnalysis = () => {
      uinCur = get(window, ['userInfo', 'uin']);
      if (uinCur) {
        baseAnalysis(newParams);
      } else {
        setTimeout(reAnalysis, 5 * 1000);
      }
    };
    setTimeout(reAnalysis, 5 * 1000);
  }
  baseAnalysis(newParams);
  window.startAppTime = Number(new Date());
  const run = () => {
    // const duration = Math.floor((new Date() - window.startAppTime) / 1000);
    minicodeOnline({ duration: 300, eventId: minicodeMachineLogin_eventId });
    setTimeout(run, 5 * 60 * 1000);
    const now = moment();

    // 每天零点自动登录一边，方便后端记录哪一天登录了
    if (now.hour() === 0 && now.minute() < 5) {
      const stores = require('../stores').default;
      const logined = get(stores, ['dispatch', 'login', 'logined']);
      logined({ uin: Number(get(window.userInfo, 'uin')) });
    }
  };
  setTimeout(run, 5 * 60 * 1000);
};

/**
 *  登陆页面事件ID（event_id） minicode_login_result 和 minicode_mobile_login_enter 一样
 */
export const minicodeLoginEnterEvent = {
  eventId: 0,
  show_type: -1, // 2种界面，0 有迷你世界一键登录； 1没有
};
/**
 * 登录方式结果数据
 * @param {object} params
 */
export const minicodeLoginResult = (params) => {
  const type = 'minicode_login_result';
  const newParams = {
    ...params,
    type,
    eventId: minicodeLoginEnterEvent.eventId,
    show_type: minicodeLoginEnterEvent.show_type,
  };
  baseAnalysis(newParams);
};

/**
 * 进入登陆页打点
 * @param {object} params
 */
export const minicodeLoginEnter = (params) => {
  const type = 'minicode_mobile_login_enter';
  const newParams = {
    ...params,
    type,
    eventId: minicodeLoginEnterEvent.eventId,
    show_type: minicodeLoginEnterEvent.show_type,
  };
  baseAnalysis(newParams);
};

/**
 * 退出App的打点
 * @param {object} params
 */
export const minicodeLogout = (params) => {
  const type = 'minicode_logout';
  const newParams = {
    params,
    type,
    duration: Math.floor((new Date() - window.startAppTime) / 1000),
    eventId: minicodeMachineLogin_eventId,
  };
  baseAnalysis(newParams);
};

/********************************************* 1.2 **************************************** */

/**
 * 分享作品
 * @param {object} params
 *
 */
// export const minicodeMobileShare = (params) => {
//   const type = 'minicode_mobile_share';
//   const newParams = {
//     ...params,
//     type,
//   };
//   baseAnalysis(newParams);
// };

/**
 * 公告点击
 * @param {object} params
 *
 */
export const minicodeGonggaOp = (params) => {
  const type = 'minicode_gonggao_op';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 冒险页面按钮的点击
 * @param {object} params
 *
 */
export const minicodeMaoxianOp = (params) => {
  const type = 'minicode_maoxian_op';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 上传云端埋点
// export const minicodeUpload = (params) => {
//   const type = 'minicode_works_upload';
//   const newParams = {
//     ...params,
//     type,
//   };
//   baseAnalysis(newParams);
// };

// 新创建作品埋点
// export const minicodeCreate = (params) => {
//   const type = 'minicode_new_works';
//   const newParams = {
//     ...params,
//     type,
//   };
//   baseAnalysis(newParams);
// };

/*************************************录播课相关埋点***********************************************/
// 进入课时任务
export const minicodeCourseTaskLoading = (params) => {
  const type = 'minicode_course_task_loading';
  window.courseTaskStartTime = Number(new Date());
  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);
  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    task_type: get(currentTask, 'task_type'),
    task_idx: get(currentTask, 'taskIndex'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    course_type: get(currentTask, 'course_type'),
    is_new: window.isNewUser,
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 正常退出课时任务
export const minicodeCourseExit = (params) => {
  if (!CONTEXT) {
    CONTEXT = require('../mini-global/mwcommand-context');
  }
  const type = 'minicode_course_exit';
  const duration = Math.floor((new Date() - window.courseTaskStartTime) / 1000) || 0;

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  let mode = 0;
  if (![1, 4].includes(get(params, 'task_type'))) {
    mode = CONTEXT.miniWorldMode - 3;
  }
  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    task_type: get(currentTask, 'task_type'),
    task_idx: get(currentTask, 'taskIndex'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    map_mode: mode,
    ...params,
    duration,
    type,
  };
  baseAnalysis(newParams);
};

// 转换玩法的胜利/失败
export const minicodeCoursePlayResult = (params) => {
  const type = 'minicode_course_play_result';
  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    task_type: get(currentTask, 'task_type'),
    task_idx: get(currentTask, 'taskIndex'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 课时任务结束时上报
export const minicodeCourseTaskComplete = (params) => {
  const type = 'minicode_course_task_complete';
  const duration = Math.floor((new Date() - window.courseTaskStartTime) / 1000) || 0;

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'task_id', '0'),
    task_type: get(currentTask, 'task_type'),
    task_idx: get(currentTask, 'taskIndex'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    course_type: get(currentTask, 'course_type'),
    duration,
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 课包完成
export const minicodeCourseComplete = (params) => {
  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);
  const type = 'minicode_course_complete';
  const newParams = {
    course_id: get(currentTask, 'course_id'),
    course_type: get(currentTask, 'course_type'),
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 在闯关制作。课时作业中转玩法
export const minicodeCourseEnterPlay = () => {
  const type = 'minicode_course_enter_play';
  const stores = require('../stores').default;
  const state = stores.getState();

  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    task_type: get(currentTask, 'task_type'),
    type,
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
  };
  baseAnalysis(newParams);
};

// 提交作业
export const minicodeCourseSubmitHomework = (params) => {
  const type = 'minicode_course_submit_homework';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 闯关制作中查看提示
export const minicodeCoursePrompt = (params) => {
  const type = 'minicode_course_prompt';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 闯关制作中查看提示
export const minicodeCourseAnswer = () => {
  const type = 'minicode_course_answer';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['videoCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'course_id'),
    lesson_id: get(currentTask, 'lesson_id'),
    task_id: get(currentTask, 'task_id', '0'),
    isbuy: Number(Boolean(!get(currentTask, 'isPurchased'))),
    type,
  };
  baseAnalysis(newParams);
};

// 录播课指引
export const minicodeGuideGotoLearn = (params) => {
  const type = 'minicode_guide_gotoLearn';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

const getIsFirst = (() => {
  let a = 1;
  return () => {
    if (a) {
      return a--;
    }
    return 0;
  };
})();

// 首页主版块点击
export const minicodeGuideHomeButton = (params) => {
  const type = 'minicode_guide_homeButton';
  const newParams = {
    ...params,
    first: getIsFirst(),
    type,
  };
  baseAnalysis(newParams);
};

/********************************************************************************/

/**
 * 开源改编：作品点击事件
 * @param {*} params 非通用的统计数据
 */
export const minicodeAdaptedWorks = (params) => {
  const type = 'minicode_adapted_works';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
/********************************正价课转化打点************************************************/

/**
 * 查看课程详情，ios没有这个打点
 *
 * params = {
 *  course_id：string
 * }
 *
 */

export const minicodeCourseSeeDetails = (params) => {
  const type = 'minicode_course_see_details';
  const fromType = {
    [routePath.curriculumList]: 0,
    [routePath.workshopDetail]: 1,
    [routePath.home]: 2,
  };
  const lastPathName = get(window.nativeHistory, [
    'entries',
    get(window.nativeHistory, 'index') - 1,
    'pathname',
  ]);
  const pathname = get(lastPathName.match(/\/[A-Za-z]+\/?/), 0);
  let newFromType = get(fromType, pathname);
  if (pathname === routePath.home) {
    const from_type = get(window.nativeHistory, ['location', 'params', 'from_type']);
    newFromType = from_type === 1 ? '3' : '2';
  }
  const newParams = {
    ...params,
    from_type: newFromType,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 课程购买：立即支付
 * @param {*} params 非通用的统计数据
 */
export const minicodeCoursePay = (params) => {
  const type = 'minicode_course_pay';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/*
 * 课包详情点击“立即购买”，ios没有这个打点
 *
 * params = {
 *  course_id：string
 * }
 *
 */

export const minicodeCourseBuyNow = (params) => {
  const type = 'minicode_course_buy_now';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 课程购买：支付结果
 * @param {*} params 非通用的统计数据
 */
export const minicodeCoursePayRet = (params) => {
  const type = 'minicode_course_pay_ret';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/*
 * 课包详情点击“联系客服”，ios没有这个打点
 *
 * params = {
 *  course_id：string
 * }
 *
 */

export const minicodeCourseSeeTeacher = (params) => {
  const type = 'minicode_course_see_teacher';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/********************************2021 sprint 1************************************************/

/*
 * app 启动漏斗
 *
 * params = {
 *  course_id：string
 * }
 *
 */

export const minicodeMobileStart = (params) => {
  const type = 'minicode_mobile_start';
  const newParams = {
    ...params,
    eventId: startAppEventId,
    type,
  };
  baseAnalysis(newParams);
};

/****************************************2021 sprint 2*************************************** */
export const minicodeCourseFreeTrial = (params) => {
  const type = 'minicode_course_free_trial';
  const newParams = {
    ...params,
    eventId: startAppEventId,
    type,
  };
  baseAnalysis(newParams);
};

/****************************************2021 sprint 3*************************************** */

/**
 * 课包详情，滑动到底部
 * @param {*} params
 */
export const minicodeCourseSeeDetailsBottom = (params) => {
  const type = 'minicode_course_see_details_bottom';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 点击课包卡片
 * @param {*} params
 */
export const minicodeCourseEntryClick = (params) => {
  const type = 'minicode_course_entry_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 课时作业的点击“查看报告”
 * @param {*} params
 */
export const minicodeCourseReportClick = (params) => {
  const type = 'minicode_course_report_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
//
//点击“学习记录”
export const minicodeLearningRecordsClick = (params) => {
  const type = 'minicode_learning_records_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 课时作业的点击“查看报告”
 * @param {*} params
 */
export const minicodeCourseFillPhone = (params) => {
  const type = 'minicode_course_fill_phone';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//“我的学习记录”中点击“设置学习时间”
export const minicodeLearningRecordsTimeClick = (params) => {
  const type = 'minicode_learning_records_time_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 点击"试玩章节"
 * @param {*} params
 */
export const minicodeChapterFreeTrialClick = (params) => {
  const type = 'minicode_chapter_free_trial_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//“每次学习时长”开关变化设置，只有变化了才设置
export const minicodeLearningRecordsTimeSwitch = (params) => {
  const type = 'minicode_learning_records_time_switch';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 收费章节，点击锁和解锁章节弹出订单页
 * @param {*} params
 */
export const minicodeChapterUnblockingClick = (params) => {
  const type = 'minicode_chapter_unblocking_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//修改学习时间
export const minicodeLearningRecordsTimeChange = (params) => {
  const type = 'minicode_learning_records_time_change';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/****************************************2021 sprint 4*************************************** */

// 进入关卡
export const minicodeChapterLevelEntryClick = (params) => {
  const type = 'minicode_chapter_level_entry_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
// 7天学习计划中任务点击“立即前往”
export const minicodeWelfareEntryClick = (params) => {
  const type = 'minicode_welfare_entry_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 成功装载关卡（loading的遮罩消失）
export const minicodeChapterLevelMapLoadingSuccess = (params) => {
  const type = 'minicode_chapter_level_map_loading_success';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 完成7天学习计划中的一个任务
export const minicodeWelfarePartTaskComplete = (params) => {
  const type = 'minicode_welfare_part_task_complete';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//章节闯关结果
export const minicodeChapterLevelPass = (params) => {
  const type = 'minicode_chapter_level_pass';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
// 进入课时列表
export const minicodeCourseLessonList = (params) => {
  const type = 'minicode_course_lesson_list';

  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 课时列表点击“查看详情”
export const minicodeCourseSeeDetailsClick = (params) => {
  const type = 'minicode_course_see_details_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//作品管理里点击“进入地图”
export const minicodeWorksEntry = (params) => {
  const type = 'minicode_works_entry';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 打点时机是获得uin进入首页
export const minicodeAccLogin = (params) => {
  const type = 'minicode_acc_login';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 打点时机是【绑定公众号领皮肤】点击
export const minicodeGongzhongSkin = (params) => {
  const type = 'minicode_gongzhong_skin_get';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 打点时机是【绑定公众号领皮肤】点击
export const minicodeGongzhongWXOpen = (params) => {
  const type = 'minicode_gongzhong_skin_weixin';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/***
 * 7天学习计划某天任务完成 minicode_welfare_task_complete
 * <entry name="task_idx" type="string" size="2" desc="第几天"/>
 */
export const minicodeWelfareTaskComplete = (params) => {
  const type = 'minicode_welfare_task_complete';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/**
 * 7天学习记录点击
 */
export const miniCodeWelfareRecord = (params) => {
  const type = 'minicode_welfare_record';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

/****************************************2021 sprint 7*************************************** */
//首页打点
//用户每日第一次登录运营页自动弹出
export const minicodeOperationPageShow = (params) => {
  const type = 'minicode_operation_page_show';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
//运营位视频点击立即前往
export const minicodeOperationVedioGoClick = (params) => {
  const type = 'minicode_operation_vedio_go_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//运营页自动弹出后用户点击
export const minicodeOperationPageShowClick = (params) => {
  const type = 'minicode_operation_page_show_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 运营页用户主动点击
export const minicodeOperationPageClick = (params) => {
  const type = 'minicode_operation_page_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//点击CPA按钮
export const minicodeCpaClick = (params) => {
  const type = 'minicode_cpa_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//cpa提交作业
export const minicodeCpaAppAnswerCommit = (params) => {
  const type = 'minicode_cpa_app_answer_commit';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 创意社区进入我的创作
export const minicodeOriginalityCreateEnter = (params) => {
  const type = 'minicode_originality_create_enter';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
//新建本地作品
export const minicodeCreate = (params) => {
  const type = 'minicode_new_works';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
//作品上传云端
export const minicodeUpload = (params) => {
  const type = 'minicode_works_upload';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
//发布作品点击更换封面
export const minicodeMobileShareCover = (params) => {
  const type = 'minicode_mobile_share_cover';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//发布作品点击下一步
export const minicodeMobileShareNext = (params) => {
  const type = 'minicode_mobile_share_next';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//发布作品点击
export const minicodeMobileShareClick = (params) => {
  const type = 'minicode_mobile_share_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

//发布作品到社区或迷你世界
export const minicodeMobileShare = (params) => {
  const type = 'minicode_mobile_share';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 系统课

//系统课课时任务加载
export const minicodeSyscourseTaskLoading = (params) => {
  const type = 'minicode_syscourse_task_loading';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);
  const now = moment();
  const course_start_diffday = now.diff(moment(get(currentTask, 'themeBeginAt')), 'days') || 0;

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    course_start_diffday,
    first: Number(!get(currentTask, 'isComplete')),
    ...params,
    type,
  };

  const eventId = baseAnalysis(newParams);

  globalData.setData('minicodeSyscourseTaskLoading_eventId', eventId);
  globalData.setData('minicodeSyscourseTaskLoading_time', +new Date());
};

// 系统课课时任务结束
export const minicodeSyscourseTaskComplete = (params) => {
  const type = 'minicode_syscourse_task_complete';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const startTime = globalData.getData('minicodeSyscourseTaskLoading_time');
  const duration = Math.floor((+new Date() - startTime) / 1000);

  const eventId = globalData.getData('minicodeSyscourseTaskLoading_eventId');

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    duration,
    vip: Number(Boolean(get(window.userInfo, ['vipInfo', 'isVip']))),
    first: Number(!get(currentTask, 'isComplete')),
    eventId,
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 课时完成
export const minicodeSyscourseLessonComplete = (params) => {
  const type = 'minicode_syscourse_lesson_complete';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    first: Number(!get(currentTask, 'lessonDone')),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 课包完成
export const minicodeSyscourseComplete = (params) => {
  const type = 'minicode_syscourse_complete';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    first: Number(!get(currentTask, 'lessonDone')),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 作业上传
export const minicodeSyscourseWorkUpload = (params) => {
  const type = 'minicode_syscourse_work_upload';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 系统课任务目标弹窗关闭
export const minicodeSyscourseTaskobjClose = (params) => {
  const type = 'minicode_syscourse_taskobj_close';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 系统课任务点击开始按钮
export const minicodeSyscourseTaskRunClick = (params) => {
  const type = 'minicode_syscourse_task_run_click';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 系统课任务查看提示弹出
export const minicodeSyscourseTaskTips = (params) => {
  const type = 'minicode_syscourse_task_tips';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    ...params,
    type,
  };

  const eventId = baseAnalysis(newParams);

  globalData.setData('minicodeSyscourseTaskTips_eventId', eventId);
};

// 系统课任务查看提示点击
export const minicodeSyscourseTaskTipsClick = (params) => {
  const type = 'minicode_syscourse_task_tips_click';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    eventId: globalData.getData('minicodeSyscourseTaskTips_eventId'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 系统课任务胜利弹窗选择
export const minicodeSyscourseTaskWinSelect = (params) => {
  const type = 'minicode_syscourse_task_win_select';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    ...params,
    type,
  };

  const eventId = baseAnalysis(newParams);

  globalData.setData('minicodeSyscourseTaskWinSelect_eventId', eventId);
};

// 系统课任务场景中点击下一关
export const minicodeSyscourseTaskNextClick = (params) => {
  const type = 'minicode_syscourse_task_next_click';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    eventId: globalData.getData('minicodeSyscourseTaskWinSelect_eventId'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 系统课提交作业确认点击
export const minicodeSyscourseWorkCommit = (params) => {
  const type = 'minicode_syscourse_work_commit';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    task_id: get(currentTask, 'taskId', 0),
    task_idx: get(currentTask, 'taskIndex'),
    task_type: get(currentTask, 'taskType'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// 课时完成后点击查看报告
export const minicodeSyscourseReportSee = (params) => {
  const type = 'minicode_syscourse_report_see';

  const stores = require('../stores').default;
  const state = stores.getState();
  const currentTask = get(state, ['vipCourse', 'currentTask']);

  const newParams = {
    course_id: get(currentTask, 'courseId'),
    course_idx: get(currentTask, 'courseIndex'),
    lesson_id: get(currentTask, 'lessonId'),
    lesson_idx: get(currentTask, 'lessonIndex'),
    ...params,
    type,
  };

  baseAnalysis(newParams);
};

// webView发过来的打点数据
export const minicodeWebViewAnalysis = (params) => {
  baseAnalysis(params);
};

//
// 课程报告页面的查看报告按钮点击
export const minicodeSyscourseReportClick = (params) => {
  const type = 'minicode_syscourse_report_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 首页课程报告点击
export const minicodeSyscourseReportFirstpageClick = (params) => {
  const type = 'minicode_syscourse_report_firstpage_click';
  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};

// 消息中心打点
export const minicodeMessageClick = (params) => {
  const type = 'minicode_message_click';
};

//会员加微信首次完成付费课点击添加
export const minicodeVipSyscourseWeixin = (params) => {
  const type = 'minicode_vip_syscourse_weixin';

  const newParams = {
    ...params,
    type,
  };
  baseAnalysis(newParams);
};
