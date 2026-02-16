import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import { fetchCollaborators, fetchGroceryListDetails, removeCollaborator, shareList, toggleGroceryItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { listId, title, userRole } = useLocalSearchParams();

  // Data States
  const [items, setItems] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh state

  // Modal States (NEW)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ collaborators: [], ownerEmail: '', myRole: '' });

  // Refresh Screen
  const loadItems = async (isPullToRefresh = false) => {
    // Only show big spinner on initial load
    if (!isPullToRefresh && items.length === 0) setLoading(true);

    try {
      const uid = await getUserId();
      setCurrentUserId(uid);

      const [groceryData, collabData] = await Promise.all([
        fetchGroceryListDetails(listId),
        fetchCollaborators(listId, uid)
      ]);

      // Handle Grocery Items
      if (groceryData.items) {
        setItems(groceryData.items);
      } else {
        setItems(groceryData); // Legacy fallback
      }

      // Handle Collaborators
      if (collabData.success) {
        setCollaborators(collabData.collaborators || []); // Updates the count bubble

        setModalData({
          collaborators: collabData.collaborators,
          ownerEmail: collabData.ownerEmail,
          myRole: collabData.requesterRole
        });
      }

    } catch (e) {
      console.log("Error loading data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Immediate Load (Show Spinner)
      loadItems();

      // Start Polling (The "Heartbeat")
      // Every 5000ms (5 seconds), fetch data silently
      // const intervalId = setInterval(() => {
      //   console.log("Heartbeat: Checking for friend's updates...");
      //   loadItems(true); 
      // }, 5000);

      // Stop polling when unfocus
      // return () => {
      //   clearInterval(intervalId);
      //   console.log("Polling stopped");
      // };
    }, [listId])
  );


  // Handle Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadItems(true); // true = isPullToRefresh
  };

  // Handler for toggling
  const handleToggle = async (targetItem) => {
    // Optimistic Update (Update UI immediately before Server responds)
    const newItems = items.map(i => {
      if (i.itemId === targetItem.itemId) {
        return { ...i, checked: !i.checked }; // Flip it locally
      }
      return i;
    });
    setItems(newItems);

    // Call Backend to save
    await toggleGroceryItem(listId, targetItem.itemId, currentUserId);
  };

  // Mark All Handler
  const handleMarkAll = async () => {
    if (items.length === 0) return;

    // 1. Determine Target Status
    const allAreChecked = items.every(item => item.checked);
    const targetStatus = !allAreChecked; // If all checked, uncheck. Else, check all.

    // Optimistic Update (Instant UI Feedback)
    const updatedItems = items.map(item => ({
      ...item,
      checked: targetStatus
    }));
    setItems(updatedItems); // UI updates instantly!

    // Filter only items that actually need changing
    const itemsToUpdate = items.filter(item => !!item.checked !== targetStatus);
    
    console.log(`Syncing ${itemsToUpdate.length} items to backend...`);

    // Send requests in Batches of 3 
    const BATCH_SIZE = 3;
    for (let i = 0; i < itemsToUpdate.length; i += BATCH_SIZE) {
        const chunk = itemsToUpdate.slice(i, i + BATCH_SIZE);
        
        try {
            // Process this chunk in parallel
            await Promise.all(
                chunk.map(item => toggleGroceryItem(listId, item.itemId, currentUserId))
            );
            
            // Tiny pause to let the server breathe (50ms)
            await new Promise(r => setTimeout(r, 50));
            
        } catch (error) {
            console.error("Batch sync failed", error);
            // Optional: Revert UI if it fails? 
            // Usually simpler to just silently fail or show a toast at the end.
        }
    }
    
    console.log("Sync Complete");
  };

  const handleOpenModal = async () => {
    const uid = await getUserId();
    // Use the new API to get emails
    const data = await fetchCollaborators(listId, uid);

    if (data.success) {
      setModalData({
        collaborators: data.collaborators,
        ownerEmail: data.ownerEmail,
        myRole: data.requesterRole
      });
      setModalVisible(true);
    } else {
      Alert.alert("Error", "Could not load members.");
    }
  };

  // Handle invite collaborator
  const handleInvite = async (emailToInvite) => {
    const result = await shareList(listId, emailToInvite);

    if (result.success) {
      Alert.alert("Success", "User added!");

      // Refresh both the main screen (for count) and the modal data
      loadItems(true);
      handleOpenModal(); // Refetch modal data to show new email immediately
      return true;
    } else {
      Alert.alert("Failed", result.message || "Could not find user.");
      return false;
    }
  };


  // Handle remove collaborator
  const handleRemove = (idToRemove) => {
    const isLeaving = idToRemove === currentUserId;

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
          const result = await removeCollaborator(listId, idToRemove, currentUserId);
          if (result.success) {
            if (isLeaving) {
              // If I left, I should be navigated back to dashboard
              router.back();
            } else {
              // If I removed someone else, refresh data
              loadItems(true);
              handleOpenModal();
            }
          } else {
            Alert.alert("Error", result.message || "Operation failed.");
          }
        }
      }
    ]);
  };

  // For each item in the list
  const renderItem = ({ item }) => {
    const isChecked = item.checked || false;

    return (
      <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.7}>
        <View style={[styles.itemRow, isChecked && { opacity: 0.6 }]}>

          {/* Main Row Content */}
          <View style={styles.mainRow}>
            <View style={styles.leftSide}>
              {/* Bullet turns Green when checked */}
              <View style={[styles.bulletPoint, isChecked && { backgroundColor: '#718F64' }]} />

              <Text style={[styles.itemText, isChecked && styles.strikethrough]}>
                {item.name}
              </Text>
            </View>

            <View style={styles.rightSide}>
              <Text style={styles.quantityText}>{item.quantity}</Text>
            </View>
          </View>

          {/* THE CROSS LINE (The "Gummy Bear" scratch-out effect) */}
          {isChecked && <View style={styles.crossLine} />}

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title || "Unnamed List"}</Text>

        <TouchableOpacity
          style={styles.avatarStack}
          onPress={handleOpenModal}
        >
          {/* Show count of team members */}
          <View style={[styles.avatar, { backgroundColor: '#718F64', right: 0, zIndex: 2, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {collaborators.length + 1}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: '#A5D6A7', right: 12, zIndex: 1 }]} />
        </TouchableOpacity>

        {/* Mark All Button */}
        {items.length > 0 && (
          <View style={styles.actionBar}>
            <TouchableOpacity onPress={handleMarkAll} style={styles.markAllButton}>
              <Ionicons
                name={items.every(i => i.checked) ? "remove-circle-outline" : "checkmark-done-circle-outline"}
                size={20}
                color="#555"
              />
              <Text style={styles.markAllText}>
                {items.every(i => i.checked) ? "Unmark All" : "Mark All"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#718F64" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => index.toString()} // Use unique ID if available later
          renderItem={renderItem}
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

          // The Empty State You Requested
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>List Empty!</Text>
              <Text style={styles.emptySubtitle}>Please add some items to get started.</Text>
            </View>
          }
        />
      )}

      {/* --- Floating Action Button (+) --- */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({
          pathname: "./grocery_item",
          params: {
            listId: listId,
            title: title
          }
        })}
      >
        <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

      {/* Collaborator Modal */}
      <CollaboratorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={modalData}
        currentUserId={currentUserId}
        onInvite={handleInvite}
        onRemove={handleRemove}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  // =================================================
  // MAIN CONTAINER
  // =================================================
  container: {
    flex: 1,
    backgroundColor: '#FFF9C4', // The Pale Sticky Note Yellow
    paddingTop: 50, // Status bar spacing
  },

  // =================================================
  // HEADER
  // =================================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'System',
    color: '#333',
    flex: 1,
    marginLeft: 10,
    textAlign: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    width: 50,
    height: 30,
    position: 'relative',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FFF9C4', // Matches background for "cutout" effect
    position: 'absolute',
  },
  // =================================================
  // MARK ALL BUTTON
  // =================================================
  actionBar: {
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'flex-end', // Aligns button to the right
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  markAllText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },

  // =================================================
  // LIST CONTENT
  // =================================================
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding at bottom for the FAB
  },

  // =================================================
  // ITEM ROWS
  // =================================================
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.4)', // Slight highlight for readability
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between'
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginRight: 12,
  },
  itemText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },

  // =================================================
  // STRIKETHROUGH / CHECKED STATE
  // =================================================
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.5,
  },
  crossLine: {
    position: 'absolute',
    height: 1, // Thickness of the line
    backgroundColor: 'black', // Color of the ink
    width: '90%', // Length of the line
    top: '50%', // Centers it vertically
    left: 20, // Adjust start position
    opacity: 0.6, // Makes it look like pen ink
    transform: [{ rotate: '-1deg' }] // Slight tilt for realistic handwriting feel
  },

  // =================================================
  // EMPTY STATE
  // =================================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#777',
    fontStyle: 'italic',
  },

  // =================================================
  // FLOATING ACTION BUTTON (FAB)
  // =================================================
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCE775', // Pop color (Green/Yellow)
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});