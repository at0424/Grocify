import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StickyNote({ title, collaborators, onPress, actionIcon, onActionPress, style }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      
      {/* Header: List Title */}
      <Text style={styles.title} numberOfLines={1}>
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

        {/* Right: Add Collaborator Icon */}
        <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
        <Ionicons 
           name={actionIcon || "person-add-outline"} 
           size={20} 
           color="#555" 
        />
      </TouchableOpacity>

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FDFD96', 
    width: '45%', 
    aspectRatio: 1, 
    padding: 15,
    marginBottom: 20,
    borderRadius: 4, 
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    gap: 6, 
  },
  line: {
    height: 4,
    backgroundColor: '#E3E388',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 30,
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
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
});