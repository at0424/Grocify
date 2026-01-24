import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StickyNote from '../../../components/StickyNotes';

// Dummy Data
const myLists = [
  { id: '1', title: 'Party', collaborators: [{ color: 'white' }, { color: '#555' }] },
  { id: '2', title: 'Weekly Shopping', collaborators: [{ color: 'white' }] },
];

export default function ListingDashboard() {
  const router = useRouter();

  return (
    <View style={styles.screenContainer}>
      
      {/* Header Bar */}
      <View style={styles.header}>
        <Ionicons name="close" size={28} color="white" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>My Lists</Text>
        <Ionicons name="create-outline" size={28} color="white" />
      </View>

      {/* Grid of Notes */}
      <FlatList
        data={myLists}
        keyExtractor={(item) => item.id}
        numColumns={2} // Creates the side-by-side layout
        columnWrapperStyle={styles.row} // Spacing between columns
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <StickyNote 
            title={item.title} 
            collaborators={item.collaborators}
            onPress={() => router.push({
              pathname: "./detail_list",  
              params: { title: item.title } 
            })}
            onAddCollaborator={() => console.log('Add person to:', item.title)}
          />
        )}
      />

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