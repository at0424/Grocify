import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router'; // <--- Import these
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ... [Keep your initialData and toggleItem logic the same] ...
const initialData = [
  {
    category: 'Snacks',
    items: [
      { id: '1', name: 'Chips', qty: 2, subItems: [{ txt: 'Lays', done: true }, { txt: 'Domino', done: false }], done: false },
      { id: '2', name: 'Gummy Bears', qty: 1, subItems: [], done: true }, // This one is crossed out
    ]
  },
  {
    category: 'Drinks',
    items: [
      { id: '3', name: 'Soda', qty: 4, subItems: [{ txt: 'Cola', done: false }, { txt: '100 Plus', done: false }], done: false },
    ]
  },
  {
    category: 'Food',
    items: [
      { id: '4', name: 'Pizza', qty: 2, subItems: [], done: false },
      { id: '5', name: 'Fries', qty: 4, subItems: [], done: false },
    ]
  }
];

export default function ListingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // <--- Get params here
  const title = params.title || 'Party'; // Fallback if param is missing
  
  const [listData, setListData] = useState(initialData);
  
  const toggleItem = (itemId) => {
      // Logic to toggle 'done' status would go here
      console.log("Toggled item:", itemId);
    };

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        {/* Use router.back() instead of navigation.goBack() */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="black" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{title}</Text>

        <View style={styles.avatarStack}>
          <View style={[styles.avatar, { backgroundColor: '#ddd', right: 0, zIndex: 1 }]} />
          <View style={[styles.avatar, { backgroundColor: '#bbb', right: 15, zIndex: 0 }]} />
        </View>
      </View>

      {/* ... [Rest of your UI code remains exactly the same] ... */}
       <ScrollView contentContainerStyle={styles.scrollContent}>
              {listData.map((section, index) => (
                <View key={index} style={styles.sectionContainer}>
                  
                  {/* Category Header (Darker Yellow Strip) */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.category}</Text>
                  </View>
      
                  {/* List Items */}
                  {section.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      
                      {/* Main Item Line */}
                      <View style={styles.mainRow}>
                        <View style={styles.leftSide}>
                           <View style={styles.bulletPoint} />
                           <Text style={[styles.itemText, item.done && styles.strikethrough]}>
                             {item.name}
                           </Text>
                        </View>
                        
                        {/* Quantity & Checkbox */}
                        <View style={styles.rightSide}>
                          <Text style={[styles.qtyText, item.done && styles.strikethrough]}>x {item.qty}</Text>
                          <TouchableOpacity onPress={() => toggleItem(item.id)}>
                            <Ionicons 
                              name={item.done ? "radio-button-on" : "radio-button-off"} // Changed to radio for softer look
                              size={20} 
                              color={item.done ? "#aaa" : "#fff"} // White circle to look like empty checkbox
                              style={{ marginLeft: 10 }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
      
                      {/* Sub-notes (like 'Lays', 'Domino') */}
                      {item.subItems && item.subItems.map((sub, i) => (
                        <Text key={i} style={[styles.subText, sub.done && styles.strikethrough]}>
                          x  {sub.txt}
                        </Text>
                      ))}
      
                      {/* The "Crossed Out Line" visual effect for completed items */}
                      {item.done && <View style={styles.crossLine} />}
      
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
      
            {/* --- 3. Floating Action Button (+) --- */}
            <TouchableOpacity style={styles.fab} onPress={() => console.log('Add Item')}>
              <Ionicons name="add" size={30} color="#000" />
            </TouchableOpacity>

    </View>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9C4', // The Pale Sticky Note Yellow
    paddingTop: 50, // Status bar spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    fontFamily: 'System', // On iOS this looks clean, effectively simulated handwritten if you add a custom font later
  },
  avatarStack: {
    flexDirection: 'row',
    width: 50,
    height: 30,
    position: 'relative',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFF9C4', // Matches background to create "cutout" effect
    position: 'absolute',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: '#E6EE9C', // The Darker Yellow/Greenish header strip
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center', // Centered title like screenshot
  },
  itemRow: {
    paddingHorizontal: 30, // Indent content slightly
    marginBottom: 15,
    position: 'relative',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'black',
    marginRight: 10,
  },
  itemText: {
    fontSize: 20,
    fontWeight: '400',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '500',
    marginRight: 5,
  },
  subText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 25, // Indent sub-notes under the text
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.5,
  },
  // Custom line overlay to match the "Gummy Bears" scratch-out style exactly
  crossLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'black',
    width: '100%',
    top: 15, // Aligns with the middle of the text roughly
    left: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCE775', // Darker yellow/green matching headers
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});