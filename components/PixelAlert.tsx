// components/PixelAlert.tsx
import React from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

interface PixelAlertProps {
  visible: boolean;
  title: string;
  message?: string; 
  items?: string[]; 
  showCancel?: boolean; 
  confirmText?: string; 
  onConfirm?: () => void; 
  secondaryActionText?: string;   
  onSecondaryAction?: () => void; 
  onClose: () => void;
}

export const PixelAlert: React.FC<PixelAlertProps> = ({ 
  visible, 
  title, 
  message,
  items = [], 
  showCancel = false,
  confirmText = "OK",
  onConfirm,
  secondaryActionText,
  onSecondaryAction,
  onClose 
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        {/* Tapping the dark background will trigger onClose */}
        <TouchableOpacity 
           style={styles.backdrop} 
           activeOpacity={1} 
           onPress={onClose} 
        />

        {/* --- 1. Main Wrapper --- */}
        <View style={styles.alertWindow}>
          
          {/* --- 2. Background Image Layer --- */}
          <Image
            source={require('@/assets/images/meal_plan/MealPlanFooter.png')} 
            style={styles.backgroundImage}
            resizeMode="stretch"
          />

          {/* --- 3. Foreground Content Layer --- */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <Text style={styles.alertTitle}>{title}</Text>

            {/* Message Text */}
            {message ? (
              <Text style={styles.messageText}>{message}</Text>
            ) : null}

            {/* List of items */}
            {items.length > 0 && (
              <View style={styles.itemsList}>
                {items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    • {item}
                  </Text>
                ))}
              </View>
            )}

            {/* --- Dynamic Buttons Area --- */}
            <View style={styles.buttonRow}>
              
              {/* Main Confirm/OK Button (Green) */}
              <TouchableOpacity 
                style={[styles.button, !showCancel && !secondaryActionText && { maxWidth: 160 }]} 
                onPress={onConfirm ? onConfirm : onClose}
              >
                <View style={styles.buttonBackground}>
                  <Image
                    source={require('@/assets/images/freshness/GreenButton.png')} 
                    style={styles.buttonImage}
                    resizeMode="stretch"
                  />
                  <Text style={styles.buttonText}>{confirmText}</Text>
                </View>
              </TouchableOpacity>

              {/* Secondary Action Button */}
              {secondaryActionText && (
                 <TouchableOpacity style={styles.button} onPress={onSecondaryAction}>
                   <View style={styles.buttonBackground}>
                     <Image
                       source={require('@/assets/images/freshness/OrangeButton.png')} 
                       style={styles.buttonImage}
                       resizeMode="stretch"
                     />
                     <Text style={[styles.buttonText, { color: '#FFFF' }]}>
                       {secondaryActionText}
                     </Text>
                   </View>
                 </TouchableOpacity>
              )}

              {/* Show Cancel button only if requested (Wood / Cream Text) */}
              {showCancel && (
                <TouchableOpacity style={styles.button} onPress={onClose}>
                  <View style={styles.buttonBackground}>
                    <Image
                      source={require('@/assets/images/freshness/OrangeButton.png')} 
                      style={styles.buttonImage}
                      resizeMode="stretch"
                    />
                    <Text style={[styles.buttonText, { color: '#F3E8D6' }]}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              )}

            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  alertWindow: {
    width: isTabletView ? 420 : width * 0.85, 
    minHeight: 220, 
    justifyContent: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: isTabletView ? 50 : 25,
    paddingTop: isTabletView ? 50 : 30,
    paddingBottom: isTabletView ? 40 : 25,
    alignItems: 'center',
  },
  alertTitle: {
    fontFamily: 'PixelFont',
    fontSize: isTabletView ? 24 : 20,
    color: '#3E2723', 
    marginBottom: 20,
    textAlign: 'center',
  },
  messageText: { 
    fontFamily: 'PixelFont', 
    fontSize: isTabletView ? 16 : 14, 
    color: '#6D4C41', 
    marginBottom: 25, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  itemsList: {
    alignSelf: 'center',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 280, 
    marginBottom: 30,
  },
  itemText: {
    fontFamily: 'PixelFont',
    fontSize: isTabletView ? 16 : 14,
    color: '#6D4C41', 
    marginBottom: 10,
    lineHeight: 20,
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    width: '100%', 
    marginTop: 'auto', 
    gap: 15 
  },
  button: {
    flex: 1,
    height: isTabletView ? 60 : 50,
    maxWidth: 200,
  },
  buttonBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  buttonText: {
    fontFamily: 'PixelFont',
    fontSize: isTabletView ? 14 : 12, 
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    zIndex: 1, 
  },
});