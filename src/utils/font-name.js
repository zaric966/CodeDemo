/*
 * @Description:
 * 创建说明：
 * 1. 为 APK 瘦身过程中，发现 APK/assets/fonts/FZCuYuan-M03.ttf 字体过大:
 *    > 原文件 FZCuYuan-M03.ttf，大小为 9.3MB，字形数: 22024
 *    > 找来同款字体的另一版本 FZY4JW.ttf，只有3MB多
 *    因此决定更换，以节省 APK 空间和运行时内存。
 * 2. 更换过程中，发现多处引用字体文件名 'FZCuYuan-M03'。
 * 3. 为方便后续维护，故创建本 font-name.js 以实现 '一处修改，全局生效' 的便利。
 * @FilePath: \minicode_app_rn\src\utils\font-name.js
 * @Author: WangXiehua
 * @Date: 2020-08-20 18:43:08
 * @LastEditor: WangXiehua
 * @LastEditTime: 2021-06-22 18:17:20
 */

class FontFamily {
  /**
   * 设计稿上 FZLanTingYuanS-M-GB
   *  方正兰亭圆——准
   *  小标题/正文
   *
   * @memberof FontFamily
   */
  FZLANTY_ZHUNJW_GB1_0 = 'FZLANTY_ZHUNJW--GB1-0';

  /**
   * 设计稿上 Linotte-Heavy
   *
   * @memberof FontFamily
   */
  Linotte_Heavy = 'Linotte-Heavy';
}
const FontName = new FontFamily();

export default FontName;
