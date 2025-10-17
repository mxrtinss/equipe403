import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile as getUserProfileDoc, updateUserProfile as updateUserProfileDoc, uploadImageAsync } from '../services/firebaseConfig';

const EditProfileScreen = ({ navigation, route }) => {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const profile = await getUserProfileDoc(user.uid);
        if (profile) {
          setName(profile.nome || '');
          setBio(profile.bio || '');
          setPhoto(profile.fotoPerfil || '');
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Permita acesso à galeria para escolher uma imagem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
      if (!result.canceled && result.assets?.length) setPhoto(result.assets[0].uri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let photoURL = photo;
      if (photo && photo.startsWith('file:')) {
        photoURL = await uploadImageAsync(photo, `users/${user.uid}.jpg`);
      }
      await updateUserProfileDoc(user.uid, { nome: name, bio, fotoPerfil: photoURL });
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? colors.background : '#f5f5f5' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme === 'dark' ? colors.background : '#f5f5f5' }]}> 
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Perfil</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.section, { backgroundColor: theme === 'dark' ? colors.card : 'white' }]}> 
        <View style={styles.avatarRow}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
          )}
          <TouchableOpacity style={styles.changePhoto} onPress={pickImage}>
            <Ionicons name="image-outline" size={16} color={colors.primary} />
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Selecionar da Galeria</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Nome</Text>
          <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB' }]} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Bio</Text>
          <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB' }]} value={bio} onChangeText={setBio} placeholder="Conte um pouco sobre você" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} multiline />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  section: { paddingVertical: 24, paddingHorizontal: 20 },
  avatarRow: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  changePhoto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 },
  changePhotoText: { marginLeft: 8, fontSize: 16, fontWeight: '600' },
  inputGroup: { marginTop: 12 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, borderWidth: 1 },
  saveButton: { marginTop: 24, borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

export default EditProfileScreen;


