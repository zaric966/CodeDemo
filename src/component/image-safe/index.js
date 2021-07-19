import { isEqual } from 'lodash';
import React, { Component } from 'react';
import { Image, ImageBackground } from 'react-native';

const _404_NOT_EXIST = '404-not-exist';

class ImageSafe extends Component {
  shouldComponentUpdate(nextProps) {
    return !isEqual(nextProps, this.props);
  }
  render() {
    var { source, ...restProps } = this.props;
    if (!source) {
      source = _404_NOT_EXIST;
      console.warn(`\t\t\t>>> ImageSafe.source invalid! Forced to '${_404_NOT_EXIST}'.`);
    } else if (source.hasOwnProperty('uri') && !source.uri) {
      source.uri = _404_NOT_EXIST;
      console.warn(`\t\t\t>>> ImageSafe.source.uri invalid! Forced to '${_404_NOT_EXIST}'.`);
    }

    // console.log(`\t\t\t>>> ImageSafe.source: ${JSON.stringify(source)}.`);
    return <Image source={source} {...restProps} />;
  }
}

class ImageBackgroundSafe extends Component {
  shouldComponentUpdate(nextProps) {
    return !isEqual(nextProps, this.props);
  }
  render() {
    var { source, ...restProps } = this.props;
    if (!source) {
      source = _404_NOT_EXIST;
      console.warn(`\t\t\t>>> ImageBackgroundSafe.source invalid! Forced to '${_404_NOT_EXIST}'.`);
    } else if (source.hasOwnProperty('uri') && !source.uri) {
      console.warn(
        `\t\t\t>>> ImageBackgroundSafe.source.uri invalid! Forced to '${_404_NOT_EXIST}'.`
      );
      source.uri = _404_NOT_EXIST;
    }

    return <ImageBackground source={source} {...restProps} />;
  }
}

export { ImageSafe, ImageBackgroundSafe };
