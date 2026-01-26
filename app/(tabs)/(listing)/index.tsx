import { getUserId } from '@/amplify/auth/authService';
import StickyNote from '@/components/StickyNotes';
import { fetchUserLists } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Dummy Data
const myLists = [
  { id: '1', title: 'Party', collaborators: [{ color: 'white' }, { color: '#555' }] },
  { id: '2', title: 'Weekly Shopping', collaborators: [{ color: 'white' }] },
];

export default function ListingDashboard() {
  const router = useRouter(); 

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch User Lists
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        setLoading(true);
        
        const userId = await getUserId();

        if (userId) {
            // User found, fetch their data
            console.log("Active User:", userId);
            const data = await fetchUserLists(userId);
            setLists(data);
        } else {
            // No user found -> Send to Login
            console.log("No user found, redirecting...");
            // router.replace('/login'); 
        }
        
        setLoading(false);
      };

      initialize();
    }, [])
  );

  return (
    <View style={styles.screenContainer}>
      
      {/* Header Bar */}
      <View style={styles.header}>
        <Ionicons name="close" size={28} color="white" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>My Lists</Text>
        <Ionicons name="create-outline" size={28} color="white" />
      </View>

      {/* Grid of Notes */}
      {loading ? (
        <ActivityIndicator size="large" color="white" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={lists}
          // UPDATED: Use 'listId' from your DynamoDB table
          keyExtractor={(item) => item.listId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          
          // UPDATED: Fallback Message
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={60} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyText}>No Grocery List Created.</Text>
              <Text style={styles.emptySubText}>Please create or join one!</Text>
            </View>
          }

          renderItem={({ item }) => (
            <StickyNote 
              title={item.listName} 
              collaborators={item.collaborators || []}
              onPress={() => router.push({
                pathname: "./detail_list",  
                params: { 
                  listId: item.listId,   
                  title: item.listName   
                } 
              })}
              onAddCollaborator={() => console.log('Add person to:', item.listName)}
            />
          )}
        />
      )}

      {/* "New List" Button */}
      <TouchableOpacity style={styles.newListButton}>
        <Text style={styles.newListText}>NEW LIST</Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#718F64', // The Moss Green from your image
    paddingTop: 50, // For status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  row: {
    justifyContent: 'space-between', // Spreads the notes apart
  },
  newListButton: {
    backgroundColor: 'white',
    marginHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40, // Sticks to bottom
    left: 0,
    right: 0,
  },
  newListText: {
    color: '#718F64',
    fontWeight: 'bold',
    fontSize: 16,
  },
});