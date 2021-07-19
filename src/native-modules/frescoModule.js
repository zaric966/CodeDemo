/**
 * Fresco 相关操作
 * -clearImageCacheFromMemory 清理Fresco框架下的内存中的数据
 * -prefetchImageToDiskCache(path) 预加载图片到磁盘
 */
import { NativeModules } from 'react-native';
const { FrescoHelpModule } = NativeModules;

export default FrescoHelpModule;
