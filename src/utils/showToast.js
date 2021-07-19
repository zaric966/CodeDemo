import Toast from 'react-native-root-toast';

/**
 * 显示吐司
 * @param {String} message 显示的吐司内容文本
 * @param {Object} toastOptions 可选参数对象
 */
const showToast = (message, toastOptions) => {
  if (toastOptions) {
    toastOptions.position = Toast.positions.CENTER;
  } else {
    toastOptions = {
      position: Toast.positions.CENTER,
    };
  }
  Toast.show(message, toastOptions);
};

export default showToast;
