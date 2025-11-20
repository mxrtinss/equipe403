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
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  
  const [notifications, setNotifications] = useState(true);
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
        darkMode: isDarkMode,
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando perfil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header fixo */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Configurações</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Perfil do usuário */}
          <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
            <View style={styles.avatarContainer}>
              {profile?.fotoPerfil ? (
                <Image source={{ uri: profile.fotoPerfil }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.separator, borderColor: colors.border }]}>
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
              )}
              <TouchableOpacity 
                style={[styles.editAvatarButton, { backgroundColor: colors.primary }]}
                onPress={handlePickImage}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.userName, { color: colors.text }]}>
              {profile?.nome || 'Usuário'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {profile?.email || user?.email}
            </Text>
            
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.separator, borderColor: colors.border }]}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary }]}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Configurações */}
          <View style={[styles.settingsSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
              Configurações
            </Text>
            
            <View style={[styles.settingItem, { borderBottomColor: colors.separator }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notificações</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notifications ? colors.primary : colors.textTertiary}
              />
            </View>

            <View style={[styles.settingItem, { borderBottomColor: colors.separator }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={24} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Escuro</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isDarkMode ? colors.primary : colors.textTertiary}
              />
            </View>

            <View style={[styles.settingItem, { borderBottomColor: colors.separator }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Serviços de Localização</Text>
              </View>
              <Switch
                value={locationServices}
                onValueChange={handleToggleLocation}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={locationServices ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>

          {/* Ações */}
          <View style={[styles.actionsSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
              Ações
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Sair da Conta</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setShowDeleteModal(true)}
            >
              <Ionicons name="trash-outline" size={24} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Excluir Conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal de Edição */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                  onPress={() => setShowEditModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
                <TouchableOpacity 
                  onPress={handleSaveProfile} 
                  disabled={saving}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.modalSaveText, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>
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
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Nome</Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: colors.inputBackground, 
                      borderColor: colors.inputBorder,
                      color: colors.text 
                    }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Digite seu nome"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: colors.inputBackground, 
                      borderColor: colors.inputBorder,
                      color: colors.text 
                    }]}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Digite seu email"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Foto de Perfil</Text>
                  {!!editPhoto && (
                    <Image source={{ uri: editPhoto }} style={styles.previewImage} />
                  )}
                  <TouchableOpacity 
                    style={[styles.editButton, styles.imagePickerButton, { 
                      backgroundColor: colors.separator, 
                      borderColor: colors.border 
                    }]} 
                    onPress={handlePickImage}
                  >
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={[styles.editButtonText, { color: colors.primary }]}>
                      Selecionar da Galeria
                    </Text>
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
          <View style={[styles.deleteModalOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.deleteModalContent, { backgroundColor: colors.card }]}>
              <Ionicons name="warning" size={48} color={colors.error} />
              <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Excluir Conta</Text>
              <Text style={[styles.deleteModalText, { color: colors.textSecondary }]}>
                Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity 
                  style={[styles.deleteModalCancel, { backgroundColor: colors.separator }]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={[styles.deleteModalCancelText, { color: colors.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deleteModalConfirm, { backgroundColor: colors.error }]}
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
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 15,
    fontSize: 16,
    flex: 1,
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
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
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveText: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContent: {
    borderRadius: 15,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  deleteModalText: {
    fontSize: 16,
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
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
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