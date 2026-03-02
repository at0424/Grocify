import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import StickyNote from '@/components/StickyNotes';
import { createNewList, deleteUserList, fetchCollaborators, fetchUserLists, removeCollaborator, shareList, updateUserList } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ListingDashboard() {
  const router = useRouter();
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
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
      // Owner Check
      if (listToEdit.role !== 'owner') {
        Alert.alert("Permission Denied", "Only the owner can rename this list.");
        return; // <--- STOP HERE. Do not open the modal.
      }

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

  // =======================================
  // Animation
  // =======================================

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={styles.screenContainer}>

      {/* Invisible background that closes the modal if tapped outside the board */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => router.back()}
      />

      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >

        {/* Header Bar */}
        <View style={styles.header}>

          {/* Wooden Panel */}
          <Image
            source={require('@/assets/images/listing/WoodenPanel.png')}
            style={styles.woodenPanelImage}
            resizeMode="stretch"
          />

          {/* Exit */}
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { left: '5%' }]}>
            <Image
              source={require('@/components/images/ExitButton.png')}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.titleWrapper}>
            <Image
              source={require('@/assets/images/main_dashboard/GroceriesListTag.png')}
              style={styles.woodenPanelImage}
              resizeMode="stretch"
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={[styles.iconButton, { right: '5%' }]}>
            <Image
              source={
                isEditing
                  ? require('@/components/images/BinButton.png')
                  : require('@/components/images/EditButton.png')
              }
              style={styles.iconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

        </View>

        {/* Cork Board */}
        <View style={styles.corkBoardContainer}>
          <Image
            source={require('@/assets/images/main_dashboard/Board.png')}
            style={[StyleSheet.absoluteFillObject, { width: '100%', height: '90%' }]}
            resizeMode="stretch"
          />

          {/* Grid of Notes */}
          {loading ? (
            <ActivityIndicator size="large" color="#5C4033" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={lists}
              keyExtractor={(item) => item.listId}
              numColumns={2}
              style={{ flex: 1, width: '100%' }}
              columnWrapperStyle={styles.row}
              contentContainerStyle={[
                styles.listContent,
                lists.length === 0 && { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }
              ]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5C4033" />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Image
                    source={require('@/assets/images/listing/EmptyBasket.png')}
                    style={styles.basketImage}
                    resizeMode="contain"
                  />
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
                      openModal(item);
                    } else {
                      router.push({
                        pathname: "./detail_list",
                        params: { listId: item.listId, title: item.listName, userRole: item.role }
                      });
                    }
                  }}
                  actionIcon={isEditing ? "trash-outline" : "person-add-outline"}
                  onActionPress={() => {
                    if (isEditing) {
                      handleDelete(item.listId, item.listName);
                    } else {
                      handleOpenShareModal(item.listId);
                    }
                  }}
                  style={isEditing ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : {}}
                />
              )}
            />
          )}
        </View>

        {/* "New List" Button */}
        <View style={styles.buttonWrapper}>
          {!isEditing && (
            <TouchableOpacity style={styles.newListButton} onPress={() => openModal(null)}>
              <Text style={styles.newListText}>NEW LIST</Text>
            </TouchableOpacity>
          )}
        </View>

      </Animated.View>

      {/* New List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>

          {/* Modal */}
          <ImageBackground
            source={require('@/components/images/Modal.png')}
            style={styles.backgroundImage}
            resizeMode="stretch"
          >

            <View style={styles.modalContent}>

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                
                {/* Placeholder for Format */}
                <View style={{opacity: 0}}>
                  <Image
                    source={require('@/components/images/ExitButton.png')}
                    style={[styles.exitIcon, {marginRight: 0}]}
                  />
                </View>

                {/* Modal Title */}
                <Text style={styles.modalTitle}>
                  {editingListId ? "Rename List" : "New List"}
                </Text>

                {/* Exit Button */}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Image
                    source={require('@/components/images/ExitButton.png')}
                    style={styles.exitIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>


            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Party Shopping"
                value={listNameInput}
                onChangeText={setListNameInput}
                autoFocus={true}
              />

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

          </ImageBackground>
        </KeyboardAvoidingView>
      </Modal>

      {/* Collaborator Modal */}
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

const { width, height } = Dimensions.get('window');
const isTabletView = width > 600;


const styles = StyleSheet.create({
  // ==========================================
  // MAIN SCREEN LAYOUT
  // ==========================================
  screenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '85%',
    alignSelf: 'center',

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
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
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 100,
    paddingTop: 10,
    flexGrow: 1
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  // ==========================================
  // HEADER
  // ==========================================
  header: {
    width: '100%',
    alignSelf: 'center',
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  woodenPanelImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  iconButton: {
    height: '50%',
    aspectRatio: 1,
    alignItems: 'center',
    zIndex: 3,
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
  tagBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  headerTitle: {
    color: '#3E2723',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    zIndex: 1,

    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },

  // ==========================================
  // EMPTY STATE
  // ==========================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'PixelFont',
    color: '#3E2723',
    fontSize: 20,
    marginTop: 15,
    textAlign: 'center',
    maxWidth: '95%'
  },
  emptySubText: {
    fontFamily: 'PixelFont',
    color: 'rgba(62, 39, 35, 0.7)',
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
    maxWidth: '95%'
  },
  basketImage: {
    height: height * 0.1,
    aspectRatio: 1
  },

  // ==========================================
  // FLOATING "NEW LIST" BUTTON
  // ==========================================
  buttonWrapper: {
    position: 'absolute',
    bottom: 0,
    marginHorizontal: '20%',
    width: '60%',
    height: '7%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  newListButton: {
    backgroundColor: '#FFF8DC',
    borderWidth: 3,
    borderColor: '#8B5A2B',
    width: '85%',
    height: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  newListText: {
    color: '#3E2723',
    fontFamily: 'PixelFont',
    fontSize: 18,
    letterSpacing: 1,
    // for android bug
    includeFontPadding: false,
    textAlignVertical: 'center'
  },

  // ==========================================
  // MODAL STATE
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backgroundImage: {
    width: width * 0.9,
    height: height * 0.6,
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '20%',
    marginTop: height * 0.025,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: isTabletView ? 35 : 20,
    fontFamily: 'PixelFont',
    color: '#ffff',
    includeFontPadding: false,
    textAlignVertical: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 20,
  },
  buttonBackground: {
    height: '50%',
    aspectRatio: 1,
  },
  exitIcon: {
    height: '50%',
    aspectRatio: 1,
    marginRight: "5%",
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 20,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: '8%',
    justifyContent: 'flex-start',
    bottom: '28%'
  },
  label: {
    fontSize: isTabletView ? 20 : 14,
    fontFamily: 'PixelFont',
    color: '#8B5A2B',
    marginBottom: 8,
    includeFontPadding: false,
  },
  input: {
    backgroundColor: '#FFF8DC',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#8B5A2B',
    color: '#3E2723',
    fontFamily: 'PixelFont',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  colorCircle: {
    width: "15%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: isTabletView ? 5 : 3,
    borderColor: '#8B5A2B'
  },
  selectedColor: {
    borderColor: '#3E2723',
    transform: [{ scale: 1.1 }]
  },
  createBtn: {
    backgroundColor: '#718F64',
    padding: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#5B764A',
    alignItems: 'center',
    marginTop: 10
  },
  createBtnText: {
    color: 'white',
    fontFamily: 'PixelFont',
    fontSize: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});