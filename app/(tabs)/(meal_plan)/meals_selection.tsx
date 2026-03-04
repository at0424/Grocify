import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ban, CheckCircle2, ChevronLeft, Utensils } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function MealSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get Dates from Params 
  const startDate = params.start ? new Date(params.start) : new Date();
  const endDate = params.end ? new Date(params.end) : new Date(Date.now() + 6 * 86400000);

  // State to track selections
  // Format: { "2024-11-10": { breakfast: true, lunch: true, dinner: true } }
  const [selections, setSelections] = useState({});
  const [dates, setDates] = useState([]);

  // Initialize the Grid
  useEffect(() => {
    const generatedDates = [];
    const initialSelection = {};
    
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    let finalDate = new Date(endDate);
    finalDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= finalDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
            
      generatedDates.push(new Date(currentDate));
      
      // Default: All meals selected
      initialSelection[dateKey] = {
        breakfast: true,
        lunch: true,
        dinner: true
      };
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDates(generatedDates);
    setSelections(initialSelection);
  }, []);

  // Toggle Logic
  const toggleSlot = (dateKey, mealType) => {
    setSelections(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [mealType]: !prev[dateKey][mealType]
      }
    }));
  };

  // "Select All" / "Clear All" Helper
  const toggleAll = () => {
    const allSelected = Object.values(selections).every(day => day.breakfast && day.lunch && day.dinner);
    const newStatus = !allSelected;
    
    const newSelections = {};
    Object.keys(selections).forEach(key => {
      newSelections[key] = { breakfast: newStatus, lunch: newStatus, dinner: newStatus };
    });
    setSelections(newSelections);
  };

  // Helper for Display
  const getDayLabel = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });
  const getDateLabel = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Navigate to Generation Screen
  const handleConfirm = () => {
    // Check if at least one meal is selected
    const hasSelection = Object.values(selections).some(day => day.breakfast || day.lunch || day.dinner);
    
    if (!hasSelection) {
      Alert.alert("No Meals Selected", "Please select at least one meal to continue.");
      return;
    }

    // Pass the selection map to the next screen 
    router.push({
      pathname: '/preview',
      params: { 
        selections: JSON.stringify(selections),
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meals Selection</Text>
        <TouchableOpacity onPress={toggleAll} style={styles.actionButton}>
          <CheckCircle2 color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.instructionText}>
          Please select the meals that you wish to include in the meal plan.
        </Text>

        {/* --- Column Headers --- */}
        <View style={styles.columnHeaders}>
          <View style={styles.dateColumn} /> 
          <Text style={styles.colHeader}>Breakfast</Text>
          <Text style={styles.colHeader}>Lunch</Text>
          <Text style={styles.colHeader}>Dinner</Text>
        </View>

        {/* --- The Grid --- */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {dates.map((date, index) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            // Now it will correctly find the matching state
            const dayState = selections[dateKey] || { breakfast: false, lunch: false, dinner: false };

            return (
              <View key={dateKey} style={styles.row}>
                {/* Date Label */}
                <View style={styles.dateColumn}>
                  <Text style={styles.dayText}>{getDayLabel(date)}</Text>
                  <Text style={styles.dateText}>{getDateLabel(date)}</Text>
                </View>

                {/* Meal Slots */}
                <MealSlot 
                  isActive={dayState.breakfast} 
                  onPress={() => toggleSlot(dateKey, 'breakfast')} 
                />
                <MealSlot 
                  isActive={dayState.lunch} 
                  onPress={() => toggleSlot(dateKey, 'lunch')} 
                />
                <MealSlot 
                  isActive={dayState.dinner} 
                  onPress={() => toggleSlot(dateKey, 'dinner')} 
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* --- Footer --- */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Generate Plan</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// --- Sub-Component: The Circle Button ---
const MealSlot = ({ isActive, onPress }) => (
  <TouchableOpacity 
    onPress={onPress}
    style={[
      styles.slotButton, 
      isActive ? styles.slotActive : styles.slotInactive
    ]}
  >
    {isActive ? (
      <Utensils size={20} color="#FFFFFF" />
    ) : (
      <Ban size={18} color="#A0AEC0" /> 
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    backgroundColor: '#7A9B6B',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  actionButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  instructionText: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 22,
  },
  // Grid Styles
  columnHeaders: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  colHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
  },
  dateColumn: {
    width: 90, 
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  dateText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  // Slot Button
  slotButton: {
    flex: 1,
    aspectRatio: 1, // Keeps it square
    borderRadius: 30,
    marginHorizontal: 4, // Spacing between circles
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotActive: {
    backgroundColor: '#7A9B6B', // Active Green
    shadowColor: '#7A9B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  slotInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed', // Dashed border for empty state
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmButton: {
    backgroundColor: '#7A9B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#7A9B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});