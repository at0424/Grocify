import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  // 1. Set up the animated value
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 2. Define the heartbeat animation sequence
    const heartbeat = Animated.loop(
      Animated.sequence([
        // First beat
        Animated.timing(scaleAnim, {
          toValue: 1.2, // Scale up
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Scale down
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Second beat (slightly smaller)
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Pause between heartbeats
        Animated.delay(800)
      ])
    );

    // 3. Start the animation
    heartbeat.start();

    // Cleanup animation on unmount
    return () => heartbeat.stop();
  }, [scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@/assets/images/Grocify_Logo.png')} 
        style={[
          styles.logo,
          { transform: [{ scale: scaleAnim }] } 
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: '#f8f9fa', 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logo: {
    width: width * 0.4, 
    height: width * 0.4, 
  },
});