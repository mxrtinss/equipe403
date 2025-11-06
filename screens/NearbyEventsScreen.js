import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getNearbyEvents, kmDistance } from '../services/eventsApiService';
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
  // Estado para controlar qual fonte de dados usar
  const [useSymplaApi, setUseSymplaApi] = useState(true);
  // Estado para o raio de busca
  const [radius, setRadius] = useState(50);

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

  // Hook para buscar eventos quando as coordenadas estiverem disponíveis
  useEffect(() => {
    (async () => {
      if (!coords) return;
      try {
        setLoading(true);
        let list = [];
        
        if (useSymplaApi) {
          // Busca eventos da API do Sympla
          try {
            list = await getNearbyEvents(coords.latitude, coords.longitude, radius);
            console.log('Eventos encontrados do Sympla:', list.length);
          } catch (apiError) {
            console.error('Erro ao buscar do Sympla, tentando Firebase...', apiError);
            // Fallback para o Firebase em caso de erro
            list = await getEventsNearbyDb(coords.latitude, coords.longitude);
            Alert.alert('Aviso', 'Usando eventos do banco local. A API do Sympla pode estar temporariamente indisponível.');
          }
        } else {
          // Busca eventos do Firebase
          list = await getEventsNearbyDb(coords.latitude, coords.longitude);
        }
        
        setEvents(list);
      } catch (e) {
        console.error('Erro geral:', e);
        Alert.alert('Erro', 'Falha ao buscar eventos próximos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [coords, useSymplaApi, radius]);

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
  };

  const header = (
    <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Eventos próximos</Text>
      <TouchableOpacity 
        style={styles.switchButton}
        onPress={() => setUseSymplaApi(!useSymplaApi)}
      >
        <Ionicons 
          name={useSymplaApi ? "cloud" : "home"} 
          size={24} 
          color={colors.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {header}
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Buscando eventos{useSymplaApi ? ' do Sympla' : ''}...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {header}
      
      {/* Filtro de raio - apenas para API Sympla */}
      {useSymplaApi && (
        <View style={[styles.filterContainer, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Raio de busca:</Text>
          <View style={styles.radiusButtons}>
            {[10, 25, 50, 100].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.radiusButton, 
                  { borderColor: colors.primary },
                  radius === r && { backgroundColor: colors.primary }
                ]}
                onPress={() => handleRadiusChange(r)}
              >
                <Text style={[
                  styles.radiusText, 
                  { color: radius === r ? 'white' : colors.primary }
                ]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const dist = item.distance || (item.latitude && item.longitude && coords 
            ? kmDistance(coords.latitude, coords.longitude, item.latitude, item.longitude) 
            : null);

          return (
            <View style={[styles.card, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderColor: colors.border }]}> 
              {item.image ? (
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title || item.name}
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  📅 {item.date}
                </Text>
                {dist != null && (
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    📍 {dist.toFixed(1)} km de distância
                  </Text>
                )}
                {item.city && (
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {item.city}{item.state ? ` - ${item.state}` : ''}
                  </Text>
                )}
                <TouchableOpacity 
                  style={{ marginTop: 8, alignSelf: 'flex-start' }} 
                  onPress={() => {
                    if (item.url) {
                      // Poderia abrir o link do evento
                      Alert.alert('Evento', `URL: ${item.url}`);
                    }
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    Ver Detalhes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
            {useSymplaApi 
              ? 'Nenhum evento do Sympla encontrado próximo a você. Tente aumentar o raio de busca.'
              : 'Nenhum evento encontrado.'}
          </Text>
        }
        ListHeaderComponent={
          events.length > 0 ? (
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {events.length} {events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
              {useSymplaApi ? ' (Sympla)' : ' (Local)'}
            </Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 45, 
    borderBottomWidth: 1 
  },
  backButton: { padding: 8 },
  switchButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  radiusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  card: { 
    borderWidth: 1, 
    borderRadius: 12, 
    marginBottom: 12, 
    overflow: 'hidden' 
  },
  cardImage: { 
    width: '100%', 
    height: 180 
  },
  cardBody: { padding: 12 },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  cardSub: { 
    fontSize: 14,
    marginBottom: 2 
  },
});

export default NearbyEventsScreen;