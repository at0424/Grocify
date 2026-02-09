import { getUserId } from '@/amplify/auth/authService';
import { fetchFridgeItems, fetchUserLists } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Use to calculate the expiring days remaining
const calculateTimeRemaining = (expiryDateString) => {
  if (!expiryDateString) return { value: 0, unit: 'expired' };

  const today = new Date();
  const expiry = new Date(expiryDateString);
  
  // Get difference in milliseconds
  const diffMs = expiry - today;

  // If time has passed, it's Expired
  if (diffMs <= 0) {
    return { value: 0, unit: 'expired' };
  }

  // If less than 24 hours, show HOURS
  if (diffMs < (1000 * 60 * 60 * 24)) {
    const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
    return { value: hoursLeft, unit: 'hours' };
  }

  // Otherwise, show DAYS
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { value: daysLeft, unit: 'days' };
};

// Function to change the badge color based on expiring day
const getBadgeStatus = (timeData) => {
  const { value, unit } = timeData;

  if (unit === 'expired') return { color: '#D32F2F', label: 'EXPIRED' }; // Red
  
  if (unit === 'hours') {
    // Less than 12 hours = Critical Red, else Orange
    return { 
      color: value < 12 ? '#D32F2F' : '#F57C00', 
      label: `${value}h` 
    };
  }

  // Days Logic
  if (value <= 3) return { color: '#F57C00', label: `${value}d` }; // Orange
  return { color: '#388E3C', label: `${value}d` }; // Green
};

const FreshnessDashboard = () => {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [allItems, setAllItems] = useState([]); // Stores EVERYTHING
  const [userLists, setUserLists] = useState([]); // Stores list names and IDs for filter UI

  // Filter State
  const [selectedListId, setSelectedListId] = useState('ALL'); 

  // Fetch User ID when component mounts
  useEffect(() => {
    const fetchId = async () => {
      try {
        const id = await getUserId();
        setUserId(id);
      } catch (error) {
        console.error("Error getting user ID:", error);
        setLoading(false); 
      }
    };
    fetchId();
  }, []);

  // Fetch Fridge Items
  useEffect(() => {
    const loadUnifiedFridge = async () => {
      if (!userId) return;

      try {
        const userListsData = await fetchUserLists(userId);
        
        const lists = Array.isArray(userListsData) ? userListsData : [];
        setUserLists(lists); 

        if (lists.length === 0) {
            setAllItems([]); 
            setLoading(false);
            return;
        }

        // --- Fetch Items for ALL lists ---
        const promises = lists.map(list => fetchFridgeItems(list.listId));
        const results = await Promise.all(promises);

        // --- Merge ---
        let mergedItems = [];
        results.forEach(result => {
            if (result && result.items) {
                mergedItems = [...mergedItems, ...result.items];
            } else if (result && result.success && result.data) {
                mergedItems = [...mergedItems, ...result.data];
            }
        });

        // --- Sort by Expiry ---
        const sortedItems = mergedItems.sort((a, b) => {
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

        setAllItems(sortedItems);

      } catch (error) {
        console.error("Failed to load unified fridge:", error);
        Alert.alert("Error", "Could not load fridge items.");
      } finally {
        setLoading(false);
      }
    };

    loadUnifiedFridge();
  }, [userId]);

  // Filter Logic
  const displayedItems = selectedListId === 'ALL' 
    ? allItems 
    : allItems.filter(item => item.listId === selectedListId);

    
  const renderItem = (item, index) => {
    // Get the precise time data
    const timeData = calculateTimeRemaining(item.expiryDate);
    
    // Get the Color and Label
    const status = getBadgeStatus(timeData);

    const itemImage = require('@/assets/images/Apple.png'); 

    return (
      <View key={`${item.itemId}-${index}`} style={[styles.itemContainer, { left: (index * 70) % 250 }]}>
        <Image source={itemImage} style={styles.itemImage} resizeMode="contain" />
        
        {/* The Timer Badge */}
        <View style={[styles.timerBadge, { borderColor: status.color }]}>
          {/* Show Alert Icon if Expired or very urgent (Hours) */}
          {timeData.unit === 'expired' || timeData.unit === 'hours' ? (
             <Ionicons name="alert-circle" size={10} color={status.color} />
          ) : null}
          
          <Text style={[styles.timerText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#5C8D53" />
        <Text style={{marginTop: 10, color: '#666'}}>Scanning all your fridges...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* BACKGROUND IMAGE */}
      <ImageBackground 
        source={require('@/assets/images/Fridge.png')} 
        style={styles.background}
        resizeMode="stretch" 
      >
        <SafeAreaView style={styles.safeArea}>
          
          {/* HEADER ROW */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
               <Ionicons name="chevron-back-circle" size={40} color="#5C8D53" />
            </TouchableOpacity>

            {/* NEW: FILTER SCROLL VIEW */}
            <View style={styles.filterWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterContainer}
              >
                {/* 'ALL' BUTTON */}
                <TouchableOpacity 
                  style={[styles.filterChip, selectedListId === 'ALL' && styles.filterChipActive]} 
                  onPress={() => setSelectedListId('ALL')}
                >
                  <Text style={[styles.filterText, selectedListId === 'ALL' && styles.filterTextActive]}>
                    All Fridges
                  </Text>
                </TouchableOpacity>

                {/* INDIVIDUAL LIST BUTTONS */}
                {userLists.map((list) => (
                  <TouchableOpacity 
                    key={list.listId}
                    style={[styles.filterChip, selectedListId === list.listId && styles.filterChipActive]} 
                    onPress={() => setSelectedListId(list.listId)}
                  >
                    <Text style={[styles.filterText, selectedListId === list.listId && styles.filterTextActive]}>
                      {list.listName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* SHELVES (Now using 'displayedItems') */}
          <View style={styles.shelvesContainer}>
            {[0, 1, 2, 3, 4].map((shelfRowIndex) => (
              <View key={shelfRowIndex} style={styles.shelfRow}>
                {displayedItems
                  .filter((_, index) => (index % 5) === shelfRowIndex)
                  .map((item, index) => renderItem(item, index))
                }
              </View>
            ))}
          </View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  background: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },

  headerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingTop: 10,
    zIndex: 20, // Keep header above shelf items
  },
  
  // Filter Styles
  filterWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  filterContainer: {
    paddingRight: 20, // Add space at end of scroll
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#5C8D53', // Dark Green
    borderColor: '#4A7A41',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  filterTextActive: {
    color: '#fff',
  },

  backButton: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  
  // Shelf Styles
  shelvesContainer: { flex: 1, marginTop: 10, marginBottom: 40, paddingHorizontal: 30, justifyContent: 'space-evenly' },
  shelfRow: { flex: 1, position: 'relative', justifyContent: 'flex-end', paddingBottom: 12 },
  
  // Item Styles
  itemContainer: { position: 'absolute', bottom: 5, alignItems: 'center', width: 60 },
  itemImage: { width: 55, height: 55 },
  itemName: { fontSize: 9, color: '#333', marginTop: 2, textAlign: 'center', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  
  timerBadge: { 
    position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', 
    borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 4, paddingVertical: 1, 
    flexDirection: 'row', alignItems: 'center', zIndex: 10, elevation: 2 
  },
  timerText: { fontSize: 9, fontWeight: 'bold', marginLeft: 2 }
});

export default FreshnessDashboard;