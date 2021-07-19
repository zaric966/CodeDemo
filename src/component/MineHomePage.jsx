import React, { Component } from 'react';
import { Text, View,TouchableOpacity,TouchableHighlight,Image } from 'react-native';
import { ImageSafe, ImageBackgroundSafe } from './image-safe'
import Svg , { Path,Rect }from 'react-native-svg'
import styles from './MineHomePage.style'

class MineHomePage extends Component{
    constructor(props) {
        super(props);
        this.state = {
            uname : '用户名测试test1',
            uin:"121321321",
        }
    }

    render(){
        return(
        <View style={styles.bgView}>
            <View style={styles.headerView}>
            <TouchableOpacity style={styles.avatarContainer} onPress={()=>alert('你点击了头像！')}>
              <ImageSafe
                resizeMode={'contain'}
                source={require("../resource/images/avatar1x3.png")}
                style={styles.Avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.uInfoContainer} onPress={()=>alert('你点击了个人信息！')}>
                <Text style={styles.uname}>{this.state.uname}</Text>
                <Text style={styles.uin}>迷你号：{this.state.uin}</Text>
                <View style={styles.editIcon}>
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <Path fill-rule="evenodd" clip-rule="evenodd" d="M13.9341 4.00005L18.146 8.17398L16.0401 10.261L11.8282 6.08702L13.9341 4.00005ZM11.126 6.78286L15.3379 10.9568L8.31814 17.9133L8.31787 17.9131L4.1065 17.9131L4.1065 13.7396L4.1063 13.7394L4.1065 13.7392L4.1065 13.7392L4.10653 13.7392L11.126 6.78286Z" fill="#BFBFBF"/>
                    <Rect x="13.0513" y="14.9204" width="6.94917" height="2.95142" fill="#BFBFBF"/>
                </Svg>
                </View>
              </TouchableOpacity>
            <TouchableOpacity style={styles.vipCardContainer} onPress={()=>alert('你点击了会员卡！')}>
              <Image
                source={require("../resource/images/yearCard.png")}
                style={styles.vipCard}
              />
            </TouchableOpacity>
            </View>
            <View style={styles.bodyView} >
                <View style={styles.menuList}>
                <TouchableOpacity onPress={()=>alert('你点击了消息中心！')}>
                    <View style={styles.news}>
                        <View style={styles.newsIcon}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Rect x="6" y="6" width="12" height="12" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            <Path d="M3 18H21" stroke="black" strokeWidth="2"/>
                            <Path d="M9 21H15" stroke="black" strokeWidth="2"/>
                            <Path d="M12 3L12 6" stroke="black" strokeWidth="2"/>
                        </Svg>
                        </View>
                        <Text style={styles.menuTitle}>消息中心</Text>
                        <View style={styles.dotWithText}>
                            <Text style={styles.dotContext}>12</Text>         
                        </View>
                        <View style={styles.detail}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M9 6L15 12L9 18" stroke="#BFBFBF" strokeWidth="2"/>
                            </Svg>
                        </View>
                    </View>
                    
                </TouchableOpacity>
                
                <TouchableOpacity onPress={()=>alert('你点击了我的订单！')}>
                    <View style={styles.order}>
                        <View style={styles.orderIcon}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M4 9H20V20H4V9Z" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            <Path d="M7 4H17L20 9H4L7 4Z" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            <Rect x="9" y="12" width="6" height="2" fill="black"/>
                            </Svg>
                        </View>
                        <Text style={styles.menuTitle}>我的订单</Text>
                        <View style={styles.detail}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M9 6L15 12L9 18" stroke="#BFBFBF" strokeWidth="2"/>
                            </Svg>
                        </View>
                    </View>
                    
                </TouchableOpacity>
                
                <TouchableOpacity onPress={()=>alert('你点击了意见反馈！')}>
                    <View  style={styles.feedback}>
                        <View style={styles.feedbackIcon}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <Path d="M4 12L12 15L20 12V20H4V12Z" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                        <Path d="M18 13V4H6V13" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                        <Rect x="9" y="6" width="6" height="2" fill="black"/>
                        <Rect x="9" y="9" width="6" height="2" fill="black"/>
                        </Svg>
                        </View>
                        <Text style={styles.menuTitle}>意见反馈</Text>
                        <View style={styles.detail}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M9 6L15 12L9 18" stroke="#BFBFBF" strokeWidth="2"/>
                            </Svg>
                        </View>
                    </View>

                </TouchableOpacity>
                
                <TouchableOpacity onPress={()=>alert('你点击了兑换码！')}>
                    <View  style={styles.cdkey}>
                        <View style={styles.cdkeyIcon}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M20 4H4V20H7.2V17.8667H10.4V20H13.6V17.8667H16.8V20H20V4Z" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            <Path d="M7 7H17V11H7V7Z" fill="black"/>
                            </Svg>
                        </View>
                        <Text style={styles.menuTitle}>兑换码</Text>
                        <View style={styles.detail}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M9 6L15 12L9 18" stroke="#BFBFBF" strokeWidth="2"/>
                            </Svg>
                        </View>
                    </View>
             
                </TouchableOpacity>

                <TouchableOpacity  onPress={()=>alert('你点击了设置！')}>
                    <View style={styles.setup}>
                        <View style={styles.setupIcon}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M21 12L17 20L7 20L3 12L7 4L17 4L21 12Z" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            <Rect x="9" y="9" width="6" height="6" rx="3" stroke="black" strokeWidth="2" stroke-linejoin="round"/>
                            </Svg>
                        </View>
                        <Text style={styles.menuTitle}>设置</Text>
                        <Text style={styles.dot}></Text>
                        <View style={styles.detail}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <Path d="M9 6L15 12L9 18" stroke="#BFBFBF" strokeWidth="2"/>
                            </Svg>
                        </View>
                    </View>
                </TouchableOpacity>
                </View>
            </View>
            <View style={styles.footerNavi}>

            </View>
        </View>
        )
    }
}

export default MineHomePage;