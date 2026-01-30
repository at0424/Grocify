import { addListItems, fetchGroceryCatalog, fetchGroceryListDetails } from '@/services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
    { id: '0', name: 'All', dbValue: 'All', icon: 'view-grid', color: '#F5F5F5' },
    { id: '1', name: 'Fresh', dbValue: 'Fruits & Vegetables', icon: 'leaf', color: '#E8F5E9' },
    { id: '2', name: 'Meat', dbValue: 'Meat & Fish', icon: 'food-steak', color: '#FFEBEE' },
    { id: '3', name: 'Dairy', dbValue: 'Dairy', icon: 'cow', color: '#E3F2FD' },
    { id: '4', name: 'Bakery', dbValue: 'Bread & Pastries', icon: 'bread-slice', color: '#FFF9C4' },
    { id: '5', name: 'Grains', dbValue: 'Grain Products', icon: 'barley', color: '#FFF8E1' },
    { id: '6', name: 'Frozen', dbValue: 'Frozen & Convenience', icon: 'snowflake', color: '#E0F7FA' },
    { id: '7', name: 'Snacks', dbValue: 'Snacks & Sweets', icon: 'cookie', color: '#FCE4EC' },
    { id: '8', name: 'Drinks', dbValue: 'Beverages', icon: 'glass-mug-variant', color: '#E1F5FE' },
    { id: '9', name: 'Spices', dbValue: 'Ingredients & Spices', icon: 'shaker', color: '#FFF3E0' },
    { id: '10', name: 'Health', dbValue: 'Care & Health', icon: 'medical-bag', color: '#F3E5F5' },
    { id: '11', name: 'Home', dbValue: 'Household', icon: 'spray-bottle', color: '#ECEFF1' },
];


export default function AddItemScreen() {
    const router = useRouter();
    const { listId, title } = useLocalSearchParams();
    const listName = title || 'Unnamed List';

    // Data States
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    // UI States
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState('');

    // Logic States
    const [cartCounts, setCartCounts] = useState({}); // Tracks { 'Milk': 2, 'Eggs': 1 }
    const [addingId, setAddingId] = useState(null); // For loading spinner on button
    const [recentItems, setRecentItems] = useState([]); // For recently added items

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
            ].slice(0,10);

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
    const handleAddItem = async (item) => {
        if (!listId) {
            Alert.alert("Error", "No List ID found. Please go back and reopen the list.");
            return;
        }

        setAddingId(item.name); // Show spinner

        // Call API (Defaulting quantity to "1")
        const result = await addListItems(listId, item.name, "1", item.category);

        setAddingId(null);

        if (result.success) {
            // Update the badge count locally
            setCartCounts(prev => ({
                ...prev,
                [item.name]: (prev[item.name] || 0) + 1
            }));

            addToHistory(item);
        } else {
            Alert.alert("Error", "Could not add item.");
        }
    };

    return (
        <View style={styles.container}>

            {/* --- 1. Green Header Area --- */}
            <View style={styles.greenHeader}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{listName}</Text>
                    <View style={{ width: 28 }}>
                        <Text style={{ opacity: 0 }}>Placeholder</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#718F64" style={{ marginRight: 10 }} />
                    <TextInput
                        placeholder="Search ingredients..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                </View>
            </View>

            <ScrollView style={styles.contentContainer}>

                {/* --- 2. Recently Added Tags --- */}
                {recentItems.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Recently Added</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                            {recentItems.map((recentItem, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={styles.tag}
                                    // Clicking the tag adds it to the list
                                    onPress={() => handleAddItem(recentItem)}
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

                {/* --- 3. Categories --- */}
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
                            >
                                <View style={[
                                    styles.iconCircle,
                                    { backgroundColor: isActive ? '#718F64' : cat.color }
                                ]}>
                                    <MaterialCommunityIcons
                                        name={cat.icon}
                                        size={24}
                                        color={isActive ? "white" : "#555"}
                                    />
                                </View>
                                <Text style={[
                                    styles.categoryText,
                                    isActive && { fontWeight: 'bold', color: '#718F64' }
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* --- 4. Product Grid --- */}
                <View style={styles.itemsGrid}>
                    {/* Check if we are loading first */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#718F64" style={{ marginTop: 50, }} />
                    ) : (
                        filteredItems.map((item, index) => {
                            // Calculate how many of this item we have added
                            const count = cartCounts[item.name] || 0;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.productCard}
                                    onPress={() => router.push({
                                        pathname: "./item_detail",
                                        params: {
                                            ...item,
                                            listId: listId, 
                                            currentQuantity: count // Pass the badge number (0, 1, 5, etc.)
                                        }
                                    })}
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
                                            source={{ uri: item.image || 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png' }}
                                            style={styles.productImage}
                                        />
                                    </View>

                                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>

                                    {/* --- [UPDATED] ADD BUTTON --- */}
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={() => handleAddItem(item)}
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

                                </TouchableOpacity>
                            );
                        }
                        ))}
                </View>

            </ScrollView>

            {/* --- 5. Floating "Review List" Button (Bottom Right) ---
            <TouchableOpacity style={styles.floatingListBtn} onPress={() => router.back()}>
                <Ionicons name="list" size={28} color="#4A4A4A" />
            </TouchableOpacity> */}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    greenHeader: {
        backgroundColor: '#718F64', // Matching your Moss Green
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    tagScroll: { 
        marginBottom: 20, 
        flexDirection: 'row' 
    },
    tag: {
        backgroundColor: '#DCE775', 
        paddingVertical: 6,
        paddingLeft: 12,
        paddingRight: 8, // slightly less padding on right for the close button
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    tagText: { 
        fontWeight: '600', 
        color: '#333', 
        marginRight: 4 
    },
    categoryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    categoryScroll: {
        marginBottom: 20,
        flexDirection: 'row',
        paddingHorizontal: 5, // Tiny padding so shadows don't get cut off
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 20, // Add spacing between items
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCard: {
        width: '48%', // Forces 2 columns
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 12,
        alignItems: 'center',
        marginBottom: 15,
        // Shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F1F8E9', // Light green circle background
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
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
        marginBottom: 5,
    },
    productDesc: {
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
        marginBottom: 15, // Space for the button
        lineHeight: 14,
    },
    addButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#718F64',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingListBtn: {
        position: 'absolute',
        bottom: 40,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#8FA37E', // Slightly different green for the FAB
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        backgroundColor: '#DCE775', // Light Green/Yellow pop color
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 1 }
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333'
    },
});