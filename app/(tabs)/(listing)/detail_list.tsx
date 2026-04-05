import { getUserId } from '@/amplify/auth/authService';
import CollaboratorModal from '@/components/CollaboratorModal';
import VoiceInputModal from '@/components/VoiceInputModal';
import { addListItems, batchAddListItems, batchToggleGroceryItem, connectGroceryListSocket, fetchCollaborators, fetchGroceryCatalog, fetchGroceryListDetails, removeCollaborator, shareList, toggleGroceryItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, ImageBackground, Modal, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { listId, title, userRole, color } = useLocalSearchParams();

  // --- Backend URL ---
  const SERVER_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // --- States ---
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

  // Voice State
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // ==========================================
  // WEBSOCKET SETUP & DATA LOADING
  // ==========================================
  const wsRef = useRef(null);

  useEffect(() => {
    if (!listId) return;

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

    const setupSocket = async () => {
      wsRef.current = await connectGroceryListSocket(listId, handleIncomingMessage);
    };

    setupSocket();

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

  // ==========================================
  // AI TOOL EXECUTION & VOICE HANDLER
  // ==========================================

  const executeLocalTool = async (fnName, args) => {
      console.log(`[ListingDetail] Executing tool locally: ${fnName}`);

      switch (fnName) {
        case 'fetch_grocery_catalog': 
            return { 
                success: true, 
                catalog: await fetchGroceryCatalog() 
            };
          case 'add_single_list_item':
              return { 
                  success: true, 
                  data: await addListItems(
                      listId, 
                      args.item, 
                      args.quantity || "1", 
                      args.category || "Uncategorized", 
                      args.shelfLife || "7"
                  ) 
              };
          case 'add_multiple_list_items':
              return { 
                  success: true, 
                  data: await batchAddListItems(listId, args.items) 
              };
          default:
              return { success: false, error: `Tool ${fnName} not recognized on this page.` };
      }
  };

  const handleVoiceComplete = async (transcribedText) => {
    setShowVoiceModal(false);
    if (transcribedText.trim().length === 0) return;

    setLoading(true);

    // Initial engineered prompt
    const engineeredPrompt = `I am currently viewing my grocery list with ID: "${listId}". Please add the following items to this list: "${transcribedText}". You must use either 'add_single_list_item' or 'add_multiple_list_items'. Do not ask for confirmation.`;

    try {
        let isConversationDone = false;
        let currentIntermediateSteps = [];

        // --- START THE LOOP ---
        while (!isConversationDone) {
            const requestBody = {
                message: engineeredPrompt,
                history: [], 
                recipes: [], 
                intermediateSteps: currentIntermediateSteps
            };

            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.action === 'tool_call') {
                const originalPart = data.originalPart;
                const fn = originalPart.functionCall;
                
                // Execute the tool (like fetch_grocery_catalog or add_items)
                const toolResultData = await executeLocalTool(fn.name, fn.args || {});
                
                // Add this result to our history so the AI can see it in the next loop
                currentIntermediateSteps.push({
                    originalPart: originalPart,
                    functionResponse: { name: fn.name, response: toolResultData }
                });

                // If the tool was an 'add' tool, we should refresh our list UI
                if (fn.name.includes('add')) {
                    loadItems(); 
                }

                // The loop continues... it sends the tool results back to the backend
            } 
            else if (data.action === 'reply') {
                // The AI finished all tool calls and sent a final text confirmation
                console.log("AI Task Finished:", data.reply);
                isConversationDone = true;
            } 
            else {
                isConversationDone = true;
            }
        }

    } catch (error) {
        console.error("AI Quick Add Error:", error);
        Alert.alert("Network Error", "Could not connect to the AI assistant.");
    } finally {
        setLoading(false);
    }
};


  // ==========================================
  // LIST HANDLERS
  // ==========================================
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
        const result = await batchToggleGroceryItem(listId, targetStatus, currentUserId);
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

  const groupedItems = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      const cat = item.category || 'Others';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return Object.keys(grouped).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [items]);

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeaderContainer}>
      <ImageBackground source={require('@/assets/images/listing/SectionHeader.png')} style={styles.sectionHeaderBackground} resizeMode="stretch" >
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </ImageBackground>
    </View>
  );

  const renderItem = ({ item }) => {
    const isChecked = item.checked || false;
    return (
      <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.7} style={styles.itemContainer}>
        <View style={styles.mainRow}>
          <View style={styles.leftContent}>
            <View style={styles.nameRow}>
              <View style={styles.pixelBullet} />
              <Text style={[styles.itemText, isChecked && styles.itemTextMuted]}>
                {item.name}
              </Text>
            </View>
            <View style={styles.quantityRow}>
              <Text style={[styles.quantityText, isChecked && styles.itemTextMuted]}>
                x {item.quantity || 1}
              </Text>
            </View>
          </View>
          <View style={styles.rightSide}>
            <View style={styles.pixelCheckbox}>
              {isChecked && <Ionicons name="checkmark-sharp" size={18} color="#3E2723" style={{ marginTop: -2 }} />}
            </View>
          </View>
        </View>
        {isChecked && <View style={styles.crossLine} />}
      </TouchableOpacity>
    );
  };

  const allItemsChecked = items.length > 0 && items.every(i => i.checked);

  // ==========================================
  // VOICE ANIMATION SUB-COMPONENT
  // ==========================================
  const PulseAnimation = () => {
      const wave1 = useRef(new Animated.Value(1)).current;
      const wave2 = useRef(new Animated.Value(1)).current;
      const wave3 = useRef(new Animated.Value(1)).current;

      useEffect(() => {
          const createWave = (anim, delay) => {
              return Animated.loop(
                  Animated.sequence([
                      Animated.delay(delay),
                      Animated.parallel([
                          Animated.timing(anim, { toValue: 2.5, duration: 2000, useNativeDriver: true }),
                      ]),
                      Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
                  ])
              );
          };

          const animations = [
              createWave(wave1, 0),
              createWave(wave2, 600),
              createWave(wave3, 1200)
          ];

          animations.forEach(anim => anim.start());

          return () => { animations.forEach(anim => anim.stop()); };
      }, []);

      return (
          <View style={styles.pulseWrapper}>
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave1 }], opacity: wave1.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave2 }], opacity: wave2.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave3 }], opacity: wave3.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
          </View>
      );
  };

  // ==========================================
  // VOICE OVERLAY RENDER
  // ==========================================
  const renderVoiceModal = () => {
      return (
          <Modal visible={showVoiceModal} animationType="slide" transparent={false}>
              <ImageBackground
                  source={require('@/assets/images/ai/AI_BG.png')}
                  style={styles.voiceModalContainer}
                  resizeMode="cover"
              >
                  <SafeAreaView style={styles.voiceModalSafeArea}>
                      <TouchableOpacity style={styles.voiceCloseButton} onPress={cancelRecording}>
                          <Image
                              source={require('@/components/images/ExitButton.png')}
                              style={{ width: 40, height: 40 }}
                              resizeMode="contain"
                          />
                      </TouchableOpacity>

                      <View style={styles.voiceModalContent}>
                          <Text style={styles.voiceTitleText}>
                              {isRecording ? "I'm listening..." : "Tap mic to speak"}
                          </Text>

                          <View style={styles.micAnimationContainer}>
                              {isRecording && <PulseAnimation />}

                              <TouchableOpacity
                                  onPress={isRecording ? stopRecordingAndProcess : startRecording}
                                  style={styles.bigMicButton}
                              >
                                  <Image
                                      source={
                                          isRecording
                                              ? require('@/components/images/MicOn.png')
                                              : require('@/components/images/MicOff.png')
                                      }
                                      style={styles.bigMicIcon}
                                      resizeMode="contain"
                                  />
                              </TouchableOpacity>
                          </View>

                          <View style={styles.liveTextContainer}>
                              <Text style={styles.liveTextPrompt}>
                                  {liveVoiceText.length > 0 ? `"${liveVoiceText}"` : "..."}
                              </Text>
                          </View>

                          <TouchableOpacity onPress={stopRecordingAndProcess} style={styles.voiceConfirmButtonWrapper}>
                              <ImageBackground
                                  source={require('@/components/images/GeneralBlueButton.png')}
                                  style={styles.voiceConfirmButton}
                                  resizeMode="stretch"
                              >
                                  <Text style={styles.voiceConfirmText}>Done</Text>
                              </ImageBackground>
                          </TouchableOpacity>

                      </View>
                  </SafeAreaView>
              </ImageBackground>
          </Modal>
      );
  };


  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
        
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { left: '5%' }]}>
              <Image source={require('@/components/images/BackButton.png')} style={styles.iconImage} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleOpenModal} activeOpacity={0.8} style={styles.titleWrapper}>
              <Image source={require('@/assets/images/listing/TitlePanel.png')} style={styles.titlePlaque} resizeMode="stretch" />
                <Text style={styles.plaqueTitle} numberOfLines={2}>{title || "Unnamed List"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.markAllWrapper} onPress={handleMarkAll} activeOpacity={0.8}>
              <Image
                source={allItemsChecked ? require('@/components/images/Checkedbox.png') : require('@/components/images/Checkbox.png') }
                style={styles.titlePlaque}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.corkBoardContainer}>
            <Image
              source={require('@/assets/images/main_dashboard/Board.png')}
              style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
              resizeMode="stretch"
            />
            <Image source={require('@/assets/images/listing/Pin.png')} style={styles.pinImage} resizeMode="contain" />

            <View style={[styles.noteWrapper, { backgroundColor: `${color}` || '#FFF9C4' }]}>
              <View style={styles.noteContent}>
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3E2723" />}
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

            {/* --- WOODEN FAB (Manual Add) --- */}
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

            {/* --- VOICE FAB (Voice Add) --- */}
            <TouchableOpacity
              style={styles.voiceFab}
              onPress={() => setShowVoiceModal(true)}
              activeOpacity={0.8}
            >
              <Image
                source={require('@/components/images/MicButton.png')}
                style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            {/* Voice Overlay */}
            <VoiceInputModal
              visible={showVoiceModal}
              onClose={() => setShowVoiceModal(false)}
              onComplete={handleVoiceComplete}
            />

          </View>
        </View>
      </SafeAreaView>

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
  corkBoardContainer: {
    flex: 1,
    width: '100%',
    marginTop: -8,
    zIndex: 1,
  },
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
  listContent: {
    paddingBottom: 80,
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
    alignItems: 'center',
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
    marginTop: isTabletView ? 6 : 4,
  },
  itemText: {
    fontSize: isTabletView ? 16 : 12,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
    lineHeight: isTabletView ? 20 : 16,
  },
  quantityRow: {
    paddingLeft: 20,
    marginTop: 6,
  },
  quantityText: {
    fontSize: isTabletView ? 14 : 11,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
    opacity: 0.8,
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
  crossLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3E2723',
    width: '90%',
    top: '50%',
    left: 20, 
    opacity: 0.8,
    transform: [{ rotate: '-1deg' }]
  },
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
  // FABs (+)
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
  voiceFab: {
    position: 'absolute',
    bottom: '4%',
    left: '6%', 
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
  voiceFabBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DEB887',
    borderWidth: 3,
    borderColor: '#3E2723',
    borderRadius: 8, 
    justifyContent: 'center',
    alignItems: 'center',
  },

  // =================================================
  // NEW VOICE OVERLAY STYLES
  // =================================================
  voiceModalContainer: {
      flex: 1,
      width: '100%',
      height: '100%'
  },
  voiceModalSafeArea: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 20,
  },
  voiceCloseButton: {
      alignSelf: 'flex-end',
      padding: 20,
  },
  voiceModalContent: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 50,
  },
  voiceTitleText: {
      fontSize: isTabletView ? 28 : 22,
      fontFamily: 'PixelFont',
      color: '#5C4033',
      marginBottom: 50,
      textAlign: 'center',
  },
  micAnimationContainer: {
      width: 200,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
  },
  pulseWrapper: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
  },
  pulseCircle: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#E6D5B3', 
  },
  bigMicButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#FFF9E6',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      shadowColor: '#4A3525',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 8,
  },
  bigMicIcon: {
      width: 60,
      height: 60,
  },
  liveTextContainer: {
      width: '80%',
      minHeight: 80,
      padding: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
  },
  liveTextPrompt: {
      fontSize: isTabletView ? 20 : 16,
      fontFamily: 'PixelFont',
      color: '#4A3525',
      textAlign: 'center',
      lineHeight: 24,
  },
  voiceConfirmButtonWrapper: {
      width: 160,
      height: 50,
  },
  voiceConfirmButton: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
  },
  voiceConfirmText: {
      color: '#FFFFFF',
      fontFamily: 'PixelFont',
      fontSize: 16,
      includeFontPadding: false,
      textAlignVertical: 'center'
  }
});