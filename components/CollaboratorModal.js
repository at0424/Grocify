import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function CollaboratorModal({ 
  visible, 
  onClose, 
  data, // Expects { collaborators: [], ownerEmail: '', myRole: '' }
  currentUserId,
  onInvite 
}) {
  const [addMode, setAddMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setAddMode(false);
      setEmailInput('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleInvitePress = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) return;
    
    setIsSubmitting(true);
    // Call parent function, expect it to return success true/false
    const success = await onInvite(emailInput.trim());
    setIsSubmitting(false);

    if (success) {
      // If parent says success, we reset the view
      setAddMode(false);
      setEmailInput('');
    }
  };

  const isOwner = data.myRole === 'owner';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { minHeight: 300 }]}>
          
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>List Members</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* VIEW 1: MEMBER LIST */}
          {!addMode && (
            <>
              <Text style={styles.sectionLabel}>Team</Text>
              <FlatList
                data={data.collaborators || []}
                keyExtractor={(item) => item.userId}
                
                // OWNER HEADER
                ListHeaderComponent={
                  <View style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <View style={[styles.userAvatar, { backgroundColor: '#FFD54F' }]}>
                        <Ionicons name="star" size={14} color="white" />
                      </View>
                      <Text style={styles.userName}>
                        {isOwner ? "You (Owner)" : (data.ownerEmail || "Owner")}
                      </Text>
                    </View>
                  </View>
                }

                // MEMBER ITEMS
                renderItem={({ item }) => (
                  <View style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={14} color="white" />
                      </View>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.userId === currentUserId ? "You" : item.email}
                      </Text>
                    </View>
                  </View>
                )}
                style={{ maxHeight: 200, marginBottom: 20 }}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddMode(true)}>
                <Ionicons name="person-add" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Invite Member</Text>
              </TouchableOpacity>
            </>
          )}

          {/* VIEW 2: ADD MEMBER INPUT */}
          {addMode && (
            <View>
              <Text style={styles.sectionLabel}>Invite by Email</Text>
              <TextInput
                style={styles.input}
                placeholder="friend@gmail.com"
                value={emailInput}
                onChangeText={(t) => setEmailInput(t.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddMode(false)}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0, marginLeft: 10 }]}
                  onPress={handleInvitePress}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 30, minHeight: 450, paddingBottom: 50, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 10, marginTop: 10 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#CFD8DC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userName: { fontSize: 16, color: '#333', maxWidth: '85%' },
  input: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 15, fontSize: 18, marginBottom: 25, borderWidth: 1, borderColor: '#EEE', color: '#333' },
  primaryBtn: { backgroundColor: '#718F64', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 18, borderRadius: 15, backgroundColor: '#F5F5F5', width: 100, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
});