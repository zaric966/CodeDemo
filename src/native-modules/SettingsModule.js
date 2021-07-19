/**
 * 系统界面交互相关
 * -availableWithUIImagePicker iOS 申请系统相册权限
 * -openImagePicker Android 打开系统相册选择界面
 */
import { NativeModules } from 'react-native';
const { SettingsModule } = NativeModules;

export default SettingsModule;
