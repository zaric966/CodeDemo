/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { NativeRouter } from 'react-router-native';
import { Modal } from 'react-native';

import MineHomePage from './component/MineHomePage';
import Tutorials from './component/tutorials/Tutorials'


class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render(){
    return (
      // <View
      //   style={{
      //     flex: 1,
      //     justifyContent: "center",
      //     alignItems: "center"
      //   }}>
      //   <Text>test for router</Text>
      //   <NativeRoute>

      //   </NativeRoute>
      // </View>
      <Tutorials />
    )
  }
}

export default App;
