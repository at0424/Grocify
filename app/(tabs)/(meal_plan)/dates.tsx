import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan.','Feb.','Mar','Apr','May','Jun','Jul.','Aug','Sep.','Oct.','Nov.','Dec.'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['S','M','T','W','T','F','S'], // This is the fix
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

const CustomPixelDatePicker = ({ visible, onClose, selectedDate, minDate, maxDate, onDateSelect, title }) => {
  // Format dates to 'YYYY-MM-DD' for the calendar library
  const getFormattedDate = (d) => {
    if (!d) return undefined;
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const formattedSelected = getFormattedDate(selectedDate);
  const formattedMin = getFormattedDate(minDate);
  const formattedMax = getFormattedDate(maxDate);

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.popupBackground}>
          <Text style={styles.popupTitle}>{title}</Text>

          <Calendar
            current={formattedSelected}
            minDate={formattedMin}
            maxDate={formattedMax}
            onDayPress={(day) => {
              const newDate = new Date(`${day.dateString}T12:00:00`);
              onDateSelect(newDate);
              onClose();
            }}
            markedDates={{
              [formattedSelected]: { selected: true, disableTouchEvent: true }
            }}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: '#4A2F1D', 
              selectedDayBackgroundColor: '#7A9B6B', 
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#8C5A35', 
              dayTextColor: '#333333',
              textDisabledColor: '#A9A9A9',
              monthTextColor: '#4A2F1D',
              arrowColor: '#4A2F1D',
              textDayFontFamily: 'PixelFont',
              textMonthFontFamily: 'PixelFont',
              textDayHeaderFontFamily: 'PixelFont',
              textDayFontSize: 12,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 18,
            }}
          />

          <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
            <Text style={styles.closeModalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- Date Input Component ---
const DateInput = ({ label, date, onPress }) => {
  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={styles.dateInputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TouchableOpacity style={styles.woodButton} onPress={onPress}>
        <Image
          source={require('@/assets/images/freshness/OrangeButton.png')} 
          style={styles.woodButtonImage}
          resizeMode="stretch"
        />

        <View style={styles.buttonContentLayer}>
          <Text style={styles.dateValueText}>{formatDate(date)}</Text>
          <View style={styles.triangleDown} />
        </View>

      </TouchableOpacity>
    </View>
  );
};

// --- Main Screen ---
export default function MealPlanCreateDateScreen() {
  const router = useRouter();

  const [startDate, setStartDate] = useState(new Date()); 
  const [endDate, setEndDate] = useState(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)); 
  const maxEndDate = new Date(startDate);
  maxEndDate.setDate(startDate.getDate() + 6);    // Limit end date to one week

  // Modal visibility states
  const [isStartVisible, setStartVisible] = useState(false);
  const [isEndVisible, setEndVisible] = useState(false);

  const handleStartChange = (newDate) => {
    setStartDate(newDate);

    const newMax = new Date(newDate);
    newMax.setDate(newDate.getDate() + 6);

    if (endDate < newDate || endDate > newMax) {
    setEndDate(newMax); // Default to the end of the week
    }
  };

  const handleConfirm = () => {
    router.push({
      pathname: './meals_selection',
      params: { 
        start: startDate.toISOString(),
        end: endDate.toISOString() 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <ImageBackground
        source={require('@/assets/images/meal_plan/MealPlanHeader.png')}
        style={styles.header}
        resizeMode='stretch'
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require('@/components/images/BackButton.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Meal Plan Dates</Text>
        <View style={styles.backButton} />
      </ImageBackground>

      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Please choose the start{'\n'}and end date...
        </Text>

        <View style={styles.datesContainer}>
          <DateInput 
            label="Start" 
            date={startDate} 
            onPress={() => setStartVisible(true)} 
          />
          <DateInput 
            label="End" 
            date={endDate} 
            onPress={() => setEndVisible(true)} 
          />
        </View>
      </View>

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

      {/* Popups */}
      <CustomPixelDatePicker
        visible={isStartVisible}
        title="Select Start Date"
        selectedDate={startDate}
        minDate={new Date()}
        onClose={() => setStartVisible(false)}
        onDateSelect={handleStartChange}
      />

      <CustomPixelDatePicker
        visible={isEndVisible}
        title="Select End Date"
        selectedDate={endDate}
        minDate={startDate} 
        maxDate={maxEndDate}
        onClose={() => setEndVisible(false)}
        onDateSelect={setEndDate}
      />
      
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4D5B7',
  },
  header: {
    height: isTabletView ? 100 : 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: isTabletView ? 22 : 18,
    fontFamily: 'PixelFont',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  backButton: {
    height: isTabletView ? 50 : 35,
    aspectRatio: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center', 
    marginTop: '20%'
  },
  instructionText: {
    fontSize: isTabletView ? 18 : 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'PixelFont',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  datesContainer: {
    width: '100%',
    maxWidth: 400, 
    gap: 24, 
  },
  dateInputWrapper: {
    width: '100%',
  },
  inputLabel: {
    fontSize: isTabletView ? 20 : 18,
    fontFamily: 'PixelFont',
    color: '#333333',
    marginBottom: 8,
    marginLeft: 4,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  woodButton: {
    width: '100%',
    height: 65, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  woodButtonImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  buttonContentLayer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, 
  },
  dateValueText: {
    fontSize: 16,
    fontFamily: 'PixelFont',
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  triangleDown: {
    backgroundColor: 'transparent',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF', 
  },
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

  // --- Custom Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
  },
  popupBackground: {
    width: '90%',
    maxWidth: 550,
    padding: 20,
    backgroundColor: '#E4D5B7', 
    borderWidth: 4,
    borderColor: '#4A2F1D',
    borderRadius: 8,
  },
  popupTitle: {
    fontFamily: 'PixelFont',
    fontSize: 22,
    color: '#4A2F1D',
    textAlign: 'center',
    marginBottom: 10,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  closeModalButton: {
    marginTop: 20,
    backgroundColor: '#8C5A35',
    borderWidth: 2,
    borderColor: '#4A2F1D',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  closeModalButtonText: {
    fontFamily: 'PixelFont',
    color: '#FFFFFF',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  }
});