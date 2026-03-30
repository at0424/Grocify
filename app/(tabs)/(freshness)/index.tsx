import { getUserId } from '@/amplify/auth/authService';
import LoadingPage from '@/components/LoadingScreen';
import { fetchFridgeItems, fetchUserLists, updateFridgeItem } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const calculateTimeRemaining = (expiryDateString) => {
    if (!expiryDateString) return { value: 0, unit: 'expired' };
    const diffMs = new Date(expiryDateString) - new Date();
    if (diffMs <= 0) return { value: 0, unit: 'expired' };
    if (diffMs < (1000 * 60 * 60 * 24)) return { value: Math.ceil(diffMs / (1000 * 60 * 60)), unit: 'hours' };
    return { value: Math.ceil(diffMs / (1000 * 60 * 60 * 24)), unit: 'days' };
};

const getBadgeStatus = (timeData) => {
    const { value, unit } = timeData;
    if (unit === 'expired') return { color: '#D32F2F', label: 'EXPIRED' };
    if (unit === 'hours') return { color: value < 12 ? '#D32F2F' : '#F57C00', label: `${value}h` };
    if (value <= 3) return { color: '#F57C00', label: `${value}d` };
    return { color: '#388E3C', label: `${value}d` };
};

// ==========================================
// SUB-COMPONENT: FRIDGE ITEM
// ==========================================
const FridgeItem = ({ item, onPress }) => {
    const timeData = calculateTimeRemaining(item.expiryDate);
    const status = getBadgeStatus(timeData);
    const imageSource = item.imageUrl && item.imageUrl.trim() !== ''
        ? { uri: item.imageUrl }
        : require('@/assets/images/Apple.png');

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
            {/* Timer Badge */}
            <View style={[styles.timerBadge, { borderColor: status.color }]}>
                <Ionicons
                    name={timeData.unit === 'expired' || timeData.unit === 'hours' ? "alert-circle" : "time-outline"}
                    size={10}
                    color={status.color}
                />
                <Text style={[styles.timerText, { color: status.color }]}>{status.label}</Text>
            </View>

            {/* Item Image */}
            <Image source={imageSource} style={styles.itemImage} resizeMode="contain" />

            {/* NEW: Wooden Name Tag */}
            <ImageBackground
                source={require('@/assets/images/freshness/ItemNameTag.png')}
                style={styles.nameTagBackground}
                imageStyle={styles.nameTagImage}
            >
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </ImageBackground>
        </TouchableOpacity>
    );
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
const FreshnessDashboard = () => {
    const router = useRouter();

    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allItems, setAllItems] = useState([]);
    const [userLists, setUserLists] = useState([]);
    const [selectedListId, setSelectedListId] = useState('ALL');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    // --- Data Fetching ---
    useEffect(() => {
        const fetchId = async () => {
            try {
                setUserId(await getUserId());
            } catch (error) {
                console.error("Error getting user ID:", error);
                setLoading(false);
            }
        };
        fetchId();
    }, []);

    useEffect(() => {
        const loadUnifiedFridge = async () => {
            if (!userId) return;
            try {
                const lists = await fetchUserLists(userId);
                const safeLists = Array.isArray(lists) ? lists : [];
                setUserLists(safeLists);

                if (safeLists.length === 0) {
                    setAllItems([]);
                    return;
                }

                const results = await Promise.all(safeLists.map(list => fetchFridgeItems(list.listId)));
                const mergedItems = results.flatMap(res => res?.items || res?.data || []);

                setAllItems(mergedItems.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)));
            } catch (error) {
                console.error("Failed to load fridge:", error);
                Alert.alert("Error", "Could not load fridge items.");
            } finally {
                setLoading(false);
            }
        };
        loadUnifiedFridge();
    }, [userId]);

    // --- Derived Data ---
    const displayedItems = selectedListId === 'ALL'
        ? allItems
        : allItems.filter(item => item.listId === selectedListId);

    const groupedItems = displayedItems.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        acc[category] = acc[category] || [];
        acc[category].push(item);
        return acc;
    }, {});

    const displayCategories = Object.keys(groupedItems);

    // --- Action Handlers ---
    const handleItemPress = (item) => {
        setSelectedItem(item);
        setTempDate(new Date(item.expiryDate));
        setModalVisible(true);
    };

    const handleConsume = async () => {
        if (!selectedItem) return;
        setAllItems(prev => prev.filter(i => i.itemId !== selectedItem.itemId));
        setModalVisible(false);
        await updateFridgeItem(selectedItem.listId, selectedItem.itemId, 'CONSUME');
    };

    const saveNewDate = async () => {
        if (!selectedItem) return;
        setAllItems(prev => {
            const updated = prev.map(item => item.itemId === selectedItem.itemId
                ? { ...item, expiryDate: tempDate.toISOString() }
                : item
            );
            return updated.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        });
        setModalVisible(false);
        await updateFridgeItem(selectedItem.listId, selectedItem.itemId, 'UPDATE_DATE', tempDate.toISOString());
    };

    // --- Render Loading State ---
    if (loading) return (
        <LoadingPage/>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ImageBackground source={require('@/assets/images/freshness/FridgeBG.png')} style={styles.background} resizeMode="stretch">
                <SafeAreaView style={styles.safeArea}>

                    {/* FRIDGE SELECTOR HEADER */}
                    <View style={styles.headerContainer}>
                        <View style={styles.filterWrapper}>
                            <ImageBackground source={require('@/assets/images/freshness/SelectorPanel.png')} style={styles.woodPanelBackground} imageStyle={styles.woodPanelImage} resizeMode="stretch">

                                <View style={styles.titleRow}>
                                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                        <Image source={require('@/components/images/BackButton.png')} style={styles.backButton} resizeMode="contain" />
                                    </TouchableOpacity>
                                    <Text style={styles.boardTitle}>FRIDGE SELECTOR</Text>
                                    <View style={styles.backButton} />
                                </View>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ width: '100%' }}
                                    contentContainerStyle={styles.filterContainer}
                                >
                                    <TouchableOpacity style={[styles.filterChip, selectedListId === 'ALL' && styles.filterChipActive]} onPress={() => setSelectedListId('ALL')}>
                                        <Text style={[styles.filterText, selectedListId === 'ALL' && styles.filterTextActive]}>All Fridges</Text>
                                    </TouchableOpacity>
                                    
                                    {userLists.map((list) => (
                                        <TouchableOpacity key={list.listId} style={[styles.filterChip, selectedListId === list.listId && styles.filterChipActive]} onPress={() => setSelectedListId(list.listId)}>
                                            <Text style={[styles.filterText, selectedListId === list.listId && styles.filterTextActive]}>{list.listName}</Text>
                                        </TouchableOpacity>
                                    ))}

                                    <View style={{ width: 40 }} />
                                    
                                </ScrollView>
                                

                            </ImageBackground>
                        </View>
                    </View>

                    {/* MAIN INVENTORY SHELVES */}
                    <ScrollView style={styles.mainVerticalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainScrollContent}>
                        {displayCategories.map((category) => (
                            <View key={category} style={styles.shelfRowContainer}>
                                <ImageBackground
                                    source={require('@/assets/images/listing/TitlePanel.png')}
                                    style={styles.categoryPanelBackground}
                                    imageStyle={styles.categoryPanelImage}
                                >
                                    <Text style={styles.categoryTitle}>{category}</Text>
                                </ImageBackground>

                                <View style={styles.shelfWrapper}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfHorizontalScroll}>
                                        {groupedItems[category].map((item, index) => (
                                            <FridgeItem key={`${item.itemId}-${index}`} item={item} onPress={handleItemPress} />
                                        ))}
                                    </ScrollView>

                                    <Image source={require('@/assets/images/freshness/FridgePanel.png')} style={styles.shelfImage} resizeMode="stretch" />
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                </SafeAreaView>
            </ImageBackground>

            {/* MANAGEMENT MODAL */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>

                        <Image
                            source={require('@/assets/images/freshness/FreshnessModal.png')}
                            style={styles.modalBackgroundImage}
                        />
                        <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
                        <Text style={styles.modalSubtitle}>Manage Item</Text>

                        <View style={styles.dateSection}>
                            <Text style={styles.label}>Expiry Date:</Text>
                            {Platform.OS === 'android' && (
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                                    <Text style={styles.dateText}>{tempDate.toDateString()}</Text>
                                </TouchableOpacity>
                            )}
                            {(showDatePicker || Platform.OS === 'ios') && (
                                <DateTimePicker value={tempDate} mode="date" display="default" onChange={(e, date) => { setShowDatePicker(Platform.OS === 'ios'); setTempDate(date || tempDate); }} style={{ width: 120 }} />
                            )}
                        </View>

                        {/* Custom Green Save Button */}
                        <TouchableOpacity style={styles.imageButtonContainer} onPress={saveNewDate}>
                            
                            <Image
                                source={require('@/assets/images/freshness/GreenButton.png')} 
                                style={styles.imageButton}
                                resizeMode="stretch"
                            />
                                <Text style={styles.saveButtonText}>Save New Date</Text>
        
                        </TouchableOpacity>

                        {/* Custom Orange Consume Button */}
                        <TouchableOpacity style={styles.imageButtonContainer} onPress={handleConsume}>
                            
                            <Image
                                source={require('@/assets/images/freshness/OrangeButton.png')} 
                                style={styles.imageButton}
                                resizeMode="stretch"
                            />
                                <Text style={styles.consumeText}>Mark as Consumed</Text>
                           
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ==========================================
// STYLES
// ==========================================
const { width, height } = Dimensions.get('window');
const isTabletView = width > 600;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    safeArea: {
        flex: 1,
    },

    // Header & Filters
    headerContainer: {
        zIndex: 20,
        width: '100%'
    },
    filterWrapper: {
        width: '100%',
        flexGrow: 1
    },
    woodPanelBackground: {
        paddingTop: 12,
        paddingBottom: 22,
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    woodPanelImage: {
        borderRadius: 8,
    },
    boardTitle: {
        color: '#fff',
        fontSize: isTabletView ? 20 : 14,
        fontFamily: 'PixelFont',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        elevation: 2,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    filterContainer: {
        paddingHorizontal: 20,
        alignItems: 'center',
        paddingRight: 40
    },
    filterChip: {
        backgroundColor: 'rgba(60, 30, 10, 0.5)',
        paddingHorizontal: 20,
        height: isTabletView ? 60 : 50,
        borderRadius: 6,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#4a2f1d',
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#e6c280',
        borderColor: '#ffdd77',
    },
    filterText: {
        fontSize: isTabletView ? 10 : 8,
        fontFamily: 'PixelFont',
        color: '#eaddcf',
        textAlign: 'center',
        includeFontPadding: false
    },
    filterTextActive: {
        color: '#4a2f1d',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: '5%'
    },
    backButton: {
        marginRight: 8,
        height: isTabletView ? 60 : 40,
        aspectRatio: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },

    // Shelves Layout
    mainVerticalScroll: {
        flex: 1,
        paddingHorizontal: 15,
    },
    mainScrollContent: {
        paddingBottom: 40,
    },
    shelfRowContainer: {
        marginBottom: 25,
    },
    categoryPanelBackground: {
        alignSelf: 'flex-start',
        marginLeft: 10,
        marginBottom: 5,
        paddingHorizontal: 16,
        paddingVertical: isTabletView ? 14 : 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    categoryPanelImage: {
        resizeMode: 'stretch',
    },
    categoryTitle: {
        fontSize: isTabletView ? 14 : 12,
        fontFamily: 'PixelFont',
        color: '#3E2723',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    shelfWrapper: {
        position: 'relative',
        height: isTabletView ? 140 : 110,
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    shelfHorizontalScroll: {
        paddingLeft: 10,
        paddingRight: 20,
        alignItems: 'flex-end',
        paddingBottom: 15,
        gap: isTabletView ? 30 : 10,
    },
    shelfImage: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 25,
        zIndex: -1,
    },

    // --- Individual Item Styles ---
    itemContainer: {
        alignItems: 'center',
        width: 75, // Slightly wider to accommodate the name tag
        marginRight: 10,
        position: 'relative',
        zIndex: 2,
    },
    itemImage: {
        height: isTabletView ? 80 : 55,
        aspectRatio: 1,
        zIndex: 2,
        marginBottom: -4,
    },

    // Name Tag Styles
    nameTagBackground: {
        width: isTabletView ? 80 : 75,
        height: isTabletView ? 30 : 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        zIndex: 1, // Keeps it behind the item image if they overlap
    },
    nameTagImage: {
        resizeMode: 'stretch',
    },
    itemName: {
        fontSize: isTabletView ? 12 : 10,
        color: '#4a2f1d',
        fontWeight: 'bold',
        textAlign: 'center',
        paddingHorizontal: 6,
        paddingBottom: 4, // Nudges the text up to fit in the plaque's center
    },

    // Timer Badge
    timerBadge: {
        position: 'absolute',
        top: -8,
        right: 2,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1.5,
        paddingHorizontal: isTabletView ? 7 : 4,
        paddingVertical: isTabletView ? 3 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        elevation: 2,
    },
    timerText: {
        fontSize: 9,
        fontWeight: 'bold',
        marginLeft: 2,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContainer: {
        width: width * 0.9,
        height: height * 0.6,
        minHeight: 320,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    modalBackgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        resizeMode: 'stretch',
        zIndex: 0,
    },
    modalTitle: {
        fontSize: isTabletView ? 26 : 20,
        fontFamily: 'PixelFont',
        color: '#3E2723',
        marginBottom: 8,
        textAlign: 'center'
    },
    modalSubtitle: {
        fontSize: isTabletView ? 18 : 14,
        fontFamily: 'PixelFont',
        color: '#8D6E63',
        marginBottom: 25,
    },
    dateSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    label: {
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 18 : 12,
        color: '#3E2723', 
        marginRight: 5,
    },
    dateButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(141, 110, 99, 0.15)', // Soft dirt/paper color
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D7CCC8',
    },
    dateText: {
        color: '#3E2723',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },

    // Custom Buttons
    imageButtonContainer: {
        width: '100%',
        height: '15%', 
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageButton: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: '80%',
        height: isTabletView ? 70 : 50 
    },
    imageButtonBackground: {
        resizeMode: 'stretch',
    },
    saveButtonText: {
        color: 'black',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 12,
    },
    consumeText: {
        color: 'black',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 12,
    },
    closeButton: {
        marginTop: 10,
        paddingVertical: 10, // Easier to tap
        paddingHorizontal: 20,
    },
    closeText: {
        color: '#8D6E63',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 12,
        textDecorationLine: 'underline',
    },
});

export default FreshnessDashboard;