import { Ionicons } from '@expo/vector-icons';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StickyNote({ title, color, collaborators, onPress, actionIcon, onActionPress, style }) {

  // Sticky Notes Colour
  const getNoteImage = (colorHex) => {
    switch (colorHex) {
      case '#E1F5FE': return require('@/assets/images/listing/notes/BlueNote.png');
      case '#FFEBEE': return require('@/assets/images/listing/notes/PinkNote.png');
      case '#E8F5E9': return require('@/assets/images/listing/notes/GreenNote.png');
      case '#F3E5F5': return require('@/assets/images/listing/notes/PurpleNote.png');
      case '#FFF9C4':
      default:
        return require('@/assets/images/listing/notes/YellowNote.png');
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>

      <ImageBackground
        source={getNoteImage(color)}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        <View style={styles.innerContent}>

          {/* Header: List Title */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {/* Body: abstract lines to look like text */}
          <View style={styles.body}>
            <View style={[styles.line, { width: '90%' }]} />
            <View style={[styles.line, { width: '100%' }]} />
            <View style={[styles.line, { width: '85%' }]} />
            <View style={[styles.line, { width: '60%' }]} />
          </View>

          {/* Footer: Collaborators & Add Button */}
          <View style={styles.footer}>

            {/* Right: Add Collaborator Icon */}
            <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
              <Ionicons
                name={actionIcon || "person-add-outline"}
                size={20}
                color="#555"
              />
            </TouchableOpacity>
            
            {/* Left: Collaborator Avatars (Overlapping) */}
            <View style={styles.collaboratorStack}>
              {collaborators.map((collab, index) => (
                <View
                  key={index}
                  style={[
                    styles.avatarCircle,
                    // Shift subsequent circles to the right to create overlap
                    { transform: [{ translateX: -10 * index }], zIndex: -index }
                  ]}
                >
                  {/* If you have images, use <Image> here. Using colored Views for placeholder */}
                  <View style={[styles.avatarPlaceholder, { backgroundColor: collab.color || '#ddd' }]} />
                </View>
              ))}
            </View>

            

          </View>
        </View>
      </ImageBackground>

    </TouchableOpacity>
  );
}

const { width, height } = Dimensions.get('window');
const isTabletView = width > 600;

const styles = StyleSheet.create({
  container: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 20,
  },
  backgroundImage: {
    height: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  innerContent: {
    flex: 1,
    paddingTop: 35,
    paddingBottom: 25,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: isTabletView ? 18 : 12,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    marginBottom: 10,
    marginTop: isTabletView && 15,
    textAlign: 'center',
    includeFontPadding: false
  },
  body: {
    flex: 1,
    gap: 6,
    paddingHorizontal: 5
  },
  line: {
    height: 4,
    backgroundColor: 'rgba(62, 39, 35, 0.15)',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 30,
    paddingRight: 10
  },
  collaboratorStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});