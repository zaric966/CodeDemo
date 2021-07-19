import Base64 from 'base64-arraybuffer';
import MD5 from 'md5';
import deviceInfo from 'react-native-device-info';

let uniqueId;
const getUniqueId = () => {
  if (uniqueId === undefined) {
    uniqueId = deviceInfo.getUniqueId();
  }
  return uniqueId;
};

class Crypto {
  constructor() {
    this.deviceID = getUniqueId();
    this.iv = 'c6b91b6e3f2f36e69ae6f85a827ab262';
    this.needCrypt = true;
  }

  encrypt = async (plain, uin) => {
    if (this.needCrypt) {
      let k = this._getKey(uin);
      const cipher = this._encrypt(plain, k);
      return cipher;
    } else {
      return plain;
    }
  };

  decrypt = async (enc, uin) => {
    if (this.needCrypt) {
      let k = this._getKey(uin);
      const plain = this._decrypt(enc, k);
      return plain;
    } else {
      return enc;
    }
  };

  // ************ private method ****************

  /*
   * parameters:
   *     s(string), k(string)
   * return:
   *      base64String
   */
  _encrypt(s, k) {
    // 加密步骤 1.sring转arraybuffer  2.异或  3.arraybuffer转base64string
    let buf = this._stringToArrayBuffer(s);
    let bufView = new Uint8Array(buf);
    let buf2 = new ArrayBuffer(buf.byteLength);
    let bufView2 = new Uint8Array(buf2);
    let kBuf = this._stringToArrayBuffer(k);
    let kBufView = new Uint8Array(kBuf);
    this._xor(bufView, bufView2, kBufView);
    let b64String = Base64.encode(buf2);
    return b64String;
  }

  /*
   * parameters:
   *     s(base64String), k(string)
   * return:
   *      plain string
   */
  _decrypt(s, k) {
    // 解密步骤 1.base64string转arraybuffer  2.异或  3.arraybuffer转string
    let buf = Base64.decode(s);
    let bufView = new Uint8Array(buf);
    let buf2 = new ArrayBuffer(buf.byteLength);
    let bufView2 = new Uint8Array(buf2);
    let kBuf = this._stringToArrayBuffer(k);
    let kBufView = new Uint8Array(kBuf);
    this._xor(bufView, bufView2, kBufView);
    let plain = this._arraybufferToString(buf2);
    return plain;
  }

  _xor(src, dst, key) {
    let len = src.byteLength;
    let keyLen = key.length;
    let i = 0,
      j = 0;
    for (; i < len; i += keyLen) {
      for (j = 0; j < keyLen && i + j < len; j++) {
        dst[i + j] = src[i + j] ^ key[j];
      }
      if (i + j >= len) {
        break;
      }
    }
  }

  _getKey(uin) {
    return MD5(`${this.deviceID}${uin}`);
  }

  // _stringToArrayBuffer = async (text) => {
  //     let b = new Blob([text], {type:'text/plain'});
  //     const reader = new FileReader();
  //     return new Promise((resolve, reject) => {
  //         reader.onload = () => {
  //             // const encoded = Base64.encode(reader.result);
  //         };
  //         reader.readAsArrayBuffer(b);
  //     });
  // };

  _stringToArrayBuffer(str) {
    let buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    let bufView = new Uint16Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  _arraybufferToString(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
  }
}

export default new Crypto();
