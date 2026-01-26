import { getUserId } from '@/amplify/auth/authService';
import StickyNote from '@/components/StickyNotes';
import { createNewList, fetchUserLists } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
export default function ListingDashboard() {
  const router = useRouter(); 
  const COLORS = ['#FFF9C4', '#E1F5FE', '#FFEBEE', '#E8F5E9', '#F3E5F5'];

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State 
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Fetch User Lists
  const loadLists = async () => {
    setLoading(true);
    const currentUserId = await getUserId();

    if (currentUserId) {
        console.log("Refetching lists for:", currentUserId);
        const data = await fetchUserLists(currentUserId);
        setLists(data);
    } else {
        console.log("No user found");
    }
    
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  // Handle Create List
  const handleCreate = async () => {
    if (!newListName.trim()) {
      Alert.alert("Name Required", "Please name your list.");
      return;
    }

    setCreating(true);
    const userId = await getUserId();
    
    if (userId) {
      // Call Backend
      const result = await createNewList(userId, newListName, selectedColor);
      
      if (result.success) {
        // Success! 
        setModalVisible(false);
        setNewListName(''); // Reset input
        
        loadLists(); 
      } else {
        Alert.alert("Error", "Could not create list. Try again.");
      }
    }
    setCreating(false);
  };

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
      <TouchableOpacity
        style={styles.newListButton}
        onPress={() => setModalVisible(true)} 
      >
        <Text style={styles.newListText}>NEW LIST</Text>
      </TouchableOpacity>

      {/* Create List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New List</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Party Shopping"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus={true} 
            />

            {/* Color Picker */}
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: c },
                    selectedColor === c && styles.selectedColor
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            {/* Create Button */}
            <TouchableOpacity 
              style={styles.createBtn}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.createBtnText}>Create List</Text>
              )}
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>
      
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
  // Modal Styles
  modalOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    padding: 25, 
    minHeight: 400, 
    paddingBottom: 40
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 10, 
    color: '#555', 
    marginTop: 10 
  },
  input: {
    backgroundColor: '#F5F5F5', 
    padding: 15, 
    borderRadius: 12, 
    fontSize: 18, 
    marginBottom: 20,
  },
  colorRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 30 
  },
  colorCircle: { 
    width: 45, 
    height: 45, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#EEE' },
  selectedColor: { 
    borderWidth: 3, 
    borderColor: '#718F64' 
  },
  createBtn: {
    backgroundColor: '#718F64', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
  },
  createBtnText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
});