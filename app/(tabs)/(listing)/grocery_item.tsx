import { addListItems, fetchGroceryCatalog, fetchGroceryListDetails } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
    { id: '0', name: 'All', dbValue: 'All', iconSource: require('@/assets/images/listing/icons/AllIcon.png') },
    { id: '1', name: 'Fresh', dbValue: 'Fruits & Vegetables', iconSource: require('@/assets/images/listing/icons/FreshIcon.png') },
    { id: '2', name: 'Meat', dbValue: 'Meat & Fish', iconSource: require('@/assets/images/listing/icons/MeatIcon.png') },
    { id: '3', name: 'Dairy', dbValue: 'Dairy', iconSource: require('@/assets/images/listing/icons/DairyIcon.png') },
    { id: '4', name: 'Bakery', dbValue: 'Bread & Pastries', iconSource: require('@/assets/images/listing/icons/BakeryIcon.png') },
    { id: '5', name: 'Grains', dbValue: 'Grain Products', iconSource: require('@/assets/images/listing/icons/GrainsIcon.png') },
    { id: '6', name: 'Frozen', dbValue: 'Frozen & Convenience', iconSource: require('@/assets/images/listing/icons/FrozenIcon.png') },
    { id: '7', name: 'Snacks', dbValue: 'Snacks & Sweets', iconSource: require('@/assets/images/listing/icons/SnackIcon.png') },
    { id: '8', name: 'Drinks', dbValue: 'Beverages', iconSource: require('@/assets/images/listing/icons/DrinksIcon.png') },
    { id: '9', name: 'Spices', dbValue: 'Ingredients & Spices', iconSource: require('@/assets/images/listing/icons/SpicesIcon.png') },
    { id: '10', name: 'Health', dbValue: 'Care & Health', iconSource: require('@/assets/images/listing/icons/HealthIcon.png') },
    { id: '11', name: 'Home', dbValue: 'Household', iconSource: require('@/assets/images/listing/icons/HomeIcon.png') },
];


