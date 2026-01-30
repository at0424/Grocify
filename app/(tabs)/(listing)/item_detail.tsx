import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const THEME_GREEN = '#718F64'; 

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get Data from Params (with fallbacks)
  const item = {
    name: params.name || 'Apple',
    category: params.category || 'Fruit',
    description: params.description || 'Apples are crisp, juicy fruits that come in a variety of colors such as red, green, and yellow. They have a refreshing sweetness...',
    image: params.image || 'https://via.placeholder.com/300', // Placeholder
    price: params.price || 0,
  };

  const [quantity, setQuantity] = useState(1);

  const handleQuantity = (type) => {
    if (type === 'minus') {
      if (quantity > 1) setQuantity(quantity - 1);
    } else {
      setQuantity(quantity + 1);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* --- 1. Curved Image Header --- */}
      <View style={styles.headerContainer}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>

      {/* --- 2. Content Body --- */}
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>
          {item.description} 
        </Text>

        {/* --- 3. Quantity Selector --- */}
        <View style={styles.quantityRow}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          
          <View style={styles.counterContainer}>
             {/* Minus Button */}
             <TouchableOpacity onPress={() => handleQuantity('minus')}>
               <Ionicons name="remove-circle" size={32} color={THEME_GREEN} />
             </TouchableOpacity>
             
             <Text style={styles.qtyValue}>{quantity}</Text>
             
             {/* Plus Button */}
             <TouchableOpacity onPress={() => handleQuantity('plus')}>
               <Ionicons name="add-circle" size={32} color={THEME_GREEN} />
             </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* --- 4. Bottom Button --- */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => console.log(`Added ${quantity} ${item.name} to list`)}
        >
          <Text style={styles.addButtonText}>Add to List</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Curved Header Logic
  headerContainer: {
    height: 350,
    backgroundColor: '#F2F2F2', // Light grey bg for contrast
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 60,  // Creates the curve
    borderBottomRightRadius: 60, // Creates the curve
    overflow: 'hidden', // Ensures image doesn't bleed out
    marginBottom: 20,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  content: {
    paddingHorizontal: 25,
    paddingBottom: 100, // Space for footer
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  category: {
    fontSize: 16,
    color: '#888',
    marginBottom: 25,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 30,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  qtyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 20,
    flex: 1,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: THEME_GREEN,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});