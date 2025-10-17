import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { getEventsNearby as getEventsNearbyDb } from '../services/firebaseConfig';

const kmDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const NearbyEventsScreen = ({ navigation }) => {
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Precisamos da sua localização para buscar eventos próximos.');
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
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


