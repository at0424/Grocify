import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, ImageBackground, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CollaboratorModal({ 
  visible, 
  onClose, 
  data, 
  currentUserId,
  onInvite,
  onRemove 
}) {
  const [addMode, setAddMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const success = await onInvite(emailInput.trim());
    setIsSubmitting(false);
    if (success) {
      setAddMode(false);
      setEmailInput('');
    }
  };

  const isOwner = data.myRole === 'owner';

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        
        <ImageBackground 
          source={require('@/components/images/Modal.png')} 
          style={styles.backgroundImage}
          resizeMode="contain"
        >
          {/* Main container for the modal content with proper padding to stay within borders */}
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List Members</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Main Content*/}
            <View style={styles.mainContent}>
              {!addMode && (
                <>
                  <Text style={styles.sectionLabel}>Team</Text>
                  <FlatList
                    data={data.collaborators || []}
                    keyExtractor={(item) => item.userId}
                    ListHeaderComponent={
                      <View style={styles.userRow}>
                        <View style={styles.userInfo}>
                          {/* Updated Avatar Colors */}
                          <View style={[styles.userAvatar, { backgroundColor: '#FFD54F', borderColor: '#8B5A2B' }]}><Ionicons name="star" size={14} color="#8B5A2B" /></View>
                          <Text style={styles.userName}>{isOwner ? "You (Owner)" : (data.ownerEmail || "Owner")}</Text>
                        </View>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const isMe = item.userId === currentUserId;

                      return (
                        <View style={styles.userRow}>
                          <View style={styles.userInfo}>
                            {/* Updated Avatar Colors */}
                            <View style={[styles.userAvatar, { backgroundColor: '#F0E0C0', borderColor: '#A08060' }]}><Ionicons name="person" size={14} color="#A08060" /></View>
                            <Text style={styles.userName} numberOfLines={1}>{isMe ? "You" : item.email}</Text>
                          </View>
                          
                          {/* OWNER KICKING OTHERS */}
                          {isOwner && !isMe && (
                            <TouchableOpacity onPress={() => onRemove(item.userId)}>
                              <Ionicons name="trash-outline" size={20} color="#E53935" />
                            </TouchableOpacity>
                          )}

                          {/* COLLABORATOR LEAVING (Removing Self) */}
                          {!isOwner && isMe && (
                            <TouchableOpacity onPress={() => onRemove(item.userId)} style={styles.leaveBtn}>
                              <Text style={styles.leaveText}>Leave</Text>
                              <Ionicons name="log-out-outline" size={20} color="#E53935" />
                            </TouchableOpacity>
                          )}

                        </View>
                      );
                    }}
                    style={{ maxHeight: 200, marginBottom: 20 }}
                  />

                  {/* ONLY OWNER CAN SEE INVITE BUTTON */}
                  {isOwner && (
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddMode(true)}>
                      <Ionicons name="person-add" size={18} color="white" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>Invite Member</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {addMode && (
                 <View>
                  <Text style={styles.sectionLabel}>Invite by Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="friend@gmail.com"
                    placeholderTextColor="#A08060"
                    value={emailInput}
                    onChangeText={(t) => setEmailInput(t.toLowerCase())}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddMode(false)}>
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0, marginLeft: 10 }]} onPress={handleInvitePress} disabled={isSubmitting}>
                      {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Send</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backgroundImage: {
    width: width * 0.9, 
    height: height * 0.65, 
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 30,
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10,
    marginTop: 10,
    height: 35,
    paddingHorizontal: 15,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: 'white', 
    letterSpacing: 1.2
  },
  
  // All other controls go here
  mainContent: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 15,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#8B5A2B', marginBottom: 10, marginTop: 10 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0E0C0' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  // Updated Avatar to be square with wooden borders
  userAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    borderWidth: 3,
    backgroundColor: '#F0E0C0', 
    borderColor: '#A08060',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  userName: { fontSize: 16, color: '#3E2723', maxWidth: '85%', fontWeight: '600' },
  
  // Updated Inputs and Buttons for Pixel Art Theme
  input: { 
    backgroundColor: '#FFF8DC', 
    padding: 16, 
    borderRadius: 8, 
    fontSize: 16, 
    marginBottom: 25, 
    borderWidth: 3, 
    borderColor: '#8B5A2B', 
    color: '#3E2723',
    fontWeight: '600',
  },
  primaryBtn: { 
    backgroundColor: '#718F64', 
    padding: 18, 
    borderRadius: 12, // slightly square corners
    borderWidth: 3,
    borderColor: '#5B764A',
    alignItems: 'center', 
    marginTop: 10, 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1.1 },
  cancelBtn: { 
    padding: 18, 
    borderRadius: 12, 
    backgroundColor: '#F0E0C0', 
    width: 100, 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#A08060' 
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  
  leaveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  leaveText: { color: '#E53935', fontWeight: 'bold', marginRight: 5, fontSize: 12 }
});