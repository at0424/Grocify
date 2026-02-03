import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import StickyNote from '@/components/StickyNotes';
import { createNewList, deleteUserList, fetchCollaborators, fetchUserLists, removeCollaborator, shareList, updateUserList } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ListingDashboard() {
  const router = useRouter();
  const COLORS = ['#FFF9C4', '#E1F5FE', '#FFEBEE', '#E8F5E9', '#F3E5F5'];

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh state
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modal State 
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listNameInput, setListNameInput] = useState('');
  // Modal Share List State
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [listToShare, setListToShare] = useState(null);
  const [currentListMeta, setCurrentListMeta] = useState({}); // Stores the full object (owner, collaborators)

  // Edit List State
  const [isEditing, setIsEditing] = useState(false); // Toggle for Edit Mode
  const [editingListId, setEditingListId] = useState(null); // ID of list being renamed

  // Fetch User Lists || Refresh Screen
  const loadLists = async (isPullToRefresh = false) => {
    if (!isPullToRefresh) setLoading(true);

    const currentUserId = await getUserId();
    setCurrentUserId(currentUserId);

    if (currentUserId) {
      console.log("Refetching lists for:", currentUserId);
      const data = await fetchUserLists(currentUserId);
      setLists(data);
    } else {
      console.log("No user found");
    }

    setLoading(false);
    setRefreshing(false);
  };

  // Load on Screen Focus
  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  // Handle Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadLists(true); // true = isPullToRefresh
  };

  // Open Modal (Create vs Edit) 
  const openModal = (listToEdit = null) => {
    if (listToEdit) {
      // Edit Mode
      setEditingListId(listToEdit.listId);
      setListNameInput(listToEdit.listName);
      setSelectedColor(listToEdit.color || COLORS[0]); // Preserve color if you have it
    } else {
      // Create Mode
      setEditingListId(null);
      setListNameInput('');
      setSelectedColor(COLORS[0]);
    }
    setModalVisible(true);
  };

  // Handle Submit (Create or Rename)
  const handleSubmit = async () => {
    if (!listNameInput.trim()) {
      Alert.alert("Name Required", "Please name your list.");
      return;
    }

    setIsSubmitting(true);
    const userId = await getUserId();

    if (userId) {
      let result;
      if (editingListId) {
        // Renaming existing list
        result = await updateUserList(editingListId, listNameInput);
      } else {
        // Creating new list
        result = await createNewList(userId, listNameInput, selectedColor);
      }

      if (result.success) {
        setModalVisible(false);
        loadLists(); // Refresh UI
      } else {
        Alert.alert("Error", "Operation failed. Try again.");
      }
    }
    setIsSubmitting(false);
  };

  // Handle Delete List
  const handleDelete = async (listId, listName) => {
    const currentUserId = await getUserId();

    Alert.alert(
      "Delete List?",
      `Are you sure you want to delete "${listName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: 'destructive',
          onPress: async () => {
            // Call Delete API
            setLoading(true);
            const result = await deleteUserList(listId, currentUserId);
            
            if (result.success) {
              loadLists();
            } else {
              setLoading(false); // Stop loading first
              
              const errorMsg = String(result.message || "");

              // --- CHECK FOR PERMISSION ERROR ---
              if (errorMsg.includes("Permission Denied") || errorMsg.includes("Only the Owner")) {
                // Just notify the user politely
                Alert.alert("Permission Denied", "Only the list owner can delete this list.");
              } else {
                // Real error (Network, Server crash, etc.)
                console.log(errorMsg);
                Alert.alert("Error", errorMsg || "Could not delete list.");
              }
            }
          }
        }
      ]
    );
  };

  // Handle fetching of details before opening model
  const handleOpenShareModal = async (listId) => {
    const userId = await getUserId();
    const data = await fetchCollaborators(listId, userId);

    if (data.success) {
      setListToShare(listId);
      setCurrentListMeta({
        collaborators: data.collaborators,
        myRole: data.requesterRole,
        ownerEmail: data.ownerEmail
      });
      setShareModalVisible(true);
    } else {
      Alert.alert("Error", "Could not load team members.");
    }
  };

  // Handle Share List
  const handleShare = async (emailToInvite) => {
    const result = await shareList(listToShare, emailToInvite);

    if (result.success) {
      Alert.alert("Success", "User added!");
      handleOpenShareModal(listToShare);
      loadLists(true); // Refresh background list
      return true; 
    } else {
      Alert.alert("Failed", result.message || "Could not find user.");
      return false; 
    }
  };

  // Handle Remove User / Leaving List
  const handleRemove = (idToRemove) => {
    // Check if I am removing myself (Leaving)
    const isLeaving = idToRemove === currentUserId; 
    
    // Set text based on action
    const title = isLeaving ? "Leave List?" : "Remove User?";
    const message = isLeaving 
      ? "Are you sure you want to leave this list?" 
      : "This will remove the user from the list.";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { 
        text: isLeaving ? "Leave" : "Remove", 
        style: 'destructive',
        onPress: async () => {
            const result = await removeCollaborator(listToShare, idToRemove, currentUserId);
            
            if (result.success) {
                if (isLeaving) {
                    // CASE 1: I LEFT. 
                    // Do NOT refresh the modal (I lost access). Close it immediately.
                    setShareModalVisible(false);
                    setListToShare(null); // Optional cleanup
                } else {
                    // CASE 2: I KICKED SOMEONE.
                    // Refresh the modal to show they are gone.
                    handleOpenShareModal(listToShare);
                }

                // Always refresh the dashboard background
                loadLists(true); 
            } else {
                Alert.alert("Error", result.message || "Could not remove user.");
            }
        }
      }
    ]);
  };
  
  return (
    <View style={styles.screenContainer}>

      {/* Header Bar */}
      <View style={styles.header}>
        <Ionicons name="close" size={28} color="white" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>My Lists</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons
            name={isEditing ? "checkmark-circle" : "create-outline"}
            size={28}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Grid of Notes */}
      {loading ? (
        <ActivityIndicator size="large" color="white" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.listId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}

          // Pull to refresh logic
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white" // iOS Spinner Color
              colors={['#718F64']} // Android Spinner Color
            />
          }

          // Fallback when don't have list
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
              onPress={() => {
                if (isEditing) {
                  openModal(item); // Edit Mode: Rename
                } else {
                  router.push({  // Normal Mode: Navigate
                    pathname: "./detail_list",
                    params: {
                      listId: item.listId,
                      title: item.listName,
                      userRole: item.role,
                    }
                  });
                }
              }}

              actionIcon={isEditing ? "trash-outline" : "person-add-outline"}

              // Handle the action press
              onActionPress={() => {
                if (isEditing) {
                  handleDelete(item.listId, item.listName);
                } else {
                  handleOpenShareModal(item.listId);
                }
              }}

              // Visual cue for edit mode (Optional: make it wiggle or dim)
              style={isEditing ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : {}}
            />
          )}
        />
      )}

      {/* "New List" Button */}
      {!isEditing && (
        <TouchableOpacity
          style={styles.newListButton}
          onPress={() => openModal(null)}
        >
          <Text style={styles.newListText}>NEW LIST</Text>
        </TouchableOpacity>
      )}

      {/* Create List Modal */}
      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingListId ? "Rename List" : "New List"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Party Shopping"
              value={listNameInput}
              onChangeText={setListNameInput}
              autoFocus={true}
            />

            {/* Only show Color Picker for New Lists */}
            {!editingListId && (
              <>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorRow}>
                  {COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.selectedColor]}
                      onPress={() => setSelectedColor(c)}
                    />
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.createBtn} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="white" /> : (
                <Text style={styles.createBtnText}>
                  {editingListId ? "Save Changes" : "Create List"}
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SHARE MODAL */}
      <CollaboratorModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        data={currentListMeta}
        currentUserId={currentUserId}
        onInvite={handleShare}
        onRemove={handleRemove}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  // ==========================================
  // 1. MAIN SCREEN LAYOUT
  // ==========================================
  screenContainer: {
    flex: 1,
    backgroundColor: '#718F64', // Moss Green
    paddingTop: 50, // Status bar spacing
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the bottom floating button
  },
  row: {
    justifyContent: 'space-between', // Keeps notes spaced evenly
    marginBottom: 15, // Space between rows
  },

  // ==========================================
  // 2. HEADER
  // ==========================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 20,
    height: 50,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ==========================================
  // 3. EMPTY STATE
  // ==========================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
    opacity: 0.9,
  },
  emptyText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 5,
  },

  // ==========================================
  // 4. FLOATING "NEW LIST" BUTTON
  // ==========================================
  newListButton: {
    backgroundColor: 'white',
    marginHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    // Shadow for visibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  newListText: {
    color: '#718F64',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },

  // ==========================================
  // 5. MODAL BASE
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker dim for better focus
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 30,
    minHeight: 450,
    paddingBottom: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },

  // ==========================================
  // 6. FORM INPUTS & LABELS
  // ==========================================
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#555',
    marginTop: 10
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    marginTop: 10
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 15,
    fontSize: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#EEE',
    color: '#333',
  },

  // ==========================================
  // 7. LIST ITEMS (COLLABORATORS)
  // ==========================================
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CFD8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  userName: {
    fontSize: 16,
    color: '#333',
    maxWidth: '85%'
  },

  // ==========================================
  // 8. COLOR PICKER
  // ==========================================
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedColor: {
    borderWidth: 4,
    borderColor: '#718F64',
    transform: [{ scale: 1.1 }], // Slight pop effect
  },

  // ==========================================
  // 9. BUTTONS (PRIMARY & CANCEL)
  // ==========================================
  createBtn: {
    backgroundColor: '#718F64',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    // Optional: Flex props in case you add icons inside
    flexDirection: 'row',
    justifyContent: 'center',
  },
  createBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  cancelBtn: {
    padding: 18,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    width: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE'
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: 'bold'
  },
});