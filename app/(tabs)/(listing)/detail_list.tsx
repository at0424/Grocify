import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import { fetchCollaborators, fetchGroceryListDetails, removeCollaborator, shareList, toggleGroceryItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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

  const handleMarkAll = async () => {
    if (items.length === 0) return;

    const allAreChecked = items.every(item => item.checked);
    const targetStatus = !allAreChecked;

    const oldItems = [...items];

    const updatedItems = items.map(item => ({
      ...item,
      checked: targetStatus
    }));
    setItems(updatedItems);

    try {
      const result = await toggleGroceryItem(listId, targetStatus, currentUserId);
      if (!result || !result.success) throw new Error("Batch update failed on server");
      if (result.items) setItems(result.items);
    } catch (error) {
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

    console.log(grouped)

    return Object.keys(grouped).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [items]);

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isChecked = item.checked || false;

    return (
      <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.7} style={styles.itemContainer}>
        <View style={styles.mainRow}>

          {/* Left Side: Bullet and Text */}
          <View style={styles.leftSide}>
            <View style={styles.pixelBullet} />
            <Text style={[styles.itemText, isChecked && styles.itemTextMuted]}>
              {item.name}
            </Text>
          </View>

          {/* Right Side: Quantity and Pixel Checkbox */}
          <View style={styles.rightSide}>
            <Text style={styles.quantityText}>x {item.quantity || 1}</Text>

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
                source={require('@/components/images/ExitButton.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Title */}
            <TouchableOpacity onPress={handleOpenModal} activeOpacity={0.8} style={styles.titleWrapper}>
              <ImageBackground
                source={require('@/assets/images/listing/WoodenPanel.png')}
                style={styles.titlePlaque}
                imageStyle={{ borderRadius: 6 }}
              >
                <Text style={styles.plaqueTitle} numberOfLines={2}>{title || "Unnamed List"}</Text>
              </ImageBackground>
            </TouchableOpacity>

            {/* Mark All Button */}
            <TouchableOpacity style={styles.toggleTrack} onPress={handleMarkAll} activeOpacity={0.8}>
                    <View style={[styles.toggleThumb, allItemsChecked ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
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
              <Ionicons name="add" size={36} color="#3E2723" />
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
const isTabletView = width > 600;

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
    width: '100%',
    alignSelf: 'center',
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '5%',
    paddingHorizontal: '5%',
    paddingTop: '5%',
    zIndex: 2,
  },
  iconButton: {
    height: '50%',
    aspectRatio: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  // CSS STICKY NOTE
  // =================================================
  noteWrapper: {
    flex: 1,
    marginTop: '9%',
    marginHorizontal: '8%',
    marginBottom: '15%',
    
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
    // Removed horizontal padding here so the category banner spans full width
  },

  // =================================================
  // TOGGLE SWITCH (Pixel Style)
  // =================================================
  toggleTrack: {
    width: 44,
    height: 24,
    backgroundColor: '#D7A86E',
    borderWidth: 3,
    borderColor: '#8B5A2B',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 14,
    height: 14,
    backgroundColor: '#FFF8DC',
    borderWidth: 2,
    borderColor: '#3E2723',
    borderRadius: 4, 
  },
  toggleThumbLeft: {
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
    backgroundColor: '#718F64', 
  },

  // =================================================
  // SECTION HEADERS (Categories)
  // =================================================
  sectionHeader: {
    backgroundColor: 'rgba(158, 189, 126, 0.6)', // Greenish transparent banner
    paddingVertical: 6,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(113, 143, 100, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  sectionHeaderText: {
    fontSize: isTabletView ? 24 : 18,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
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
    paddingHorizontal: 15, // Added padding back here since we removed it from noteContent
    position: 'relative',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pixelBullet: {
    width: 8,
    height: 8,
    backgroundColor: '#3E2723',
    marginRight: 12,
  },
  itemText: {
    fontSize: isTabletView ? 22 : 16,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
  },
  itemTextMuted: {
    opacity: 0.5,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: isTabletView ? 18 : 14,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    marginRight: 15,
    includeFontPadding: false,
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
    width: '95%',
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
    width: 65,
    height: 65,
    backgroundColor: '#D7A86E', 
    borderWidth: 4,
    borderColor: '#8B5A2B',
    borderRadius: 16, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
});