import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    ImageBackground,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Mock Data
const MOCK_ITEMS = [
  { id: '1', name: 'Apple', daysLeft: 3, image: require('@/assets/images/Apple.png'), shelfIndex: 0 },
];

const FreshnessDashboard = () => {
  const router = useRouter(); 

  const renderItem = (item) => (
    <View key={item.id} style={styles.itemContainer}>
      <Image source={item.image} style={styles.itemImage} resizeMode="contain" />
      <View style={styles.timerBadge}>
        <Ionicons name="time-outline" size={12} color="#333" />
        <Text style={styles.timerText}>{item.daysLeft} DAYS</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. The Fridge Background */}
      {/* Make sure the path to assets is correct based on your folder structure */}
      <ImageBackground 
        source={require('@/assets/images/Fridge.png')} 
        style={styles.background}
        resizeMode="stretch" 
      >
        
        {/* 2. Header Area */}
        <SafeAreaView style={styles.headerContainer}>
          {/* Replace navigation.goBack() with router.back() */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="chevron-back-circle" size={40} color="#5C8D53" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* 3. The Shelves Container */}
        <View style={styles.shelvesContainer}>
          {[0, 1, 2, 3, 4].map((shelfIndex) => (
            <View key={shelfIndex} style={styles.shelfRow}>
              {MOCK_ITEMS.filter(item => item.shelfIndex === shelfIndex).map(renderItem)}
            </View>
          ))}
        </View>

      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shelvesContainer: {
    flex: 1,
    marginTop: 60,   
    marginBottom: 40, 
    paddingHorizontal: 30, 
    justifyContent: 'space-evenly' 
  },
  shelfRow: {
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'flex-end', 
    paddingBottom: 15,      
  },
  itemContainer: {
    alignItems: 'center',
    marginRight: 15, 
    position: 'relative',
  },
  itemImage: {
    width: 60, 
    height: 60,
  },
  timerBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
    color: '#333',
  }
});

export default FreshnessDashboard;