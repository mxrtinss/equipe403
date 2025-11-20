import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Switch,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile, deleteAccount } from '../services/databaseService';
import { updateUserProfile as updateAuthProfile, updateUserEmail } from '../services/authService';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const ProfileSettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme, colors, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (user?.uid) {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        if (userProfile) {
          setEditName(userProfile.nome || '');
          setEditEmail(userProfile.email || '');
          setEditPhoto(userProfile.fotoPerfil || '');
          if (typeof userProfile.notifications === 'boolean') setNotifications(userProfile.notifications);
          if (typeof userProfile.darkMode === 'boolean') setDarkMode(userProfile.darkMode);
          if (typeof userProfile.locationServices === 'boolean') setLocationServices(userProfile.locationServices);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      const updates = {
        nome: editName,
        email: editEmail,
        fotoPerfil: editPhoto,
        notifications,
        darkMode,
        locationServices,
      };

      await updateUserProfile(user.uid, updates);

      if (editName && editName !== user.displayName) {
        await updateAuthProfile({ displayName: editName, photoURL: editPhoto || undefined });
      } else if (editPhoto) {
        await updateAuthProfile({ photoURL: editPhoto });
      }

      if (editEmail && editEmail !== user.email) {
        const emailResult = await updateUserEmail(editEmail);
        if (!emailResult.success) {
          Alert.alert('Aviso', emailResult.error);
        }
      }

      await loadProfile();
      
      setShowEditModal(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async (value) => {
    try {
      setNotifications(value);
      if (value) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          setNotifications(false);
          Alert.alert('Permissão necessária', 'Ative as permissões de notificações nas configurações.');
          return;
        }
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          const expoPushToken = tokenData?.data;
          if (expoPushToken && user?.uid) {
            await updateUserProfile(user.uid, { expoPushToken, notifications: true });
          }
        } catch (e) {
          console.log('Não foi possível obter token de push:', e?.message);
        }
      } else if (user?.uid) {
        await updateUserProfile(user.uid, { notifications: false });
      }
    } catch (error) {
      console.error('Erro ao alternar notificações:', error);
    }
  };

  const handleToggleLocation = async (value) => {
    try {
      setLocationServices(value);
      if (value) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationServices(false);
          Alert.alert('Permissão necessária', 'Ative as permissões de localização nas configurações.');
          return;
        }
        try {
          const position = await Location.getCurrentPositionAsync({});
          if (user?.uid) {
            await updateUserProfile(user.uid, {
              locationServices: true,
              lastKnownLocation: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp,
              }
            });
          }
        } catch (e) {
          console.log('Não foi possível obter localização:', e?.message);
        }
      } else if (user?.uid) {
        await updateUserProfile(user.uid, { locationServices: false });
      }
    } catch (error) {
      console.error('Erro ao alternar localização:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita acesso às fotos para trocar a imagem de perfil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const localUri = result.assets[0].uri;
        setEditPhoto(localUri);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      
      Alert.alert(
        'Confirmar Exclusão',
        'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              await deleteAccount(user.uid);
              await logout();
              navigation.navigate('Home');
              Alert.alert('Conta Excluída', 'Sua conta foi excluída com sucesso');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      Alert.alert('Erro', 'Erro ao excluir conta');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && { backgroundColor: '#0F172A' }]}>
      <View style={[styles.container, darkMode && { backgroundColor: '#0F172A' }]}>
        {/* Header fixo */}
        <View style={[styles.header, darkMode && { backgroundColor: '#111827', borderBottomColor: '#1F2937' }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, darkMode && { color: 'white' }]}>Configurações</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Perfil do usuário */}
          <View style={[styles.profileSection, darkMode && { backgroundColor: '#111827' }]}>
            <View style={styles.avatarContainer}>
              {profile?.fotoPerfil ? (
                <Image source={{ uri: profile.fotoPerfil }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, darkMode && { backgroundColor: '#1F2937', borderColor: '#374151' }]}>
                  <Ionicons name="person" size={40} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handlePickImage}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.userName, darkMode && { color: 'white' }]}>{profile?.nome || 'Usuário'}</Text>
            <Text style={[styles.userEmail, darkMode && { color: '#9CA3AF' }]}>{profile?.email || user?.email}</Text>
            
            <TouchableOpacity 
              style={[styles.editButton, darkMode && { backgroundColor: '#111827', borderColor: '#374151' }]}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={16} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
              <Text style={[styles.editButtonText, darkMode && { color: '#A78BFA' }]}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Configurações */}
          <View style={[styles.settingsSection, darkMode && { backgroundColor: '#111827' }]}>
            <Text style={[styles.sectionTitle, darkMode && { color: 'white', borderBottomColor: '#1F2937' }]}>Configurações</Text>
            
            <View style={[styles.settingItem, darkMode && { borderBottomColor: '#1F2937' }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={24} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
                <Text style={[styles.settingLabel, darkMode && { color: 'white' }]}>Notificações</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={notifications ? '#8B5CF6' : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingItem, darkMode && { borderBottomColor: '#1F2937' }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={24} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
                <Text style={[styles.settingLabel, darkMode && { color: 'white' }]}>Modo Escuro</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={(val) => { setDarkMode(val); toggleTheme(); }}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={darkMode ? '#8B5CF6' : '#9CA3AF'}
              />
            </View>

            <View style={[styles.settingItem, darkMode && { borderBottomColor: '#1F2937' }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="location-outline" size={24} color={darkMode ? '#A78BFA' : '#8B5CF6'} />
                <Text style={[styles.settingLabel, darkMode && { color: 'white' }]}>Serviços de Localização</Text>
              </View>
              <Switch
                value={locationServices}
                onValueChange={handleToggleLocation}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={locationServices ? '#8B5CF6' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Ações */}
          <View style={[styles.actionsSection, darkMode && { backgroundColor: '#111827' }]}>
            <Text style={[styles.sectionTitle, darkMode && { color: 'white', borderBottomColor: '#1F2937' }]}>Ações</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Sair da Conta</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setShowDeleteModal(true)}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Excluir Conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal de Edição */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setShowEditModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                <TouchableOpacity 
                  onPress={handleSaveProfile} 
                  disabled={saving}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.modalSaveText, saving && { opacity: 0.5 }]}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Digite seu nome"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Digite seu email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Foto de Perfil</Text>
                  {!!editPhoto && (
                    <Image source={{ uri: editPhoto }} style={styles.previewImage} />
                  )}
                  <TouchableOpacity style={[styles.editButton, styles.imagePickerButton]} onPress={handlePickImage}>
                    <Ionicons name="image-outline" size={16} color="#8B5CF6" />
                    <Text style={styles.editButtonText}>Selecionar da Galeria</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Modal de Confirmação de Exclusão */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContent}>
              <Ionicons name="warning" size={48} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Excluir Conta</Text>
              <Text style={styles.deleteModalText}>
                Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity 
                  style={styles.deleteModalCancel}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.deleteModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteModalConfirm}
                  onPress={handleDeleteAccount}
                  disabled={saving}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {saving ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileSection: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  actionsSection: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    alignSelf: 'center',
  },
  imagePickerButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default ProfileSettingsScreen;