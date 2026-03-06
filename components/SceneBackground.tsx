import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function SceneBackground() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 710;
  const isTallScreen = height > 850;

  // --- Animation Values ---
  const cloud1Anim = useRef(new Animated.Value(0)).current;
  const cloud2Anim = useRef(new Animated.Value(0)).current;
  const flowerSwayAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    // --- Cloud Animation Logic ---
    const animateCloud = (
      animValue: Animated.Value,
      duration: number,
      startOffset: number
    ) => {
      animValue.setValue(width + startOffset);
      Animated.loop(
        Animated.timing(animValue, {
          toValue: -width, 
          duration: duration, 
          easing: Easing.linear, 
          useNativeDriver: true, 
        })
      ).start();
    };

    animateCloud(cloud1Anim, 25000, 0);
    animateCloud(cloud2Anim, 40000, width / 2);

    // --- Flower Sway Animation Logic ---
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowerSwayAnim, {
          toValue: 1, 
          duration: 2500, // 2.5 seconds to lean right
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true,
        }),
        Animated.timing(flowerSwayAnim, {
          toValue: -1, 
          duration: 5000, // 5 seconds to swing all the way left
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true,
        }),
        Animated.timing(flowerSwayAnim, {
          toValue: 0, 
          duration: 2500, // 2.5 seconds to return to center
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true,
        }),
      ])
    ).start();
    
  }, [width]);

  // --- Animation Styles ---
  const animatedCloudStyle1 = {
    transform: [{ translateX: cloud1Anim }],
  };
  const animatedCloudStyle2 = {
    transform: [{ translateX: cloud2Anim }, { scale: 0.7 }], 
  };
  
  const animatedFlowerStyle = {
    transform: [
      { 
        skewX: flowerSwayAnim.interpolate({ 
          inputRange: [-1, 1], 
          outputRange: ['-4deg', '4deg'] // Gentle 4-degree lean
        }) 
      },
      { 
        translateX: flowerSwayAnim.interpolate({ 
          inputRange: [-1, 1], 
          outputRange: [-4, 4] // Slight shift to enhance the lean
        }) 
      }
    ],
  };
  

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Sky */}
      <View style={styles.skyBackground} pointerEvents="none" />
      
      {/* Grass */}
      <View style={styles.grassFloor} pointerEvents="none" />

      {/* Clouds */}
      <Animated.Image
        source={require('@/assets/images/sign_in/Clouds.png')}
        style={[styles.cloudImage, styles.cloudLayer2, animatedCloudStyle2]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require('@/assets/images/sign_in/Clouds.png')}
        style={[styles.cloudImage, styles.cloudLayer1, animatedCloudStyle1]}
        resizeMode="contain"
      />
      
      {/* Bushes */}
      <View style={[styles.bushesContainer, isTallScreen && { top: '35%'}]} pointerEvents="none">
        <Image 
          source={require('@/assets/images/sign_in/Bushes.png')} 
          style={styles.bushesBackground} 
          resizeMode="repeat" 
        />
      </View>
      
      {/* Flowers */}
      {/* <Animated.Image 
        source={require('@/assets/images/sign_in/Flowers.png')} 
        style={[styles.flowers, isTablet && styles.flowersTablet, animatedFlowerStyle]} 
        resizeMode="repeat" 
      /> */}

      {/* Left Tree */}
      <Image 
        source={require('@/assets/images/sign_in/Tree2.png')} 
        style={[styles.singleTreeLeft, isTablet && styles.singleTreeLeftTablet]} 
        resizeMode="contain" 
      />

      {/* Right Tree */}
      <Image 
        source={require('@/assets/images/sign_in/Tree2.png')} 
        style={[styles.singleTreeRight, isTablet && styles.singleTreeRightTablet]} 
        resizeMode="contain" 
      />

      {/* Left Stall */}
      <Image 
        source={require('@/assets/images/sign_in/StallLeft.png')} 
        style={[styles.leftStall, isTablet && styles.leftStallTablet]} 
        resizeMode="contain" 
      />

      {/* Right Stall */}
      <Image 
        source={require('@/assets/images/sign_in/StallRight.png')} 
        style={[styles.rightStall, isTablet && styles.rightStallTablet]} 
        resizeMode="contain" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: '#6B9E49',
  },
  skyBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '49%', 
    justifyContent: 'center',
    backgroundColor: '#0cd3eeff', 
    zIndex: 0,
  },
  grassFloor: {
    ...StyleSheet.absoluteFillObject,
    height: '50%', 
    backgroundColor: '#6B9E49',
    zIndex: -1,
  },

  // --- Cloud Styles ---
  cloudImage: {
    position: 'absolute',
    width: '100%', 
    height: '25%', 
  },
  cloudLayer1: {
    top: '3%', 
    opacity: 0.95,
    zIndex: 1, 
  },
  cloudLayer2: {
    top: '10%', 
    opacity: 0.5, 
    zIndex: 1,
  },

  // --- Grass Area Styles ---
  flowers: {
    position: 'absolute',
    top: '53%', 
    left: -20,  
    right: -20,
    bottom: 0,
    zIndex: 1,
    width: '110%',
    height: '110%', 
  },
  flowersTablet: {
    top: '50%'
  },
  bushesContainer: {
    position: 'absolute',
    top: '28%',      
    width: '100%',
    height: '20%',   
    zIndex: 1,       
    transform: [{ scale: 2.3 }], 
  },
  bushesBackground: {
    width: '100%',
    height: '100%',   
  },

  // --- Stall Styles ---
  leftStall: {
      position: 'absolute',
      left: '-15%',      
      top: '25%',
      width: '52%',
      aspectRatio: 0.9, 
      zIndex: 3,
  },
  rightStall: {
      position: 'absolute',
      right: '-15%',      
      top: '35%',
      width: '50%',
      aspectRatio: 0.9, 
      zIndex: 3,
  },
  leftStallTablet: {
      position: 'absolute',
      right: '-10%',  
      top: '35%',    
      height: '35%', 
      aspectRatio: 0.9,
      zIndex: 3,      
  },
  rightStallTablet: {
      position: 'absolute',
      right: '-10%',  
      top: '35%',    
      height: '35%', 
      aspectRatio: 0.9,
      zIndex: 3,      
  },
  // --- Trees Styles ---
  singleTreeLeft: {
      position: 'absolute',
      left: '-20%',       
      top: '10%',          
      width: '65%',       
      aspectRatio: 0.60,  
      zIndex: 2,
  },
  singleTreeRight: {
      position: 'absolute',
      right: '-20%',      
      top: '10%',
      width: '65%',
      aspectRatio: 0.60, 
      zIndex: 2,
  },
  singleTreeLeftTablet: {
      position: 'absolute',
      left: '-20%', 
      top: '-5%',
      height: '85%',       
      aspectRatio: 0.60,  
      zIndex: 2,    
  },
  singleTreeRightTablet: {
      position: 'absolute',
      right: '-20%', 
      top: '-5%',
      height: '85%',       
      aspectRatio: 0.60,  
      zIndex: 2,    
  },
});