export default function AddItemScreen() {
    const router = useRouter();
    const { listId, title } = useLocalSearchParams();
    const listName = title || 'Unnamed List';

    // --- Data States ---
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    // --- UI States ---
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState('');

    // --- Logic States ---
    const [cartCounts, setCartCounts] = useState({}); // Tracks { 'Milk': 2, 'Eggs': 1 }
    const [addingId, setAddingId] = useState(null); // For loading spinner on button
    const [recentItems, setRecentItems] = useState([]); // For recently added items

    // --- ANIMATION REFS & STATE ---
    const [flyingImage, setFlyingImage] = useState(null);
    const flyAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const flyScaleAnim = useRef(new Animated.Value(1)).current;
    const flyOpacityAnim = useRef(new Animated.Value(0)).current;
    const listButtonScaleAnim = useRef(new Animated.Value(1)).current;

    // Filtered items for search and category
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Reload recent items
    useFocusEffect(
        useCallback(() => {
            const loadRecents = async () => {
                try {
                    const jsonValue = await AsyncStorage.getItem('@recent_items');
                    if (jsonValue != null) {
                        setRecentItems(JSON.parse(jsonValue));
                    }
                } catch (e) {
                    console.log("Error loading recents: ", e);
                }
            };
            loadRecents();
        }, [])
    );

    // Fetch catalog and current list quantities on load
    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    setLoading(true);

                    // Fetching 
                    const [catalogData, currentListData] = await Promise.all([
                        fetchGroceryCatalog(),
                        listId ? fetchGroceryListDetails(listId) : Promise.resolve([])
                    ]);

                    // Set Catalog
                    setItems(catalogData);

                    // Process current list to get counts
                    const counts = {};
                    if (currentListData && Array.isArray(currentListData)) {
                        currentListData.forEach(item => {
                            // Parse quantity as integer (it might be a string "2")
                            const qty = parseInt(item.quantity) || 0;
                            if (qty > 0) {
                                counts[item.name] = qty;
                            }
                        });
                    }
                    setCartCounts(counts);

                } catch (e) {
                    console.error("Failed to load data: ", e)
                } finally {
                    setLoading(false);
                }
            };

            loadData();
        }, [listId]));

    // Helper to save recent items
    const addToHistory = async (item) => {
        // Remove if exists (to move to front)
        // Add new history || Slice to max 10 items
        try {
            const newHistory = [
                item,
                ...recentItems.filter(i => i.name !== item.name)
            ].slice(0, 10);

            setRecentItems(newHistory);
            await AsyncStorage.setItem('@recent_items', JSON.stringify(newHistory));
        } catch (e) {
            console.log("Error saving results: ", e);
        }
    }

    // Helper to remove from recent items
    const removeFromHistory = async (itemName) => {
        const newHistory = recentItems.filter(i => i.name !== itemName);
        setRecentItems(newHistory);
        await AsyncStorage.setItem('@recent_items', JSON.stringify(newHistory));
    }

    // Handle add item to list
    const handleAddItem = async (e, item) => {
        if (!listId) {
            Alert.alert("Error", "No List ID found. Please go back and reopen the list.");
            return;
        }
        
        const startX = e?.nativeEvent?.pageX || (width / 2);
        const startY = e?.nativeEvent?.pageY || (height / 2);

        setAddingId(item.name); // Show spinner
        // Call API (Defaulting quantity to "1")
        const result = await addListItems(listId, item.name, "1", item.category, item.shelfLife);
        setAddingId(null);

        if (result.success) {
            setCartCounts(prev => ({
                ...prev,
                [item.name]: (prev[item.name] || 0) + 1
            }));
            addToHistory(item);

            // Trigger the flying animation
            setFlyingImage(item.imageUrl || 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png');
            
            // Set starting position slightly offset so center of image is at the finger tap
            flyAnim.setValue({ x: startX - 25, y: startY - 25 });
            flyScaleAnim.setValue(1);
            flyOpacityAnim.setValue(1);

            // Animate flying down to the bottom right list button
            Animated.parallel([
                Animated.timing(flyAnim, {
                    toValue: { x: width - 60, y: height - 90 }, 
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(flyScaleAnim, {
                    toValue: 0.2, // Shrink as it flies away
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(flyOpacityAnim, {
                    toValue: 0, // Fade out right at the end
                    duration: 600,
                    delay: 200, 
                    useNativeDriver: true,
                })
            ]).start(() => {
                setFlyingImage(null); // Clean up flying image

                // Trigger the List Button Bounce effect when the item "lands"
                Animated.sequence([
                    Animated.timing(listButtonScaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
                    Animated.timing(listButtonScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
                ]).start();
            });

        } else {
            Alert.alert("Error", "Could not add item.");
        }
    };

    return (
        <View style={styles.container}>

            {/* --- Header Area --- */}
            <View style={styles.header}>
                <View style={styles.navBar}>

                    {/* Back Button */}
                    <TouchableOpacity style={styles.headerIconWrapper} onPress={() => router.back()}>
                        <Image
                            source={require('@/components/images/BackButton.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>

                    {/* Header Title */}
                    <Text style={styles.headerTitle} numberOfLines={2}>{listName}</Text>

                    <View style={styles.headerIconWrapper} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Image
                        source={require('@/assets/images/listing/Magnifier.png')}
                        style={styles.magnifierIcon}
                        resizeMode="contain"
                    />

                    <TextInput
                        placeholder="Search ingredients..."
                        placeholderTextColor={'#bd906cff'}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                </View>
            </View>

            <ScrollView style={styles.contentContainer}>

                {/* --- Recently Added Tags --- */}
                {recentItems.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Recently Added</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                            {recentItems.map((recentItem, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.tag}
                                    // Clicking the tag adds it to the list
                                    onPress={(e) => handleAddItem(e, recentItem)}
                                >
                                    <Text style={styles.tagText}>{recentItem.name}</Text>

                                    {/* Clicking X removes it from history */}
                                    <TouchableOpacity
                                        style={{ padding: 4 }}
                                        onPress={(e) => {
                                            // Stop the tap from triggering the 'add'
                                            e.stopPropagation();
                                            removeFromHistory(recentItem.name);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={16} color="#666" style={{ marginLeft: 2 }} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* --- Categories --- */}
                <View style={styles.categoryHeaderRow}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {CATEGORIES.map((cat) => {
                        const isActive = selectedCategory === cat.dbValue;

                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={styles.categoryItem}
                                onPress={() => setSelectedCategory(cat.dbValue)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.customIconWrapper}>
                                    {/* The Background Border Image */}
                                    <Image
                                        source={
                                            isActive
                                                ? require('@/assets/images/listing/icons/SelectedBorder.png')
                                                : require('@/assets/images/listing/icons/UnselectBorder.png')
                                        }
                                        style={styles.categoryBorderImg}
                                    />

                                    {/* The Foreground Item Icon (Leaves, Cow, etc.) */}
                                    <Image
                                        source={cat.iconSource}
                                        style={styles.categoryInnerIcon}
                                    />
                                </View>

                                <Text style={[
                                    styles.categoryText,
                                    isActive && { color: '#A67C52' }
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* --- Product Grid --- */}
                <View style={styles.itemsGrid}>
                    {/* Check if we are loading first */}
                    {loading ? (
                        <View style={{
                            justifyContent: 'center', 
                            width: '100%',
                        }}>
                            <ActivityIndicator size="large" color="#718F64" style={{ marginTop: 50, }} />
                        </View> 
                    ) : (
                        filteredItems.map((item, index) => {
                            // Calculate how many of this item we have added
                            const count = cartCounts[item.name] || 0;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.productCardContainer}
                                    onPress={() => router.push({
                                        pathname: "./item_detail",
                                        params: {
                                            name: item.name,
                                            category: item.category,
                                            description: item.description,
                                            imageUrl: item.imageUrl || 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png',
                                            listId: listId,
                                            currentQuantity: count,
                                        }
                                    })}
                                >
                                    <ImageBackground
                                        source={require('@/assets/images/listing/icons/ItemBorder.png')}
                                        style={styles.productCardBackground}
                                        resizeMode="stretch"
                                    >
                                        {/* --- BADGE UI --- */}
                                        {/* Only show this red/green circle if user added item */}
                                        {count > 0 && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{count}</Text>
                                            </View>
                                        )}

                                        {/* Image Area */}
                                        <View style={styles.iconContainer}>
                                            <Image
                                                source={{ uri: item.imageUrl || 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png' }}
                                                placeholder={'https://cdn-icons-png.flaticon.com/512/2674/2674486.png'}
                                                placeholderContentFit='contain'
                                                style={styles.productImage}
                                                contentFit='contain'
                                                transition={200}
                                                cachePolicy={"disk"}
                                            />
                                        </View>

                                        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>

                                        {/* --- ADD BUTTON --- */}
                                        <TouchableOpacity
                                            style={styles.addButton}
                                            onPress={(e) => handleAddItem(e, item)}
                                            // Disable button while this specific item is loading
                                            disabled={addingId === item.name}
                                        >
                                            {/* Show Spinner if loading, else show + */}
                                            {addingId === item.name ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Ionicons name="add" size={20} color="white" />
                                            )}
                                        </TouchableOpacity>

                                    </ImageBackground>

                                </TouchableOpacity>
                            );
                        }
                        ))}
                </View>

            </ScrollView>

            {/* Floating Flying Image  */}
            {flyingImage && (
                <Animated.Image
                    source={{ uri: flyingImage }}
                    style={[
                        styles.flyingImage,
                        {
                            transform: [
                                { translateX: flyAnim.x },
                                { translateY: flyAnim.y },
                                { scale: flyScaleAnim }
                            ],
                            opacity: flyOpacityAnim,
                        }
                    ]}
                />
            )}

            {/* Floating Review List */}
            <Animated.View style={[styles.floatingListBtnWrapper, { transform: [{ scale: listButtonScaleAnim }] }]}>
                <TouchableOpacity style={styles.floatingListBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <Ionicons name="receipt" size={28} color="#FFF9E6" />
                </TouchableOpacity>
            </Animated.View>

        </View>
    );
}

const { width, height } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3E8D6', // Cozy parchment/aged paper background
    },
    header: {
        backgroundColor: '#A67C52', // Warm wood tone (replacing the bright green)
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderBottomWidth: 4,
        justifyContent: 'space-between',
        borderColor: '#7A5B35', // Darker wood edge for depth
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: isTabletView ? 20 : 16,
        maxWidth: '70%',
        fontFamily: 'PixelFont',
        textAlign: 'center',
        color: '#FFF9E6',
    },
    headerIconWrapper: {
        width: isTabletView ? 60 : 40,
        height: isTabletView ? 60 : 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF9E6', // Creamy interior
        borderRadius: 8, // Sharper corners for a game UI feel
        borderWidth: 2,
        borderColor: '#7A5B35', // Wood border
        padding: 10,
        alignItems: 'center',
    },
    magnifierIcon: {
        width: isTabletView ? 30 : 24,
        height: isTabletView ? 30 : 24,
        marginRight: 10
    },
    searchInput: {
        flex: 1,
        fontSize: isTabletView ? 16 : 12,
        fontFamily: 'PixelFont',
        color: '#4A3525', 
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: isTabletView ? 20 : 16,
        marginBottom: 10,
        fontFamily: 'PixelFont',
        color: '#4A3525',
    },
    tagScroll: {
        marginBottom: 20,
        flexDirection: 'row'
    },
    tag: {
        backgroundColor: '#C1A47A', // Wood/kraft paper tag color
        borderWidth: 2,
        borderColor: '#8C6D46',
        paddingVertical: 6,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: 8, // Sharper borders
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    tagText: {
        color: '#3E2723',
        fontFamily: 'PixelFont',
        marginRight: 4
    },
    categoryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryScroll: {
        marginBottom: 20,
        flexDirection: 'row',
        paddingHorizontal: 5,
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    customIconWrapper: {
        width: isTabletView ? 81 : 64,
        height: isTabletView ? 81 : 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    categoryBorderImg: {
        position: 'absolute', // This pushes the border to the background
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    categoryInnerIcon: {
        width: '60%', // Scales the icon down so it fits nicely inside the wood frame
        height: '60%',
        resizeMode: 'contain',
        zIndex: 1, // Ensures the item sits on top of the background border
    },
    categoryText: {
        fontSize: 12,
        fontFamily: 'PixelFont',
        color: '#5C4033', // Deep brown
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCardContainer: {
        width: isTabletView ? '30%' : '48%',
        height: 180,
        marginBottom: 15,
        justifyContent: 'center',

        shadowColor: "#4A3525",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 0,
        elevation: 3,
        borderRadius: 8,
        overflow: 'hidden',
    },
    productCardBackground: {
        flex: 1,
        padding: 12,
        alignItems: 'center'
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 15
    },
    productImage: {
        width: 80,
        height: 80,
        marginBottom: 10,
        resizeMode: 'contain',
    },
    productName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#3E2723',
        marginBottom: 5,
    },
    productDesc: {
        fontSize: 11,
        color: '#7A5B35', // Medium brown
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 14,
    },
    addButton: {
        position: 'absolute',
        bottom: 10,
        right: 15,
        backgroundColor: '#5E7A4A', // Earthy moss green
        borderWidth: 2,
        borderColor: '#3E542F', // Darker green border
        width: 30, // Slightly larger to accommodate borders
        height: 30,
        borderRadius: 6, // Squarish button
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        backgroundColor: '#C85A5A', 
        borderWidth: 2,
        borderColor: '#3E2723', // Dark outline
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'PixelFont',
        color: '#FFF9E6'
    },

    // --- ANIMATION OVERLAY STYLES ---
    flyingImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 50,
        height: 50,
        zIndex: 9999,
    },
    floatingListBtnWrapper: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        zIndex: 100,
    },
    floatingListBtn: {
        width: 60,
        height: 60,
        backgroundColor: '#5E7A4A', 
        borderRadius: 30, 
        borderWidth: 4,
        borderColor: '#3E542F', 
        justifyContent: 'center',
        alignItems: 'center',
        
        // Shadow for floating effect
        shadowColor: '#4A3525',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 8,
    }
});