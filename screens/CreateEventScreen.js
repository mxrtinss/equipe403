import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { createEvent as createEventDb, updateEvent as updateEventDb, uploadImageAsync } from '../services/firebaseConfig';

const CreateEventScreen = ({ navigation, route }) => {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const editing = !!route.params?.id;

  const [title, setTitle] = useState(route.params?.title || '');
  const [description, setDescription] = useState(route.params?.description || '');
  const [date, setDate] = useState(route.params?.date || '');
  const [time, setTime] = useState(route.params?.time || '');
  const [place, setPlace] = useState(route.params?.place || '');
  const [image, setImage] = useState(route.params?.image || '');
  const [coords, setCoords] = useState(route.params?.coords || null);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permissão', 'Permita acesso à galeria.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16,9], quality: 0.8 });
      if (!res.canceled && res.assets?.length) setImage(res.assets[0].uri);
    } catch { Alert.alert('Erro', 'Não foi possível abrir a galeria.'); }
  };

  const useGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permissão', 'Autorize a localização.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setPlace(`GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
    } catch { Alert.alert('Erro', 'Falha ao obter localização.'); }
  };

  const validate = () => {
    if (!title.trim() || !date.trim() || !time.trim() || !place.trim()) {
      Alert.alert('Campos obrigatórios', 'Título, data, hora e local são obrigatórios.');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      let imageUrl = image;
      if (image && image.startsWith('file:')) {
        imageUrl = await uploadImageAsync(image, `events/${user.uid}-${Date.now()}.jpg`);
      }
      if (editing) {
        await updateEventDb(route.params.id, { title, description, date, time, place, image: imageUrl, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
        Alert.alert('Atualizado', 'Evento atualizado com sucesso.');
      } else {
        const id = await createEventDb({ uid: user.uid, title, description, date, time, place, image: imageUrl, latitude: coords?.latitude || null, longitude: coords?.longitude || null });
        Alert.alert('Sucesso', 'Evento criado com sucesso.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar evento.');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{editing ? 'Editar Evento' : 'Criar Evento'}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.form, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderColor: colors.border }]}> 
        {image ? <Image source={{ uri: image }} style={styles.banner} /> : null}
        <TouchableOpacity style={[styles.rowBtn]} onPress={pickImage}>
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text style={[styles.rowBtnText, { color: colors.primary }]}>Selecionar imagem</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Título*</Text>
        <TextInput style={[styles.input, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB', borderColor: colors.border, color: colors.textPrimary }]} value={title} onChangeText={setTitle} placeholder="Título do evento" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição</Text>
        <TextInput multiline style={[styles.input, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB', borderColor: colors.border, color: colors.textPrimary }]} value={description} onChangeText={setDescription} placeholder="Conte mais sobre o evento" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Data*</Text>
        <TextInput style={[styles.input, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB', borderColor: colors.border, color: colors.textPrimary }]} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Hora*</Text>
        <TextInput style={[styles.input, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB', borderColor: colors.border, color: colors.textPrimary }]} value={time} onChangeText={setTime} placeholder="HH:mm" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Local*</Text>
        <TextInput style={[styles.input, { backgroundColor: theme === 'dark' ? '#0F172A' : '#F9FAFB', borderColor: colors.border, color: colors.textPrimary }]} value={place} onChangeText={setPlace} placeholder="Endereço ou descrição" placeholderTextColor={theme === 'dark' ? '#6B7280' : '#666'} />
        <TouchableOpacity style={[styles.rowBtn]} onPress={useGps}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={[styles.rowBtnText, { color: colors.primary }]}>Usar GPS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={onSubmit}>
          <Text style={styles.submitText}>{editing ? 'Salvar alterações' : 'Criar Evento'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  form: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 16 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, borderWidth: 1 },
  submitBtn: { marginTop: 18, borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
  rowBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  rowBtnText: { marginLeft: 8, fontWeight: '600' },
  banner: { width: '100%', height: 160, borderRadius: 8, marginBottom: 10 },
});

export default CreateEventScreen;


