import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Data Input Component
  const DateInput = ({ label, date, minDate, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);

  const getDayName = (d) => {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Android Handler
  const handleAndroidChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) onChange(selectedDate);
  };

  // iOS Handler
  const handleIOSChange = (event, selectedDate) => {
    if (selectedDate) onChange(selectedDate);
  };

  return (
    <View style={styles.dateInputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TouchableOpacity 
        style={styles.dateBox} 
        onPress={() => setShowPicker(true)}
      >
        <View>
          <Text style={styles.dateDayText}>{getDayName(date)}</Text>
          <Text style={styles.dateValueText}>{formatDate(date)}</Text>
        </View>
        <ChevronDown color="#7A9B6B" size={20} />
      </TouchableOpacity>

      {/* Android Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={minDate}
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS Picker */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.iosModalOverlay}>
            <View style={styles.iosModalContent}>
              {/* Toolbar with "Done" button */}
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* The Spinner Picker */}
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={minDate}
                display="spinner" // Use 'spinner' or 'inline' for immediate view
                onChange={handleIOSChange}
                textColor="#000000"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default function MealPlanCreateDateScreen() {
  const router = useRouter();

  const [startDate, setStartDate] = useState(new Date()); 
  const [endDate, setEndDate] = useState(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)); // Default 6 days ahead (one week)


  // Handle selection on start date
  const handleStartChange = (newDate) => {
    setStartDate(newDate);
    // Auto-adjust end date if needed
    if (newDate > endDate) {
      const nextWeek = new Date(newDate);
      nextWeek.setDate(newDate.getDate() + 6);
      setEndDate(nextWeek);
    }
  };

  // Passing the selected dates to the next screen
  const handleConfirm = () => {
    router.push({
      pathname: '/selection',
      params: { 
        start: startDate.toISOString(),
        end: endDate.toISOString() 
      }
    });
  };

  // Helper to format date like "Nov, 10"
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper to get day name like "Today" or "Sunday"
  const getDayName = (date) => {
    const today = new Date();
    // Compare dates without time
    if (date.toDateString() === today.toDateString()) return "Today";
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Plan Dates</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Please choose the start date and end date for the meal plan. 
          We'll help you in creating your personalized meal plan!
        </Text>

        <View style={styles.dateRow}>
          {/* Start Date */}
          <DateInput 
            label="Start" 
            date={startDate} 
            onChange={handleStartChange} 
          />

          {/* End Date */}
          <DateInput 
            label="End" 
            date={endDate} 
            minDate={startDate} 
            onChange={setEndDate} 
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  content: {
    padding: 24,
  },
  instructionText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  dateBox: {
    backgroundColor: '#E8EDE6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 70,
  },
  dateDayText: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 4,
  },
  dateValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3A26',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
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

  // --- iOS Modal Specific Styles ---
  iosModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)', // Dim background
  },
  iosModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },
  iosDoneText: {
    color: '#007AFF', // Standard iOS Blue
    fontSize: 16,
    fontWeight: '600',
  },
  iosPicker: {
    height: 200, // Fixed height for spinner
    width: '100%',
  },
});