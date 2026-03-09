import { addListItems } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageBackground } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions,
  Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';

const THEME_GREEN = '#5E7A4A'; 
const PLACEHOLDER_IMG = 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png'; 

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Data Extraction
  const initialQty = parseInt(params.currentQuantity || '0');
  const listId = params.listId;

  const item = {
    name: params.name || 'Unknown Item',
    category: params.category || 'General',
    description: params.description || 'No description available.',
    imageUrl: params.imageUrl || PLACEHOLDER_IMG, 
  };

  const [quantity, setQuantity] = useState(initialQty > 0 ? initialQty : 1);
  const [saving, setSaving] = useState(false);

  const addToHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('@recent_items');
      const currentHistory = stored ? JSON.parse(stored) : [];

      const newHistory = [
        item,
        ...currentHistory.filter(i => i.name !== item.name)
      ].slice(0, 10);

      await AsyncStorage.setItem('@recent_items', JSON.stringify(newHistory));
    } catch (e) {
      console.log("Error saving history:", e);
    }
  };

  const handleQuantity = (type) => {
    if (type === 'minus') {
      if (quantity > 0) setQuantity(quantity - 1);
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleSave = async () => {
    if (!listId) {
      Alert.alert("Error", "Missing List ID");
      return;
    }

    setSaving(true);
    const delta = quantity - initialQty;

    if (delta === 0) {
      router.back();
      return;
    }

    const result = await addListItems(listId, item.name, String(delta), item.category);
    
    setSaving(false);

    if (result.success) {
      await addToHistory();
      router.back();
    } else {
      Alert.alert("Error", "Could not update item.");
    }
  };

  return (
    <View style={styles.container}>
      
      {/* --- Header --- */}
      <View style={styles.headerContainer}>
        {/* Replaced generic icon with your custom wooden arrow */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Image 
            source={require('@/components/images/BackButton.png')} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="contain" 
          />
        </TouchableOpacity>

        <ImageBackground 
          source={require('@/assets/images/listing/DetailBorder.png')}
          style={styles.borderBackground}
          imageStyle={styles.borderImageStyle}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        </ImageBackground>
      </View>

      {/* --- Cozy Content Card --- */}
      <View style={styles.cardWrapper}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>

          <ImageBackground
            source={require('@/assets/images/listing/DescriptionBG.png')}
            style={styles.descBackground}
            imageStyle={{resizeMode: 'stretch'}}
          >
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>
              {item.description}
            </Text>

          </ImageBackground>

          {/* --- Quantity Selector --- */}
          <View style={styles.quantityRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            
            <ImageBackground
              source={require('@/assets/images/listing/WoodenPanel.png')}
              style={styles.counterContainer}
              imageStyle={{resizeMode: 'stretch'}}
            >
               <TouchableOpacity 
                 onPress={() => handleQuantity('minus')} 
                 activeOpacity={0.7}
                 disabled={quantity === 0} 
               >
                <Image
                  source={require('@/components/images/MinusIcon.png')}
                  style={[styles.qtyIcon, quantity === 0 && { opacity: 0.5 }]} // Fades out when at 0
                  resizeMode="contain"
                />
               </TouchableOpacity>
               
               <Text style={styles.qtyValue}>{quantity}</Text>
               
               <TouchableOpacity onPress={() => handleQuantity('plus')} activeOpacity={0.7}>
                 <Image
                  source={require('@/components/images/PlusIcon.png')}
                  style={styles.qtyIcon}
                  resizeMode="contain"
                />
               </TouchableOpacity>
            </ImageBackground>

          </View>

        </ScrollView>

        {/* --- Footer Button --- */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFF9E6" />
            ) : (
              <Text style={styles.addButtonText}>
                {initialQty > 0 ? "Update List" : "Add to List"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const { width, height } = Dimensions.get('window');
const isTabletView = width > 600;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E8D6', // Cozy parchment background
  },
  
  // ==========================================
  // HEADER (Image & Back Button)
  // ==========================================
  headerContainer: {
    height: 380, 
    backgroundColor: '#F3E8D6', 
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    height: isTabletView ? '20%' : '15%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  borderBackground: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderImageStyle: {
    resizeMode: 'contain',
  },
  productImage: {
    width: 160, 
    height: 160,
    resizeMode: 'contain',
  },

  // ==========================================
  // CONTENT AREA (The Wood-Bordered Card)
  // ==========================================
  cardWrapper: {
    flex: 1,
    backgroundColor: '#FDF7EB', // Light parchment card face
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40,
    borderTopWidth: 4, 
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#C1A47A', // Wooden edge
    marginTop: -50, // Pulls the card up over the header
    overflow: 'hidden', 
  },
  content: {
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: isTabletView ? 26 : 20,
    fontFamily: 'PixelFont',
    color: '#3E2723', // Dark brown wood text
    marginBottom: 6,
  },
  category: {
    fontSize: isTabletView ? 18 : 14,
    fontFamily: 'PixelFont',
    color: '#7A5B35', // Medium brown
    marginBottom: 30,
  },
  descBackground: {
    width: '100%',
    minHeight: 120, 
    paddingTop: 24, 
    paddingBottom: 24, 
    paddingHorizontal: 20, 
    marginBottom: 30, 
    justifyContent: 'flex-start',

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  sectionLabel: {
    fontSize: isTabletView ? 24 : 18,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    marginBottom: 8,
  },
  description: {
    fontSize: isTabletView ? 16: 12,
    fontFamily: 'PixelFont',
    color: '#5C4033',
    lineHeight: 20,
  },

  // ==========================================
  // QUANTITY CONTROLS
  // ==========================================
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  qtyLabel: {
    fontSize: isTabletView ? 20 : 16,
    fontFamily: 'PixelFont',
    color: '#3E2723',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: isTabletView ? 70 : 50,
    paddingHorizontal: 10
  },
  qtyValue: {
    fontSize: 20,
    fontFamily: 'PixelFont',
    color: 'black',
    textAlign: 'center',
    minWidth: 45,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  qtyIcon: {
    width: isTabletView ? 50 : 36,
    height: isTabletView ? 50 : 36,
  },

  // ==========================================
  // FOOTER & ACTION BUTTON
  // ==========================================
  footer: {
    backgroundColor: '#FDF7EB',
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 10,
  },
  addButton: {
    backgroundColor: THEME_GREEN,
    paddingVertical: 14,
    borderRadius: 8, // Sharper corners for that game UI feel
    borderWidth: 2,
    borderColor: '#3E542F', // Dark outline for the button
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF9E6',
    fontSize: 16,
    fontFamily: 'PixelFont',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
});