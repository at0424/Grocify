import { getUserId } from '@/amplify/auth/authService';
import { fetchGroceryListDetails, removeCollaborator, shareList, toggleGroceryItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [addMode, setAddMode] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  // Check Ownership
  const isOwner = (userRole === 'owner');
  
  // Refresh Screen
  const loadItems = async (isPullToRefresh = false) => {
    if (!isPullToRefresh && items.length === 0) setLoading(true);

    try {
      // Get your ID
      const uid = await getUserId();
      setCurrentUserId(uid);

      // Fetch Data
      const data = await fetchGroceryListDetails(listId);
      
      // Separate Items from Collaborators
      if (data.items) {
        setItems(data.items);
        setCollaborators(data.collaborators || []); 
      } else {
        setItems(data); // Legacy fallback
      }
    } catch (e) {
      console.log("Error loading items:", e);
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
    await toggleGroceryItem(listId, targetItem.itemId);
  };

  // Handle invite collaborator
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setProcessing(true);

    const result = await shareList(listId, inviteEmail.toLowerCase().trim());
    
    setProcessing(false);
    if (result.success) {
      Alert.alert("Success", "User added!");
      setInviteEmail('');
      setAddMode(false);
      loadItems(true); // Refresh to see new member
    } else {
      Alert.alert("Failed", result.message || "Could not find user.");
    }
  };


  // Handle remove collaborator
  const handleRemove = (idToRemove) => {
    Alert.alert("Remove User?", "This will delete the list from their device.", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: 'destructive',
        onPress: async () => {
            const result = await removeCollaborator(listId, idToRemove, currentUserId);
            if (result.success) {
                // Remove locally immediately for speed
                setCollaborators(prev => prev.filter(id => id !== idToRemove));
            } else {
                Alert.alert("Error", result.message || "Could not remove user.");
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
            onPress={() => setModalVisible(true)}
        >
          {/* Show count of team members */}
          <View style={[styles.avatar, { backgroundColor: '#718F64', right: 0, zIndex: 2, alignItems:'center', justifyContent:'center' }]}>
            <Text style={{color:'white', fontSize: 10, fontWeight:'bold'}}>
                {collaborators.length + 1}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: '#A5D6A7', right: 12, zIndex: 1 }]} />
        </TouchableOpacity>

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
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>List Members</Text>
                    <TouchableOpacity onPress={() => { setModalVisible(false); setAddMode(false); }}>
                        <Ionicons name="close" size={24} color="#888" />
                    </TouchableOpacity>
                </View>

                {/* VIEW 1: MEMBER LIST */}
                {!addMode && (
                    <>
                        <Text style={styles.sectionLabel}>Team</Text>
                        <FlatList 
                            data={collaborators}
                            keyExtractor={(item) => item}
                            ListHeaderComponent={
                                <View style={styles.userRow}>
                                    <View style={styles.userInfo}>
                                        <View style={[styles.userAvatar, {backgroundColor:'#FFD54F'}]}><Ionicons name="star" size={14} color="white"/></View>
                                        <Text style={styles.userName}>Owner</Text>
                                    </View>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.userRow}>
                                    <View style={styles.userInfo}>
                                        <View style={styles.userAvatar}><Ionicons name="person" size={14} color="white"/></View>
                                        <Text style={styles.userName} numberOfLines={1}>{item}</Text>
                                    </View>
                                    
                                    {/* DELETE ICON (Only if Owner) */}
                                    {isOwner && (
                                        <TouchableOpacity onPress={() => handleRemove(item)}>
                                            <Ionicons name="trash-outline" size={20} color="#E53935" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            style={{ maxHeight: 250 }}
                        />
                        
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddMode(true)}>
                            <Ionicons name="person-add" size={18} color="white" style={{marginRight: 8}}/>
                            <Text style={styles.primaryBtnText}>Invite Member</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* VIEW 2: ADD MEMBER */}
                {addMode && (
                    <View>
                        <Text style={styles.sectionLabel}>Enter Email Address</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="friend@gmail.com"
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 20}}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddMode(false)}>
                                <Text style={styles.cancelBtnText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, {marginTop:0, flex:1, marginLeft:10}]} onPress={handleInvite} disabled={processing}>
                                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Send Invite</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </View>
        </View>
      </Modal>

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

  // =================================================
  // MODAL STYLES
  // =================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 25
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    marginTop: 10
  },
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
  primaryBtn: {
    backgroundColor: '#718F64',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelBtn: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    width: 100,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EEE'
  }
});