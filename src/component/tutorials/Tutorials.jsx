import React, { Component } from 'react';
import { Animated,Text, View,TouchableWithoutFeedback,Image,Easing } from 'react-native';
import { ImageSafe, ImageBackgroundSafe } from '../image-safe';
import {
    checkIsFullScreen,
    isIpad,
    isIphone45,
    scaleSize,
    setSpText,
  } from '../../utils/screenInfo';
import styles from './Tutorials.style'

class Tutorials extends Component{
    constructor(props) {
        super(props);
        this.state = {
            flowMatrix : '流程',
            context :"文本",
            //定义动画初始值
            pointer:new Animated.Value(0),//指针
            cirScale:new Animated.Value(1),//圆放大透明
            opacity:new Animated.Value(1),
            dragPoint:new Animated.ValueXY({x:scaleSize(200),y:scaleSize(400)}),//拖拽
        };
    }
    //闪烁点击指针动画
    startAnimation() {
        this.state.pointer.setValue(0);
        Animated.timing(this.state.pointer, {
            toValue: 1,
            duration: 2000,
            easing: Easing.bounce ,
            useNativeDriver: true 
        }).start(() => this.startAnimation());
    }
    //拖动积木块动画
    moveAnimations() {
        this.state.cirScale.setValue(1);
        this.state.opacity.setValue(1);
        this.state.dragPoint.setValue({x:scaleSize(200),y:scaleSize(400)});
        //动画执行流
        Animated.sequence([
            Animated.timing( this.state.dragPoint, {
                toValue: {x:scaleSize(257),y:scaleSize(300)},
                duration: 1500,
                easing: Easing.linear ,
                useNativeDriver: true 
            }),
            //并行动画
            Animated.parallel([
                Animated.timing( this.state.cirScale, {
                    toValue: 2,
                    duration: 1000,
                    easing: Easing.linear ,
                    useNativeDriver: true 
                }),
                Animated.timing( this.state.opacity, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.linear ,
                    useNativeDriver: true 
                }),
            ]),
            Animated.timing( this.state.dragPoint, {
                toValue: {x:scaleSize(180),y:scaleSize(300)},
                duration: 1500,
                easing: Easing.linear ,
                useNativeDriver: true 
            })
        ]).start(()=>this.moveAnimations())
    }
    componentDidMount(){
        this.startAnimation();
        this.moveAnimations(); 
    }
    render(){
        return (
            <View style={styles.maskLayer}>
                <TouchableWithoutFeedback >
                    <Text style={{color:'white'}}>全屏测试</Text>
                </TouchableWithoutFeedback>
                <Animated.Image 
                        resizeMode={'contain'}
                        source={require("../../resource/images/btnPoint.png")}
                        style={[styles.btnPointer,{opacity:this.state.pointer}]}
                    ></Animated.Image>
                <Animated.View style={[
                              styles.circle,
                              [
                                  {transform: [{scale:this.state.cirScale}]},
                                  {opacity:this.state.opacity}
                              ]
                            ]}></Animated.View>
                <Animated.Image 
                        resizeMode={'contain'}
                        source={require("../../resource/images/dragPoint.png")}
                        style={[
                              styles.dragPointer,
                              [{transform:[
                                  {translateX:this.state.dragPoint.x},
                                  {translateY:this.state.dragPoint.y},
                                  {rotateY:"180deg"}, {rotateZ:'-45deg'}//倾斜图片
                                ] 
                              }]
                            ]}
                ></Animated.Image>
                <Image 
                        resizeMode={'contain'}
                        source={require("../../resource/images/chatBuble.png")}
                        style={styles.chatBuble}
                ></Image>
            </View>
        )
    }
}
export default Tutorials