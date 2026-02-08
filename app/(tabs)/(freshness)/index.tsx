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
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const calculateDaysRemaining = (expiryDateString) => {
  if (!expiryDateString) return 0;
  const today = new Date();
  const expiry = new Date(expiryDateString);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const getBadgeColor = (days) => {
  if (days <= 0) return '#D32F2F'; 
  if (days <= 3) return '#F57C00'; 
  return '#388E3C'; 
};

const FreshnessDashboard = () => {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fridgeItems, setFridgeItems] = useState([]);

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

  useEffect(() => {
    const loadUnifiedFridge = async () => {
      if (!userId) return;

      try {
        console.log("Fetching User Lists for", userId);
        const userListsData = await fetchUserLists(userId);
        const listIds = Array.isArray(userListsData)
            ? userListsData.map(item => item.listId)
            : []; 
        
        console.log("Found Lists:", listIds);

        if (listIds.length === 0) {
            setFridgeItems([]); 
            setLoading(false);
            return;
        }

        // --- Fetch Fridge Items ---
        console.log("Fetching items from all fridges...");
        const promises = listIds.map(id => fetchFridgeItems(id));
        const results = await Promise.all(promises);

        // --- Merge and Sort ---
        let allItems = [];

        results.forEach(result => {
            // Check if result exists and has items
            if (result && result.items) {
                allItems = [...allItems, ...result.items];
            } else if (result && result.success && result.data) {
                allItems = [...allItems, ...result.data];
            }
        });

        console.log(`Total items found: ${allItems.length}`);

        const sortedItems = allItems.sort((a, b) => {
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

        setFridgeItems(sortedItems);

      } catch (error) {
        console.error("Failed to load unified fridge:", error);
        Alert.alert("Error", "Could not load fridge items.");
      } finally {
        setLoading(false);
      }
    };

    loadUnifiedFridge();
  }, [userId]);

  const renderItem = (item, index) => {
    const daysLeft = calculateDaysRemaining(item.expiryDate);
    const badgeColor = getBadgeColor(daysLeft);
    const isExpired = daysLeft <= 0;
    const itemImage = require('@/assets/images/Apple.png'); 

    return (
      <View key={`${item.itemId}-${index}`} style={[styles.itemContainer, { left: (index * 70) % 250 }]}>
        <Image source={itemImage} style={styles.itemImage} resizeMode="contain" />
        
        <View style={[styles.timerBadge, { borderColor: badgeColor }]}>
          {isExpired ? (
             <Ionicons name="alert-circle" size={12} color={badgeColor} />
          ) : (
             <Ionicons name="time-outline" size={12} color={badgeColor} />
          )}
          <Text style={[styles.timerText, { color: badgeColor }]}>
            {isExpired ? "EXPIRED" : `${daysLeft} DAYS`}
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
      <ImageBackground 
        source={require('@/assets/images/Fridge.png')} 
        style={styles.background}
        resizeMode="stretch" 
      >
        <SafeAreaView style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="chevron-back-circle" size={40} color="#5C8D53" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.shelvesContainer}>
          {[0, 1, 2, 3, 4].map((shelfRowIndex) => (
            <View key={shelfRowIndex} style={styles.shelfRow}>
              {fridgeItems
                .filter((_, index) => (index % 5) === shelfRowIndex)
                .map((item, index) => renderItem(item, index))
              }
            </View>
          ))}
        </View>

      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  background: { flex: 1, width: '100%', height: '100%' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10 },
  backButton: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  shelvesContainer: { flex: 1, marginTop: 60, marginBottom: 40, paddingHorizontal: 30, justifyContent: 'space-evenly' },
  shelfRow: { flex: 1, position: 'relative', justifyContent: 'flex-end', paddingBottom: 12 },
  itemContainer: { position: 'absolute', bottom: 5, alignItems: 'center', width: 60 },
  itemImage: { width: 55, height: 55 },
  itemName: { fontSize: 9, color: '#333', marginTop: 2, textAlign: 'center', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  timerBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', zIndex: 10, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5 },
  timerText: { fontSize: 9, fontWeight: 'bold', marginLeft: 3 }
});

export default FreshnessDashboard;