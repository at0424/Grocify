import {
    ImageBackground,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const CustomPixelDatePicker = ({ visible, onClose, selectedDate, onDateSelect, title }) => {
  // Format the selected date to 'YYYY-MM-DD' for the calendar library
  const formattedDate = selectedDate.toISOString().split('T')[0];

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        
        {/* Your custom background image for the pop-up goes here */}
        <ImageBackground
          source={require('@/assets/images/meal_plan/WoodPopupBackground.png')} 
          style={styles.popupBackground}
          imageStyle={{ resizeMode: 'stretch' }}
        >
          <Text style={styles.popupTitle}>{title}</Text>

          <Calendar
            // The current selected date
            current={formattedDate}
            
            // Handler for when a day is tapped
            onDayPress={(day) => {
              // Convert the string back to a Date object
              const newDate = new Date(day.dateString);
              onDateSelect(newDate);
              onClose(); // Close modal automatically after picking
            }}
            
            // Mark the selected date so it highlights
            markedDates={{
              [formattedDate]: { selected: true, disableTouchEvent: true }
            }}
            
            // This is the magic part: Theming!
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent', // Makes the calendar see-through so your image shows
              textSectionTitleColor: '#4A2F1D', // Days of the week color
              selectedDayBackgroundColor: '#7A9B6B', // Your pixel art green
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#8C5A35', // Dark wood color for 'today'
              dayTextColor: '#333333',
              textDisabledColor: '#A9A9A9',
              monthTextColor: '#4A2F1D',
              arrowColor: '#4A2F1D',
              
              // Force your pixel art font on everything
              textDayFontFamily: 'PixelFont',
              textMonthFontFamily: 'PixelFont',
              textDayHeaderFontFamily: 'PixelFont',
              
              textDayFontSize: 16,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 14,
            }}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>

        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dims the background behind the pop-up
  },
  popupBackground: {
    width: '90%',
    maxWidth: 350,
    padding: 20,
    // If you don't have an image ready, this acts as a fallback wooden border
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
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#8C5A35',
    borderWidth: 2,
    borderColor: '#4A2F1D',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  closeButtonText: {
    fontFamily: 'PixelFont',
    color: '#FFFFFF',
    fontSize: 16,
  }
});

export default CustomPixelDatePicker;