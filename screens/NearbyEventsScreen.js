import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Linking, TextInput, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getNearbyEvents, kmDistance } from '../services/eventsApiService';
import { getEventsNearby as getEventsNearbyDb, addFavoriteEvent, removeFavoriteEvent, getUserFavorites } from '../services/firebaseConfig';

const NearbyEventsScreen = ({ navigation, route }) => {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [useTicketmaster, setUseTicketmaster] = useState(true);
  const [radius, setRadius] = useState(50);
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const flatListRef = useRef(null);

  // Categorias disponíveis
  const categories = [
    { id: 'all', name: 'Todos', icon: 'apps' },
    { id: 'Music', name: 'Música', icon: 'musical-notes' },
    { id: 'Sports', name: 'Esportes', icon: 'football' },
    { id: 'Arts & Theatre', name: 'Arte & Teatro', icon: 'color-palette' },
    { id: 'Film', name: 'Cinema', icon: 'film' },
    { id: 'Family', name: 'Família', icon: 'people' },
    { id: 'Miscellaneous', name: 'Outros', icon: 'ellipsis-horizontal' },
  ];

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

  // Carrega favoritos do usuário
  useEffect(() => {
    if (user?.uid) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user?.uid) return;
    try {
      const favorites = await getUserFavorites(user.uid);
      const ids = new Set(favorites.map(fav => fav.eventId));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  // Filtrar eventos quando a busca, categoria ou a lista mudar
  useEffect(() => {
    let filtered = events;

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => {
        const eventCategory = event.classifications || '';
        return eventCategory.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    // Filtro por busca
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
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
    }

    setFilteredEvents(filtered);
  }, [searchQuery, events, selectedCategory]);

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

  const handleToggleFavorite = async (event) => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Você precisa fazer login para favoritar eventos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    const isFavorited = favoriteIds.has(event.id);

    try {
      if (isFavorited) {
        // Remove dos favoritos
        await removeFavoriteEvent(user.uid, event.id);
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id);
          return newSet;
        });
      } else {
        // Adiciona aos favoritos - prepara objeto completo
        const favoriteEvent = {
          eventId: event.id, // ID único do evento
          title: event.title || event.name,
          image: event.image || null,
          date: event.date || null,
          time: event.time || null,
          venueName: event.venueName || null,
          address: event.address || null,
          city: event.city || null,
          state: event.state || null,
          url: event.url || null,
          latitude: event.latitude || null,
          longitude: event.longitude || null,
          createdAt: new Date().toISOString(),
        };
        
        await addFavoriteEvent(user.uid, favoriteEvent);
        setFavoriteIds(prev => new Set(prev).add(event.id));
        Alert.alert('Favoritado', 'Evento adicionado aos favoritos!\nVeja em "Meus Eventos".');
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error);
      Alert.alert('Erro', 'Não foi possível favoritar o evento.');
    }
  };

  const header = (
    <View style={[styles.header, { backgroundColor: 'white', borderBottomColor: '#e5e5e5' }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: '#1f2937' }]}>Eventos próximos</Text>
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
      <View style={[styles.container, { backgroundColor: '#f9fafb' }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: '#6b7280' }]}>
            {useTicketmaster ? 'Buscando eventos próximos...' : 'Carregando eventos...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#f9fafb' }]}> 
      {header}
      
      {/* Barra de pesquisa */}
      <View style={[styles.searchContainer, { backgroundColor: 'white', borderBottomColor: '#e5e5e5' }]}>
        <View style={[styles.searchBar, { backgroundColor: '#f5f5f5' }]}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: '#1f2937' }]}
            placeholder="Buscar eventos, locais, categorias..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Botão para mostrar/ocultar filtros */}
        {useTicketmaster && (
          <TouchableOpacity 
            style={[styles.toggleFiltersButton, { backgroundColor: '#f5f5f5' }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name={showFilters ? "funnel" : "funnel-outline"} 
              size={18} 
              color={showFilters ? '#8B5CF6' : '#6b7280'} 
            />
            <Text style={[
              styles.toggleFiltersText, 
              { color: showFilters ? '#8B5CF6' : '#6b7280' }
            ]}>
              Filtros
            </Text>
            <Ionicons 
              name={showFilters ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={showFilters ? '#8B5CF6' : '#6b7280'} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro de Categorias */}
      {useTicketmaster && showFilters && (
        <View style={[styles.categoryContainer, { backgroundColor: 'white', borderBottomColor: '#e5e5e5' }]}>
          <Text style={[styles.categoryLabel, { color: '#6b7280' }]}>Categorias:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: selectedCategory === cat.id ? '#8B5CF6' : '#f5f5f5',
                    borderColor: selectedCategory === cat.id ? '#8B5CF6' : '#e5e5e5',
                  }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={16} 
                  color={selectedCategory === cat.id ? 'white' : '#6b7280'} 
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === cat.id ? 'white' : '#1f2937' }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {useTicketmaster && showFilters && (
        <View style={[styles.filterContainer, { backgroundColor: 'white', borderBottomColor: '#e5e5e5' }]}>
          <Text style={[styles.filterLabel, { color: '#6b7280' }]}>Raio de busca:</Text>
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
          <Text style={[styles.resultCount, { color: '#6b7280' }]}>
            {searchQuery || selectedCategory !== 'all' 
              ? `${filteredEvents.length} resultado(s) encontrado(s)` 
              : `${events.length} evento(s) encontrado(s)`}
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
              { backgroundColor: 'white', borderColor: '#e5e5e5' },
              isHighlighted && styles.highlightedCard
            ]}> 
              {item.image ? (
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                </View>
              )}

              {/* Badge "Evento em Destaque" se vier do carrossel */}
              {isHighlighted && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={16} color="white" />
                  <Text style={styles.featuredBadgeText}>Evento em Destaque</Text>
                </View>
              )}

              {/* Botão de Favoritar */}
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => handleToggleFavorite(item)}
              >
                <Ionicons 
                  name={favoriteIds.has(item.id) ? "heart" : "heart-outline"} 
                  size={28} 
                  color={favoriteIds.has(item.id) ? "#EF4444" : "white"} 
                />
              </TouchableOpacity>

              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: '#1f2937' }]}>
                  {item.title || item.name}
                </Text>
                
                {item.date && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={[styles.cardSub, { color: '#6b7280', marginLeft: 6 }]}>
                      {item.date}
                    </Text>
                  </View>
                )}
                
                {item.venueName && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={[styles.cardSub, { color: '#6b7280', marginLeft: 6 }]}>
                      {item.venueName}
                    </Text>
                  </View>
                )}
                
                {item.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="navigate-circle-outline" size={16} color="#6b7280" />
                    <Text style={[styles.cardSub, { color: '#6b7280', marginLeft: 6 }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}
                
                {item.city && (
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={16} color="#6b7280" />
                    <Text style={[styles.cardSub, { color: '#6b7280', marginLeft: 6 }]}>
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
                    <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
                    <Text style={[styles.cardSub, { color: '#6b7280', marginLeft: 6 }]}>
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
            <Ionicons name={searchQuery ? "search" : "calendar-outline"} size={64} color="#9ca3af" />
            <Text style={[styles.emptyText, { color: '#6b7280' }]}>
              {searchQuery 
                ? `Nenhum evento encontrado para "${searchQuery}".\nTente buscar por outro termo.`
                : selectedCategory !== 'all'
                  ? `Nenhum evento encontrado na categoria "${categories.find(c => c.id === selectedCategory)?.name}".\nTente outra categoria.`
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
  toggleFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  toggleFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
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
  favoriteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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