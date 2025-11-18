import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getNearbyEvents, kmDistance } from '../services/eventsApiService';
import { getEventsNearby as getEventsNearbyDb } from '../services/firebaseConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EventsMapScreen = ({ navigation, route }) => {
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [events, setEvents] = useState([]);
  const [useTicketmaster, setUseTicketmaster] = useState(true);
  const [radius, setRadius] = useState(50);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const webViewRef = useRef(null);

  // Recebe eventos da navegação (opcional)
  useEffect(() => {
    if (route.params?.events && route.params?.coords) {
      const { events: routeEvents, coords: routeCoords, useTicketmaster: routeUseTicketmaster, radius: routeRadius } = route.params;
      setEvents(routeEvents);
      setCoords(routeCoords);
      setUseTicketmaster(routeUseTicketmaster || true);
      setRadius(routeRadius || 50);
      setLoading(false);
    }
  }, [route.params]);

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
        const userCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCoords(userCoords);
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível obter localização.');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (coords && useTicketmaster && !route.params?.events) {
      fetchEvents();
    } else if (coords && !useTicketmaster && !route.params?.events) {
      fetchFirebaseEvents();
    }
  }, [coords, radius, useTicketmaster]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getNearbyEvents(coords.latitude, coords.longitude, radius);
      setEvents(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os eventos. Verifique sua conexão e tente novamente.');
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseEvents = async () => {
    setLoading(true);
    try {
      const data = await getEventsNearbyDb(coords.latitude, coords.longitude);
      setEvents(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os eventos do banco de dados.');
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseDetail = () => {
    setSelectedEvent(null);
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

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
  };

  // Filtra eventos com coordenadas válidas
  const eventsWithCoords = events.filter(
    e => e.latitude != null && e.longitude != null && 
         !isNaN(e.latitude) && !isNaN(e.longitude)
  );

  // Gera HTML do mapa usando OpenStreetMap com Leaflet (gratuito, sem API key)
  const generateMapHTML = () => {
    if (!coords || eventsWithCoords.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; text-align: center; }
            </style>
          </head>
          <body>
            <h2>Carregando mapa...</h2>
          </body>
        </html>
      `;
    }

    // Calcula o centro e zoom
    const latitudes = [...eventsWithCoords.map(e => e.latitude), coords.latitude];
    const longitudes = [...eventsWithCoords.map(e => e.longitude), coords.longitude];
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Cria marcadores para os eventos
    const markers = eventsWithCoords.map((event, index) => {
      const dist = event.distance != null ? event.distance.toFixed(1) : 
                   (event.latitude && event.longitude && coords 
                    ? kmDistance(coords.latitude, coords.longitude, event.latitude, event.longitude).toFixed(1)
                    : 'N/A');
      
      return `
        {
          lat: ${event.latitude},
          lng: ${event.longitude},
          title: ${JSON.stringify(event.title || event.name || 'Evento')},
          label: ${index + 1},
          info: {
            title: ${JSON.stringify(event.title || event.name || 'Evento')},
            venue: ${JSON.stringify(event.venueName || '')},
            city: ${JSON.stringify(event.city || '')},
            state: ${JSON.stringify(event.state || '')},
            date: ${JSON.stringify(event.date || '')},
            distance: '${dist}',
            url: ${JSON.stringify(event.url || '')}
          }
        }
      `;
    }).join(',');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            #map { width: 100%; height: 100vh; }
            .custom-popup {
              font-family: Arial, sans-serif;
            }
            .custom-popup h3 {
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: bold;
              color: #333;
            }
            .custom-popup p {
              margin: 4px 0;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            // Inicializa o mapa
            const map = L.map('map').setView([${centerLat}, ${centerLon}], 12);

            // Adiciona tiles do OpenStreetMap (gratuito, sem API key)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            // Marcador da localização do usuário (azul)
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: '<div style="background-color: #4285F4; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div></div>',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });

            const userMarker = L.marker([${coords.latitude}, ${coords.longitude}], {
              icon: userIcon,
              title: 'Sua localização'
            }).addTo(map);

            // Marcadores dos eventos
            const eventMarkers = [${markers}];
            const bounds = [[${coords.latitude}, ${coords.longitude}]];

            eventMarkers.forEach((markerData) => {
              // Ícone customizado para eventos (vermelho)
              const eventIcon = L.divIcon({
                className: 'event-marker',
                html: '<div style="background-color: #FF6B6B; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-weight: bold; text-align: center; line-height: 30px; font-size: 14px;">' + markerData.label + '</div></div>',
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36]
              });

              const marker = L.marker([markerData.lat, markerData.lng], {
                icon: eventIcon,
                title: markerData.title
              });

              // Conteúdo do popup
              const popupContent = \`
                <div class="custom-popup">
                  <h3>\${markerData.info.title}</h3>
                  \${markerData.info.date ? '<p>📅 ' + markerData.info.date + '</p>' : ''}
                  \${markerData.info.venue ? '<p>📍 ' + markerData.info.venue + '</p>' : ''}
                  \${markerData.info.city ? '<p>🏙️ ' + markerData.info.city + (markerData.info.state ? ', ' + markerData.info.state : '') + '</p>' : ''}
                  \${markerData.info.distance !== 'N/A' ? '<p>📏 ' + markerData.info.distance + ' km</p>' : ''}
                </div>
              \`;

              marker.bindPopup(popupContent);
              marker.addTo(map);

              // Quando o marcador é clicado, envia mensagem para o React Native
              marker.on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerClick',
                  data: markerData.info
                }));
              });

              bounds.push([markerData.lat, markerData.lng]);
            });

            // Ajusta o zoom para incluir todos os marcadores
            map.fitBounds(bounds, { padding: [50, 50] });
          </script>
        </body>
      </html>
    `;
  };

  // Listener para mensagens do WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') {
        const event = eventsWithCoords.find(e => 
          (e.title || e.name) === data.data.title
        );
        if (event) {
          setSelectedEvent({
            ...event,
            distance: data.data.distance !== 'N/A' ? parseFloat(data.data.distance) : null
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem do mapa:', error);
    }
  };

  const header = (
    <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderBottomColor: colors.border }]}> 
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mapa de Eventos</Text>
      <TouchableOpacity 
        style={styles.switchButton}
        onPress={() => {
          setUseTicketmaster(!useTicketmaster);
          setSelectedEvent(null);
        }}
      >
        <Ionicons 
          name={useTicketmaster ? "ticket" : "home"} 
          size={24} 
          color={colors.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  if (loading && !coords) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando mapa...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {header}
      
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
            {eventsWithCoords.length} evento(s) no mapa
          </Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        {coords && eventsWithCoords.length > 0 ? (
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleMessage}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Carregando mapa...
                </Text>
              </View>
            )}
          />
        ) : !loading && coords ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum evento com localização disponível no mapa.
            </Text>
            {useTicketmaster && (
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={fetchEvents}
              >
                <Ionicons name="refresh-outline" size={20} color="white" />
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando mapa...
            </Text>
          </View>
        )}

        {/* Painel de detalhes do evento selecionado */}
        {selectedEvent && (
          <View style={[styles.detailCard, { backgroundColor: theme === 'dark' ? colors.card : 'white', borderColor: colors.border }]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseDetail}
            >
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.detailTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {selectedEvent.title || selectedEvent.name}
            </Text>

            {selectedEvent.date && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary, marginLeft: 6 }]}>
                  {selectedEvent.date}
                </Text>
              </View>
            )}

            {selectedEvent.venueName && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary, marginLeft: 6 }]} numberOfLines={1}>
                  {selectedEvent.venueName}
                </Text>
              </View>
            )}

            {selectedEvent.city && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary, marginLeft: 6 }]}>
                  {selectedEvent.city}{selectedEvent.state ? ` - ${selectedEvent.state}` : ''}
                </Text>
              </View>
            )}

            {selectedEvent.distance != null && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.primary, marginLeft: 6, fontWeight: '600' }]}>
                  {typeof selectedEvent.distance === 'number' 
                    ? selectedEvent.distance.toFixed(1) 
                    : selectedEvent.distance} km de distância
                </Text>
              </View>
            )}

            {selectedEvent.url && (
              <TouchableOpacity 
                style={[styles.detailsButton, { backgroundColor: colors.primary }]} 
                onPress={() => handleOpenUrl(selectedEvent.url, selectedEvent.title || selectedEvent.name)}
              >
                <Text style={styles.detailsButtonText}>
                  Ver no Ticketmaster
                </Text>
                <Ionicons name="open-outline" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
    borderBottomWidth: 1,
    zIndex: 1,
  },
  backButton: { padding: 8 },
  switchButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    zIndex: 1,
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
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  detailCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 300,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginRight: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
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
    paddingHorizontal: 32,
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

export default EventsMapScreen;
