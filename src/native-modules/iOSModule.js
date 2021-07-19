/**
 * iOSModule iOS平台独有的原生模块
 * -exitMiniCodeApp 退出iOS应用
 */
import { NativeModules } from 'react-native';
const { RNBridgeToiOSModule } = NativeModules;

export { RNBridgeToiOSModule as iOSmodules };
