// SceneBackground.tsx
import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function SceneBackground() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

  return (
    <>
      {/* Sky */}
      <View style={styles.skyBackground} pointerEvents="none" />
      
      {/* Clouds */}
      <Image 
        source={require('@/assets/images/sign_in/Clouds.png')} 
        style={styles.cloudsBackground} 
        resizeMode="repeat" 
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
    </>
  );
}

const styles = StyleSheet.create({
  skyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%', 
    backgroundColor: '#0cd3eeff', 
    zIndex: 0,
  },
  cloudsBackground: {
    position: 'absolute',
    width: '100%',
    zIndex: 1,       
    opacity: 0.9,  
    justifyContent: 'center',
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