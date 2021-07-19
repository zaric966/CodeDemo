// import DeviceInfo from 'react-native-device-info';
import { StyleSheet } from 'react-native';

import {
    checkIsFullScreen,
    isIpad,
    isIphone45,
    scaleSize,
    setSpText,
  } from '../utils/screenInfo';


  export default StyleSheet.create({
    //整体背景
    bgView: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E5E5',
        flexDirection: "column"
    },
    // 上半部
    headerView:{
        height:scaleSize(152),
        backgroundColor:'#FFFFFF',
        position:"relative"
    },

    // 头像
    avatarContainer:{
        width:scaleSize(56),
        height:scaleSize(56),
        borderRadius:scaleSize(4),
        marginLeft:scaleSize(16),
        marginTop:scaleSize(16),
    },
    Avatar:{
        width:scaleSize(56),
        height:scaleSize(56),
        borderRadius:scaleSize(4),
    },

    // 用户信息
    uInfoContainer:{
        width:scaleSize(287),
        position:"absolute",
        top:scaleSize(16),
        left:scaleSize(84),
    },
    uname:{
        color:"#262626",
        fontSize:scaleSize(16)
    },
    uin:{
        color:"#8C8C8C",
        fontSize:scaleSize(14),
        marginTop:scaleSize(8)
    },
    editIcon:{
        width:scaleSize(24),
        height:scaleSize(24),
        position:"relative",
        left:scaleSize(253),
        top:scaleSize(-36),
    },

    // 会员卡
    vipCardContainer:{
        width:scaleSize(343),
        height:scaleSize(48),
        marginTop:scaleSize(16),
        marginLeft:scaleSize(16),
        marginBottom:scaleSize(16)
    },
    vipCard:{
        width:scaleSize(343),
        height:scaleSize(48),
        borderRadius:scaleSize(2)
    },

    test:{
        borderWidth:scaleSize(1),
        borderColor:'blue' 
    },
    // 下半部
    bodyView:{
        height:scaleSize(608),
        backgroundColor:'#FFFFFF',
        position:'relative',
        top:scaleSize(8)
    },
    //红点样式
    dot:{
        height:scaleSize(8),
        width:scaleSize(8),
        backgroundColor:'#FC622F',
        marginTop:scaleSize(8),
        borderRadius:scaleSize(10),
        position:'absolute',
        left:scaleSize(309)
    },
    dotWithText:{
        height:scaleSize(13),
        width:scaleSize(17),
        marginRight:scaleSize(4),
        marginTop:scaleSize(6),
        backgroundColor:'#FC622F',
        borderRadius:scaleSize(10),
        position:'absolute',
        left:scaleSize(300)   
    },
    dotContext:{
        width:scaleSize(17),
        textAlign:'center',
        textAlignVertical:'center',
        fontSize:scaleSize(8),
        fontWeight:'400',
        color:'#FFFFFF'
    },
    //菜单样式     
    menuList:{
        width:scaleSize(343),
        flexDirection:'column',
        marginLeft:scaleSize(16),
    },
    menuTitle:{
        height:scaleSize(24),
        width:scaleSize(283),
        color:'#262626',
        textAlignVertical:'center',
        marginLeft:scaleSize(8),

    },
    detail:{

    },
    news:{
        flexDirection:'row',
        marginTop:scaleSize(16),
        marginBottom:scaleSize(16)
    },

    order:{
        flexDirection:'row',
        marginTop:scaleSize(16),
        marginBottom:scaleSize(16)
    },
    feedback:{
        flexDirection:'row',
        marginTop:scaleSize(16),
        marginBottom:scaleSize(16)
    },
    cdkey:{
        flexDirection:'row',
        marginTop:scaleSize(16),
        marginBottom:scaleSize(16)
    },
    setup:{
        flexDirection:'row',
        marginTop:scaleSize(16),
        marginBottom:scaleSize(16)
    },
  })