import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
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

  const allSelected = Object.values(selections).every(day => day.breakfast && day.lunch && day.dinner);

  return (
    <SafeAreaView style={styles.container}>

      {/* --- Header --- */}
      <ImageBackground
        source={require('@/assets/images/meal_plan/MealPlanHeader.png')}
        style={styles.header}
        resizeMode='stretch'
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require('@/components/images/BackButton.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.headerTitle}>Meals Selection</Text>

        {/* Mark All Button */}
        <TouchableOpacity
          style={styles.toggleAllWrapper}
          onPress={toggleAll}
          activeOpacity={0.8}
        >
          <Image
            source={
              allSelected
                ? require('@/components/images/Checkedbox.png')
                : require('@/components/images/Checkbox.png')
            }
            style={styles.actionButton}
            resizeMode="contain"
          />

        </TouchableOpacity>

      </ImageBackground>

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
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={{ maxHeight: isTabletView ? '75%' : '70%' }}
        >
          {dates.map((date, index) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            // Now it will correctly find the matching state
            const dayState = selections[dateKey] || { breakfast: false, lunch: false, dinner: false };

            return (
              <View key={dateKey} style={styles.row}>

                <Image
                  source={require('@/assets/images/ai/TextInput.png')} 
                  style={styles.rowBackgroundImage}
                  resizeMode="stretch"
                />

                <View style={styles.rowContentLayer}>
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

              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* --- Footer --- */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmWoodButton} onPress={handleConfirm} activeOpacity={0.8}>
          <ImageBackground
            source={require('@/assets/images/freshness/GreenButton.png')}
            style={styles.confirmButtonBackgroundImage}
            resizeMode='stretch'
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </ImageBackground>
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
      styles.slotButtonWrapper,
      isActive ? styles.slotActive : styles.slotInactive
    ]}
  >
    <Image
      source={
        isActive
          ? require('@/assets/images/meal_plan/SelectedMeal.png')
          : require('@/assets/images/meal_plan/UnselectedMeal.png')
      }
      style={styles.slotButton}
      resizeMode='contain'
    />
    
  </TouchableOpacity>
);

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4D5B7',
  },
  // Header
  header: {
    height: isTabletView ? 100 : 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    height: isTabletView ? 50 : 35,
    aspectRatio: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: isTabletView ? 18 : 14,
    fontFamily: 'PixelFont',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  toggleAllWrapper: {
    height: isTabletView ? 50 : 35,
    aspectRatio: 1,
  },
  actionButton: {
    height: '100%',
    width: '100%'
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  instructionText: {
    fontSize: isTabletView ? 15 : 12,
    color: '#666666',
    fontFamily: 'PixelFont',
    marginBottom: 24,
    lineHeight: 22,
  },
  // Grid Styles
  columnHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: '9%',
  },
  colHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: isTabletView ? 12 : 7,
    fontFamily: 'PixelFont',
    color: '#718096',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  row: {
    width: '100%',
    marginBottom: 20,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  rowBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  rowContentLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: '5%',   
    paddingHorizontal: '10%', 
  },
  dateColumn: {
    width: isTabletView ? '25%' : '35%',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: isTabletView ? 14 : 12,
    fontFamily: 'PixelFont',
    color: '#2D3748',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'PixelFont',
    color: '#718096',
    marginTop: 2,
  },
  // Slot Button
  slotButtonWrapper: {
    flex: 1,
    aspectRatio: 1, 
    marginHorizontal: 4, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotButton: {
    width: '100%',
    height: '100%'
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  confirmWoodButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    height: isTabletView ? 100 : 80,
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonBackgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'PixelFont',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
});