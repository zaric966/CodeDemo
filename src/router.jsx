import { get, isEqual, set } from 'lodash';
import React, { Component } from 'react';
import routePath from './routePath'
import {
    AppState,
    Dimensions,
    NativeModules,
    View,
    ToastAndroid,
    StatusBar,
    Platform,
    InteractionManager,
  } from 'react-native';
import { Route, withRouter, Redirect } from 'react-router-native';

export const { width, height, scale } = Dimensions.get('screen');
// @withRouter
class Routers extends Component{
    constructor(props) {
      super(props);
      this.state = {
        currentAppState: AppState.currentState,
      };
    }
    componentDidMount() {
        AppState.addEventListener('change', this._handleAppStateChange);
    
        const {
          history,
        }=this.props;
          // 将history 绑定到全局
        window.nativeHistory = history;
        history.listen(this.historyListener);
    }

}
export { Routers as default, routePath };