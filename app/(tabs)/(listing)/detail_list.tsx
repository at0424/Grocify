import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import { batchToggleGroceryItem, connectGroceryListSocket, fetchCollaborators, fetchGroceryListDetails, removeCollaborator, shareList, toggleGroceryItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ImageBackground, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { listId, title, userRole, color } = useLocalSearchParams();

  // Data States
  const [items, setItems] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ collaborators: [], ownerEmail: '', myRole: '' });

  const wsRef = useRef(null);

  useEffect(() => {
    if (!listId) return;

    // Define what happens when a message arrives
    const handleIncomingMessage = (message) => {
      switch (message.action) {
        case 'ITEM_TOGGLED':
          setItems(prevItems => prevItems.map(item => 
            item.itemId === message.itemId 
              ? { ...item, checked: message.checked } 
              : item
          ));
          break;
        case 'BATCH_TOGGLED':
          setItems(prevItems => prevItems.map(item => ({
            ...item,
            checked: message.checked
          })));
          break;
        case 'LIST_UPDATED':
          loadItems(); 
          break;
      }
    };

    // Initialize the connection
    const setupSocket = async () => {
      wsRef.current = await connectGroceryListSocket(listId, handleIncomingMessage);
    };

    setupSocket();

    // Cleanup: Disconnect when the user leaves the screen
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [listId]);

  const loadItems = async (isPullToRefresh = false) => {
    if (!isPullToRefresh && items.length === 0) setLoading(true);

    try {
      const uid = await getUserId();
      setCurrentUserId(uid);

      const [groceryData, collabData] = await Promise.all([
        fetchGroceryListDetails(listId),
        fetchCollaborators(listId, uid)
      ]);

      if (groceryData.items) {
        setItems(groceryData.items);
      } else {
        setItems(groceryData);
      }

      if (collabData.success) {
        setCollaborators(collabData.collaborators || []);
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
      loadItems();
    }, [listId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadItems(true);
  };

  const handleToggle = async (targetItem) => {
    const newItems = items.map(i => {
      if (i.itemId === targetItem.itemId) {
        return { ...i, checked: !i.checked };
      }
      return i;
    });
    setItems(newItems);
    await toggleGroceryItem(listId, targetItem.itemId, currentUserId);
  };

  // Mark All Handler
  const handleMarkAll = async () => {
    if (items.length === 0) return;

    // Determine Target Logic
    const allAreChecked = items.every(item => item.checked);
    const targetStatus = !allAreChecked; // If all checked -> Unmark All. Else -> Mark All.

    // Optimistic Update (Instant UI Feedback)
    const oldItems = [...items]; // Keep a backup in case the server fails
    
    const updatedItems = items.map(item => ({
      ...item,
      checked: targetStatus
    }));
    setItems(updatedItems); // UI updates instantly!

    console.log(`Sending ONE batch request to set all to ${targetStatus}...`);

    try {
        const result = await batchToggleGroceryItem(listId, targetStatus, currentUserId);
        
        if (!result || !result.success) {
            throw new Error("Batch update failed on server");
        }
        
        console.log("Batch update success!");
        
        if (result.items) {
             setItems(result.items); 
        }

    } catch (error) {
        console.error("Failed:", error);
        Alert.alert("Sync Error", "Could not update list. Reverting changes.");
        setItems(oldItems); 
    }
  };

  const handleOpenModal = async () => {
    const uid = await getUserId();
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

  const handleInvite = async (emailToInvite) => {
    const result = await shareList(listId, emailToInvite);
    if (result.success) {
      Alert.alert("Success", "User added!");
      loadItems(true);
      handleOpenModal();
      return true;
    } else {
      Alert.alert("Failed", result.message || "Could not find user.");
      return false;
    }
  };

  const handleRemove = (idToRemove) => {
    const isLeaving = idToRemove === currentUserId;
    const alertTitle = isLeaving ? "Leave List?" : "Remove User?";
    const message = isLeaving
      ? "Are you sure you want to leave this list?"
      : "This will remove the user from the list.";

    Alert.alert(alertTitle, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: isLeaving ? "Leave" : "Remove",
        style: 'destructive',
        onPress: async () => {
          const result = await removeCollaborator(listId, idToRemove, currentUserId);
          if (result.success) {
            if (isLeaving) {
              router.back();
            } else {
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

  // Group items by category for the SectionList
  const groupedItems = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      // Use the category field if it exists, otherwise default to "Others"
      const cat = item.category || 'Others';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(item);
    });

    return Object.keys(grouped).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [items]);

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeaderContainer}>
      <ImageBackground
        source={require('@/assets/images/listing/SectionHeader.png')} 
        style={styles.sectionHeaderBackground}
        resizeMode="stretch" 
      >
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </ImageBackground>
    </View>
  );

  const renderItem = ({ item }) => {
    const isChecked = item.checked || false;

    return (
      <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.7} style={styles.itemContainer}>
        <View style={styles.mainRow}>

          {/* Left Side: Name and Quantity Column */}
          <View style={styles.leftContent}>
            
            {/* Title Row: Bullet + Item Name */}
            <View style={styles.nameRow}>
              <View style={styles.pixelBullet} />
              <Text style={[styles.itemText, isChecked && styles.itemTextMuted]}>
                {item.name}
              </Text>
            </View>

            {/* Child Row: Quantity */}
            <View style={styles.quantityRow}>
              <Text style={[styles.quantityText, isChecked && styles.itemTextMuted]}>
                x {item.quantity || 1}
              </Text>
            </View>

          </View>

          {/* Right Side: Pixel Checkbox */}
          <View style={styles.rightSide}>
            <View style={styles.pixelCheckbox}>
              {isChecked && <Ionicons name="checkmark-sharp" size={18} color="#3E2723" style={{ marginTop: -2 }} />}
            </View>
          </View>

        </View>

        {/* The scratch-out effect */}
        {isChecked && <View style={styles.crossLine} />}
      </TouchableOpacity>
    );
  };

  const allItemsChecked = items.length > 0 && items.every(i => i.checked);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
        
        <View style={styles.modalContainer}>
          
          {/* Header Bar */}
          <View style={styles.header}>

            {/* Exit/Back Button */}
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { left: '5%' }]}>
              <Image
                source={require('@/components/images/BackButton.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Title */}
            <TouchableOpacity onPress={handleOpenModal} activeOpacity={0.8} style={styles.titleWrapper}>
              <Image
                source={require('@/assets/images/listing/TitlePanel.png')}
                style={styles.titlePlaque}
                resizeMode="stretch"
              />
                <Text style={styles.plaqueTitle} numberOfLines={2}>{title || "Unnamed List"}</Text>
            </TouchableOpacity>

            {/* Mark All Button */}
            <TouchableOpacity style={styles.markAllWrapper} onPress={handleMarkAll} activeOpacity={0.8}>
              
              <Image
                source={
                  allItemsChecked 
                  ? require('@/components/images/Checkedbox.png') 
                  : require('@/components/images/Checkbox.png') 
                }
                style={styles.titlePlaque}
                resizeMode="contain"
              />

            </TouchableOpacity>

          </View>

          {/* Cork Board Container */}
          <View style={styles.corkBoardContainer}>
            <Image
              source={require('@/assets/images/main_dashboard/Board.png')}
              style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
              resizeMode="stretch"
            />

            {/* Pin Image */}
            <Image
              source={require('@/assets/images/listing/Pin.png')} 
              style={styles.pinImage}
              resizeMode="contain"
            />

            {/* The Giant CSS Sticky Note */}
            <View style={[styles.noteWrapper, { backgroundColor: `${color}` || '#FFF9C4' }]}>
              <View style={styles.noteContent}>

                {/* --- LIST CONTENT --- */}
                {loading ? (
                  <ActivityIndicator size="large" color="#3E2723" style={{ marginTop: 50 }} />
                ) : (
                  <SectionList
                    sections={groupedItems}
                    keyExtractor={(item, index) => item.itemId ? item.itemId.toString() : index.toString()}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3E2723" />
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>List Empty!</Text>
                        <Text style={styles.emptySubtitle}>Jot down some groceries...</Text>
                      </View>
                    }
                  />
                )}

              </View>
            </View>

            {/* --- PIXEL WOODEN FAB --- */}
            <TouchableOpacity
              style={styles.pixelFab}
              onPress={() => router.push({
                pathname: "./grocery_item",
                params: { listId: listId, title: title }
              })}
              activeOpacity={0.8}
            >
              <Image
                source={require('@/components/images/AddButton.png')}
                style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
                resizeMode="contain"
              />
            </TouchableOpacity>

          </View>
        </View>

      </SafeAreaView>

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

const { width, height } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
  // ==========================================
  // MAIN SCREEN & WRAPPER LAYOUT
  // ==========================================
  screenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '98%',
    alignSelf: 'center',

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
  },

  // ==========================================
  // HEADER
  // ==========================================
  header: {
    position: 'absolute',
    width: '85%',
    alignSelf: 'center',
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '5%',
    paddingTop: '5%',
    gap: 10,
    zIndex: 2,
  },
  iconButton: {
    height: '100%',
    width: '15%',
    alignItems: 'center',
    zIndex: 3,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  iconImage: {
    width: '100%',
    height: '100%',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 20
  },
  titleWrapper: {
    width: '55%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  titlePlaque: {
    height: '100%',
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  plaqueTitle: {
    fontSize: isTabletView ? 18 : 12,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pinImage: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 5,
    height: '5%',
    aspectRatio: 1,
    top: '2%',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 5,
  },
  markAllWrapper: {
    height: '80%',
    aspectRatio: 1
  },


  // ==========================================
  // CORKBOARD CONTAINER
  // ==========================================
  corkBoardContainer: {
    flex: 1,
    width: '100%',
    marginTop: -8,
    zIndex: 1,
  },

  // =================================================
  // STICKY NOTE
  // =================================================
  noteWrapper: {
    flex: 1,
    marginTop: '9%',
    marginHorizontal: '8%',
    marginBottom: '10%',
    
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  noteContent: {
    flex: 1,
    paddingTop: isTabletView ? 100 : 70,
    paddingBottom: 20, 
  },

  // =================================================
  // SECTION HEADERS (Categories)
  // =================================================
  sectionHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  sectionHeaderBackground: {
    width: '100%', 
    paddingVertical: 12, 
    justifyContent: 'center',
    alignItems: 'center',
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionHeaderText: {
    fontSize: isTabletView ? 24 : 12,
    fontFamily: 'PixelFont',
    color: '#000000', 
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // =================================================
  // LIST CONTENT & ITEMS
  // =================================================
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  itemContainer: {
    marginBottom: 15,
    paddingVertical: 5,
    paddingHorizontal: 15, 
    position: 'relative',
    justifyContent: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically centers the checkbox with the two rows of text
    justifyContent: 'space-between'
  },
  leftContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  pixelBullet: {
    width: 8,
    height: 8,
    backgroundColor: '#3E2723',
    marginRight: 12,
    marginTop: isTabletView ? 6 : 4, // Pushes the bullet down slightly to align with the text
  },
  itemText: {
    fontSize: isTabletView ? 16 : 12,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
    lineHeight: isTabletView ? 20 : 16, // Added explicit line height for better wrapping
  },
  quantityRow: {
    paddingLeft: 20, // Perfectly aligns with the text above (8 width bullet + 12 margin)
    marginTop: 6,
  },
  quantityText: {
    fontSize: isTabletView ? 14 : 11, // Slightly larger than before for readability
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
    opacity: 0.8, // Slightly muted natively to look like a sub-item
  },
  itemTextMuted: {
    opacity: 0.5,
  },
  rightSide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  pixelCheckbox: {
    width: 22,
    height: 22,
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#3E2723',
    borderRadius: 4, 
    justifyContent: 'center',
    alignItems: 'center',
  },

  // =================================================
  // STRIKETHROUGH EFFECT
  // =================================================
  crossLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3E2723',
    width: '90%',
    top: '50%',
    left: 20, // Adjusted due to itemContainer padding
    opacity: 0.8,
    transform: [{ rotate: '-1deg' }]
  },

  // =================================================
  // EMPTY STATE
  // =================================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'PixelFont',
    color: '#8B5A2B',
  },

  // =================================================
  // PIXEL WOODEN FAB (+)
  // =================================================
  pixelFab: {
    position: 'absolute',
    bottom: '4%',
    right: '6%',
    height: '7%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
});