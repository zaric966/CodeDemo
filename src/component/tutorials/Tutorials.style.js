import { StyleSheet } from 'react-native';

import {
    checkIsFullScreen,
    isIpad,
    isIphone45,
    scaleSize,
    setSpText,
  } from '../../utils/screenInfo';


  export default StyleSheet.create({
    //遮罩层  
    maskLayer:{
          width:"100%",
          height:'100%',
          backgroundColor:'rgba(15,32,68,1)',
          borderWidth:scaleSize(2),
          borderColor:'red'
      },
      //指示指针
     btnPointer:{
         width:scaleSize(66),
         height:scaleSize(77)
     },
     //拖拽流程指针
     dragPointer:{
        width:scaleSize(66),
        height:scaleSize(77),
        transform:[],
        position:'absolute',
     },
     //聊天气泡
     chatBuble:{
         width:scaleSize(116),
         height:scaleSize(55.52)
     },
     //点选圆圈
     circle:{
         width:scaleSize(34),
         height:scaleSize(34),
         borderColor:'#FFC425',
         borderWidth:scaleSize(8),
         borderRadius:scaleSize(50),
         transform: [{scale:1}],
         position:'absolute',
         top:scaleSize(300),
         left:scaleSize(300)
     },
  })