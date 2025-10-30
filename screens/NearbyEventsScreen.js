import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { getEventsNearby as getEventsNearbyDb } from '../services/firebaseConfig';

// Componente principal da tela de eventos próximos
const NearbyEventsScreen = ({ navigation }) => {
  // Hook para acessar cores e tema do contexto
  const { colors, theme } = useTheme();
  // Estado para controlar o carregamento da tela
  const [loading, setLoading] = useState(true);
  // Estado para armazenar as coordenadas do usuário
  const [coords, setCoords] = useState(null);
  // Estado para armazenar a lista de eventos
  const [events, setEvents] = useState([]);

  // Hook para solicitar e obter a localização do usuário quando a tela é carregada
  useEffect(() => {
    (async () => {
      try {
        // Solicita permissão para acessar a localização
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Se a permissão for negada, mostra um alerta
          Alert.alert('Permissão', 'Precisamos da sua localização para buscar eventos próximos.');
          setLoading(false);
          return;
        }
        // Obtém a posição atual do usuário
        const loc = await Location.getCurrentPositionAsync({});
        // Armazena as coordenadas no estado
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {
        // Em caso de erro, mostra um alerta
        Alert.alert('Erro', 'Não foi possível obter localização.');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!coords) return;
      try {
        const list = await getEventsNearbyDb(coords.latitude, coords.longitude);
        setEvents(list);
      } catch (e) {
        Alert.alert('Erro', 'Falha ao buscar eventos próximos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [coords]);

  const header = (
    <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Eventos próximos</Text>
      <View style={styles.placeholder} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {header}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {header}
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const dist = item.latitude && item.longitude ? kmDistance(coords.latitude, coords.longitude, item.latitude, item.longitude) : null;

          return (
            <View style={[styles.card, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderColor: colors.border }]}> 
              {item.image ? <Image source={{ uri: item.image }} style={styles.cardImage} /> : null}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title || item.name}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{item.date}</Text>
                {dist != null && (
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{dist.toFixed(1)} km</Text>
                )}
                <TouchableOpacity style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => {}}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Ver Detalhes</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>Nenhum evento encontrado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 45, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 14 },
});

export default NearbyEventsScreen;


