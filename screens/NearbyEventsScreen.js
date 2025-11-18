import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Linking, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getNearbyEvents, kmDistance } from '../services/eventsApiService';
import { getEventsNearby as getEventsNearbyDb } from '../services/firebaseConfig';

const NearbyEventsScreen = ({ navigation, route }) => {
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [useTicketmaster, setUseTicketmaster] = useState(true);
  const [radius, setRadius] = useState(50);
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const flatListRef = useRef(null);

  // Recebe evento selecionado do carrossel da Home
  useEffect(() => {
    if (route.params?.selectedEvent && route.params?.scrollToEvent) {
      const selectedEvent = route.params.selectedEvent;
      setHighlightedEventId(selectedEvent.id);
      
      // Aguarda um pouco para garantir que a lista foi renderizada
      setTimeout(() => {
        const eventIndex = filteredEvents.findIndex(e => e.id === selectedEvent.id);
        if (eventIndex !== -1 && flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: eventIndex,
            animated: true,
            viewPosition: 0.5, // Centraliza o item na tela
          });
        }
      }, 500);

      // Remove o highlight após 3 segundos
      setTimeout(() => {
        setHighlightedEventId(null);
      }, 3000);
    }
  }, [route.params, filteredEvents]);

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
    if (coords && useTicketmaster) {
      fetchEvents();
    } else if (coords && !useTicketmaster) {
      fetchFirebaseEvents();
    }
  }, [coords, radius, useTicketmaster]);

  // Filtrar eventos quando a busca ou a lista mudar
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = events.filter(event => {
        const title = (event.title || event.name || '').toLowerCase();
        const city = (event.city || '').toLowerCase();
        const venueName = (event.venueName || '').toLowerCase();
        const category = (event.classifications || event.categories || '').toLowerCase();
        
        return (
          title.includes(query) ||
          city.includes(query) ||
          venueName.includes(query) ||
          category.includes(query)
        );
      });
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getNearbyEvents(coords.latitude, coords.longitude, radius);
      setEvents(data);
      setFilteredEvents(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os eventos. Verifique sua conexão e tente novamente.');
      console.error(error);
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseEvents = async () => {
    setLoading(true);
    try {
      const data = await getEventsNearbyDb(coords.latitude, coords.longitude);
      setEvents(data);
      setFilteredEvents(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os eventos do banco de dados.');
      console.error(error);
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
  };

  const handleOpenUrl = (url, title) => {
    if (url) {
      Alert.alert(
        title,
        'Deseja abrir o evento no navegador?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir', 
            onPress: () => Linking.openURL(url).catch(err => {
              Alert.alert('Erro', 'Não foi possível abrir o link.');
              console.error(err);
            })
          }
        ]
      );
    } else {
      Alert.alert('Aviso', 'Link não disponível para este evento.');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const navigateToMap = () => {
    navigation.navigate('EventsMap', {
      events: filteredEvents,
      coords: coords,
      useTicketmaster: useTicketmaster,
      radius: radius,
    });
  };

  const header = (
    <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Eventos próximos</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={navigateToMap}
        >
          <Ionicons 
            name="map-outline" 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setUseTicketmaster(!useTicketmaster)}
        >
          <Ionicons 
            name={useTicketmaster ? "ticket" : "home"} 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {useTicketmaster ? 'Buscando eventos próximos...' : 'Carregando eventos...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {header}
      
      {/* Barra de pesquisa */}
      <View style={[styles.searchContainer, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? colors.background : '#f5f5f5' }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar eventos, locais, categorias..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {useTicketmaster && (
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
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {searchQuery ? `${filteredEvents.length} resultado(s) encontrado(s)` : `${events.length} evento(s) encontrado(s)`}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredEvents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        onScrollToIndexFailed={(info) => {
          // Fallback caso o scroll falhe
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        renderItem={({ item }) => {
          const dist = item.distance || (item.latitude && item.longitude && coords 
            ? kmDistance(coords.latitude, coords.longitude, item.latitude, item.longitude) 
            : null);

          // Verifica se este card deve ser destacado
          const isHighlighted = highlightedEventId === item.id;

          return (
            <View style={[
              styles.card, 
              { backgroundColor: theme === 'dark' ? colors.card : 'white', borderColor: colors.border },
              isHighlighted && styles.highlightedCard
            ]}> 
              {item.image ? (
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                </View>
              )}

              {/* Badge "Evento em Destaque" se vier do carrossel */}
              {isHighlighted && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={16} color="white" />
                  <Text style={styles.featuredBadgeText}>Evento em Destaque</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title || item.name}
                </Text>
                
                {item.date && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardSub, { color: colors.textSecondary, marginLeft: 6 }]}>
                      {item.date}
                    </Text>
                  </View>
                )}
                
                {item.venueName && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardSub, { color: colors.textSecondary, marginLeft: 6 }]}>
                      {item.venueName}
                    </Text>
                  </View>
                )}
                
                {item.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="navigate-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardSub, { color: colors.textSecondary, marginLeft: 6 }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}
                
                {item.city && (
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardSub, { color: colors.textSecondary, marginLeft: 6 }]}>
                      {item.city}{item.state ? ` - ${item.state}` : ''}
                    </Text>
                  </View>
                )}
                
                {dist != null && (
                  <View style={styles.infoRow}>
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <Text style={[styles.cardSub, { color: colors.primary, marginLeft: 6, fontWeight: '600' }]}>
                      {dist.toFixed(1)} km de distância
                    </Text>
                  </View>
                )}

                {item.priceRange && (
                  <View style={styles.infoRow}>
                    <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardSub, { color: colors.textSecondary, marginLeft: 6 }]}>
                      R$ {item.priceRange.min} - R$ {item.priceRange.max}
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.detailsButton, { backgroundColor: colors.primary }]} 
                  onPress={() => handleOpenUrl(item.url, item.title)}
                >
                  <Text style={styles.detailsButtonText}>
                    Ver no Ticketmaster
                  </Text>
                  <Ionicons name="open-outline" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={searchQuery ? "search" : "calendar-outline"} size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery 
                ? `Nenhum evento encontrado para "${searchQuery}".\nTente buscar por outro termo.`
                : useTicketmaster
                  ? 'Nenhum evento encontrado próximo a você.\nTente aumentar o raio de busca.'
                  : 'Nenhum evento encontrado no banco de dados.'}
            </Text>
            {useTicketmaster && events.length === 0 && !searchQuery && (
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={fetchEvents}
              >
                <Ionicons name="refresh-outline" size={20} color="white" />
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
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
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 8,
  },
  mapButton: { padding: 8 },
  switchButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
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
    marginTop: 12,
    fontWeight: '600',
  },
  card: { 
    borderWidth: 1, 
    borderRadius: 12, 
    marginBottom: 12, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightedCard: {
    borderWidth: 3,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 1,
  },
  featuredBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardImage: { 
    width: '100%', 
    height: 180 
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { padding: 12 },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 8 
  },
  cardSub: { 
    fontSize: 14,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default NearbyEventsScreen;