// SceneBackground.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function SceneBackground() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

  const cloud1Anim = useRef(new Animated.Value(0)).current;
  const cloud2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateCloud = (
      animValue: Animated.Value,
      duration: number,
      startOffset: number
    ) => {
      // Set the starting position off-screen to the right
      animValue.setValue(width + startOffset);

      // Start the looping animation
      Animated.loop(
        Animated.timing(animValue, {
          toValue: -width, // Move completely off-screen to the left
          duration: duration, // How long it takes to cross the screen (speed)
          easing: Easing.linear, // Constant speed, no acceleration
          useNativeDriver: true, 
        })
      ).start();
    };

    // Start the animations with different speeds and offsets
    animateCloud(cloud1Anim, 25000, 0);
    animateCloud(cloud2Anim, 40000, width / 2);
    
  }, [width]);

  const animatedStyle1 = {
    transform: [{ translateX: cloud1Anim }],
  };
  const animatedStyle2 = {
    transform: [{ translateX: cloud2Anim }, { scale: 0.7}],
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Sky */}
      <View style={styles.skyBackground} pointerEvents="none" />
      
      {/* Clouds */}
      <Animated.Image
        source={require('@/assets/images/sign_in/Clouds.png')}
        style={[styles.cloudImage, styles.cloudLayer2, animatedStyle2]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require('@/assets/images/sign_in/Clouds.png')}
        style={[styles.cloudImage, styles.cloudLayer1, animatedStyle1]}
        resizeMode="contain"
      />
      
      {/* Bushes */}
      <View style={styles.bushesContainer} pointerEvents="none">
        <Image 
          source={require('@/assets/images/sign_in/Bushes.png')} 
          style={styles.bushesBackground} 
          resizeMode="repeat" 
        />
      </View>
      
      {/* Grass */}
      <Image 
        source={require('@/assets/images/sign_in/GrassBG.png')} 
        style={styles.grassBackground} 
        resizeMode="repeat" 
      />

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
    height: '100%', 
    justifyContent: 'center',
    backgroundColor: '#0cd3eeff', 
  },
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
  bushesContainer: {
    position: 'absolute',
    top: '26%',      
    width: '100%',
    height: '20%',   
    zIndex: 1,       
    transform: [{ scale: 2.1 }], 
  },
  bushesBackground: {
    width: '100%',
    height: '100%',   
    opacity: 0.9,  
  },
  grassBackground: {
    position: 'absolute',
    top: '40%',    
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 0,
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