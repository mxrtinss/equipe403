import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { createEvent as createEventDb, updateEvent as updateEventDb, uploadImageAsync } from '../services/firebaseConfig';

const CreateEventScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const editing = !!route.params?.id;

  const [title, setTitle] = useState(route.params?.title || '');
  const [description, setDescription] = useState(route.params?.description || '');
  const [date, setDate] = useState(route.params?.date || '');
  const [time, setTime] = useState(route.params?.time || '');
  const [place, setPlace] = useState(route.params?.place || '');
  const [image, setImage] = useState(route.params?.image || '');
  const [coords, setCoords] = useState(route.params?.coords || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { 
        Alert.alert('Permissão necessária', 'Permita acesso à galeria para adicionar uma imagem.'); 
        return; 
      }
      const res = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [16, 9], 
        quality: 0.8 
      });
      if (!res.canceled && res.assets?.length) {
        setImage(res.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const useGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        Alert.alert('Permissão necessária', 'Autorize o acesso à localização.'); 
        return; 
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      });
      setPlace(`GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      Alert.alert('Localização obtida', 'Coordenadas GPS adicionadas ao local do evento.');
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Falha ao obter localização.');
    }
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite o título do evento.');
      return false;
    }
    if (!date.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite a data do evento.');
      return false;
    }
    if (!time.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite a hora do evento.');
      return false;
    }
    if (!place.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite o local do evento.');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      let imageUrl = image;
      if (image && image.startsWith('file:')) {
        imageUrl = await uploadImageAsync(image, `events/${user.uid}-${Date.now()}.jpg`);
      }
      
      const eventData = { 
        title, 
        description, 
        date, 
        time, 
        place, 
        image: imageUrl, 
        latitude: coords?.latitude || null, 
        longitude: coords?.longitude || null 
      };

      if (editing) {
        await updateEventDb(route.params.id, eventData);
        Alert.alert('Sucesso', 'Evento atualizado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await createEventDb({ uid: user.uid, ...eventData });
        Alert.alert('Sucesso', 'Evento criado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      Alert.alert('Erro', 'Falha ao salvar evento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header fixo */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editing ? 'Editar Evento' : 'Criar Evento'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            {/* Preview da imagem */}
            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.banner} />
                <TouchableOpacity 
                  style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                  onPress={() => setImage('')}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Botão selecionar imagem */}
            <TouchableOpacity 
              style={[styles.rowBtn, { backgroundColor: colors.separator, borderColor: colors.border }]} 
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={[styles.rowBtnText, { color: colors.primary }]}>
                {image ? 'Trocar imagem' : 'Selecionar imagem'}
              </Text>
            </TouchableOpacity>

            {/* Campo Título */}
            <Text style={[styles.label, { color: colors.text }]}>Título*</Text>
            <TextInput 
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder, 
                color: colors.text 
              }]} 
              value={title} 
              onChangeText={setTitle} 
              placeholder="Nome do evento" 
              placeholderTextColor={colors.inputPlaceholder} 
            />

            {/* Campo Descrição */}
            <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
            <TextInput 
              multiline 
              numberOfLines={4}
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder, 
                color: colors.text 
              }]} 
              value={description} 
              onChangeText={setDescription} 
              placeholder="Conte mais sobre o evento (opcional)" 
              placeholderTextColor={colors.inputPlaceholder}
              textAlignVertical="top"
            />

            {/* Campo Data */}
            <Text style={[styles.label, { color: colors.text }]}>Data*</Text>
            <TextInput 
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder, 
                color: colors.text 
              }]} 
              value={date} 
              onChangeText={setDate} 
              placeholder="Ex: 2024-12-25" 
              placeholderTextColor={colors.inputPlaceholder} 
            />

            {/* Campo Hora */}
            <Text style={[styles.label, { color: colors.text }]}>Hora*</Text>
            <TextInput 
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder, 
                color: colors.text 
              }]} 
              value={time} 
              onChangeText={setTime} 
              placeholder="Ex: 18:30" 
              placeholderTextColor={colors.inputPlaceholder} 
            />

            {/* Campo Local */}
            <Text style={[styles.label, { color: colors.text }]}>Local*</Text>
            <TextInput 
              style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                borderColor: colors.inputBorder, 
                color: colors.text 
              }]} 
              value={place} 
              onChangeText={setPlace} 
              placeholder="Endereço ou descrição do local" 
              placeholderTextColor={colors.inputPlaceholder}
              multiline
            />

            {/* Botão usar GPS */}
            <TouchableOpacity 
              style={[styles.rowBtn, { backgroundColor: colors.separator, borderColor: colors.border }]} 
              onPress={useGps}
            >
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.rowBtnText, { color: colors.primary }]}>
                {coords ? 'Atualizar localização GPS' : 'Usar localização GPS'}
              </Text>
            </TouchableOpacity>

            {/* Indicador de GPS */}
            {coords && (
              <View style={[styles.gpsIndicator, { backgroundColor: colors.separator }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.gpsIndicatorText, { color: colors.textSecondary }]}>
                  Localização GPS adicionada
                </Text>
              </View>
            )}

            {/* Botão Criar/Salvar */}
            <TouchableOpacity 
              style={[
                styles.submitBtn, 
                { backgroundColor: colors.primary },
                isSubmitting && styles.submitBtnDisabled
              ]} 
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting 
                  ? (editing ? 'Salvando...' : 'Criando...') 
                  : (editing ? 'Salvar alterações' : 'Criar Evento')
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 16,
    paddingBottom: 40,
  },
  form: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16,
  },
  label: { 
    marginTop: 16, 
    marginBottom: 8, 
    fontWeight: '600',
    fontSize: 16,
  },
  input: { 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    fontSize: 16, 
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitBtn: { 
    marginTop: 24, 
    borderRadius: 25, 
    paddingVertical: 15, 
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700',
  },
  rowBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    borderWidth: 1, 
    marginTop: 12,
  },
  rowBtnText: { 
    marginLeft: 8, 
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  banner: { 
    width: '100%', 
    height: 180, 
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  gpsIndicatorText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CreateEventScreen