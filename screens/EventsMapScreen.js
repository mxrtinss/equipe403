import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getNearbyEvents, kmDistance } from '../services/eventsApiService';
import { getEventsNearby as getEventsNearbyDb } from '../services/firebaseConfig';

const EventsMapScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [events, setEvents] = useState([]);
  const [useTicketmaster, setUseTicketmaster] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const webViewRef = useRef(null);

  // Recebe eventos da navegação (opcional)
  useEffect(() => {
    if (route.params?.events && route.params?.coords) {
      const { events: routeEvents, coords: routeCoords, useTicketmaster: routeUseTicketmaster } = route.params;
      console.log('📍 Eventos recebidos da navegação:', routeEvents.length);
      setEvents(routeEvents);
      setCoords(routeCoords);
      setUseTicketmaster(routeUseTicketmaster || true);
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
  }, [coords, useTicketmaster]);

  // Recarrega eventos quando alternar a fonte
  useEffect(() => {
    if (coords && !route.params?.events) {
      if (useTicketmaster) {
        fetchEvents();
      } else {
        fetchFirebaseEvents();
      }
    }
  }, [useTicketmaster]);

  const fetchEvents = async () => {
    if (!coords) return;
    setLoading(true);
    try {
      console.log('📍 Buscando eventos do Ticketmaster...');
      const data = await getNearbyEvents(coords.latitude, coords.longitude, 100);
      console.log('📍 Eventos do Ticketmaster carregados:', data.length);
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
    if (!coords) return;
    setLoading(true);
    try {
      console.log('📍 Buscando eventos locais do Firebase...');
      const data = await getEventsNearbyDb(coords.latitude, coords.longitude);
      console.log('📍 Eventos locais do Firebase carregados:', data.length);
      setEvents(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os eventos do banco de dados.');
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
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

  // Filtra eventos com coordenadas válidas - MELHORADO
  const eventsWithCoords = events.filter(e => {
    const hasLat = e.latitude !== null && e.latitude !== undefined && !isNaN(parseFloat(e.latitude));
    const hasLon = e.longitude !== null && e.longitude !== undefined && !isNaN(parseFloat(e.longitude));
    
    // Log para debug
    if (!hasLat || !hasLon) {
      console.log('⚠️ Evento sem coordenadas válidas:', {
        title: e.title || e.name,
        lat: e.latitude,
        lon: e.longitude,
        hasLat,
        hasLon
      });
    }
    
    return hasLat && hasLon;
  });

  console.log('📍 Total de eventos:', events.length);
  console.log('📍 Eventos com coordenadas válidas:', eventsWithCoords.length);

  // Gera HTML do mapa usando OpenStreetMap com Leaflet
  const generateMapHTML = () => {
    if (!coords || eventsWithCoords.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                text-align: center;
                background-color: ${isDarkMode ? '#0F172A' : '#F9FAFB'};
                color: ${isDarkMode ? '#F9FAFB' : '#1F2937'};
              }
            </style>
          </head>
          <body>
            <h2>Carregando mapa...</h2>
          </body>
        </html>
      `;
    }

    // Agrupa eventos pela mesma localização
    const locationGroups = {};
    eventsWithCoords.forEach(event => {
      const key = `${parseFloat(event.latitude).toFixed(6)},${parseFloat(event.longitude).toFixed(6)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(event);
    });

    console.log('📍 Localizações únicas:', Object.keys(locationGroups).length);
    console.log('📍 Eventos agrupados:', locationGroups);

    // Calcula o centro e zoom
    const latitudes = [...eventsWithCoords.map(e => parseFloat(e.latitude)), coords.latitude];
    const longitudes = [...eventsWithCoords.map(e => parseFloat(e.longitude)), coords.longitude];
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Cria marcadores com offset para eventos no mesmo local
    const markers = [];
    let globalIndex = 0;

    Object.entries(locationGroups).forEach(([locationKey, events]) => {
      const [baseLat, baseLon] = locationKey.split(',').map(parseFloat);
      
      events.forEach((event, localIndex) => {
        // Aplica um pequeno offset se houver múltiplos eventos no mesmo local
        const offset = events.length > 1 ? 0.0003 : 0; // ~33 metros
        const angle = (localIndex * (360 / events.length)) * (Math.PI / 180);
        const eventLat = baseLat + (offset * Math.cos(angle));
        const eventLon = baseLon + (offset * Math.sin(angle));
        
        const dist = event.distance != null ? event.distance.toFixed(1) : 
                     (coords ? kmDistance(coords.latitude, coords.longitude, baseLat, baseLon).toFixed(1) : 'N/A');
        
        const markerObj = {
          lat: eventLat,
          lng: eventLon,
          originalLat: baseLat,
          originalLon: baseLon,
          isGrouped: events.length > 1,
          groupSize: events.length,
          groupIndex: localIndex,
          title: event.title || event.name || 'Evento',
          image: event.image || '',
          info: {
            title: event.title || event.name || 'Evento',
            venue: event.venueName || '',
            city: event.city || '',
            state: event.state || '',
            date: event.date || '',
            distance: dist,
            url: event.url || '',
            groupInfo: events.length > 1 ? `${localIndex + 1} de ${events.length} eventos neste local` : null
          }
        };

        markers.push(JSON.stringify(markerObj));
        globalIndex++;
      });
    });

    const markersJson = '[' + markers.join(',') + ']';
    console.log('🗺️ Gerando mapa com', markers.length, 'marcadores em', Object.keys(locationGroups).length, 'localizações');

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
            console.log('🗺️ Inicializando mapa...');
            
            // Inicializa o mapa
            const map = L.map('map').setView([${centerLat}, ${centerLon}], 12);

            // Adiciona tiles do OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            // Marcador da localização do usuário (azul com pulso)
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: \`
                <div style="position: relative;">
                  <div style="
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    background-color: rgba(66, 133, 244, 0.3);
                    border-radius: 50%;
                    top: -4px;
                    left: -4px;
                    animation: pulse 2s infinite;
                  "></div>
                  <div style="
                    background: linear-gradient(135deg, #4285F4 0%, #357AE8 100%);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                  ">
                    <div style="
                      width: 12px;
                      height: 12px;
                      background-color: white;
                      border-radius: 50%;
                    "></div>
                  </div>
                </div>
                <style>
                  @keyframes pulse {
                    0% {
                      transform: scale(1);
                      opacity: 1;
                    }
                    50% {
                      transform: scale(1.2);
                      opacity: 0.6;
                    }
                    100% {
                      transform: scale(1);
                      opacity: 1;
                    }
                  }
                </style>
              \`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
              popupAnchor: [0, -16]
            });

            const userMarker = L.marker([${coords.latitude}, ${coords.longitude}], {
              icon: userIcon,
              title: 'Sua localização'
            }).addTo(map);

            // Marcadores dos eventos
            const eventMarkers = ${markersJson};
            console.log('🗺️ Total de marcadores:', eventMarkers.length);
            
            const bounds = [[${coords.latitude}, ${coords.longitude}]];

            eventMarkers.forEach((markerData, index) => {
              try {
                console.log('📍 Processando marcador', index + 1, ':', markerData.title, 
                           markerData.isGrouped ? '(agrupado ' + markerData.groupIndex + ')' : '');
                
                // Validação adicional
                if (!markerData.lat || !markerData.lng || isNaN(markerData.lat) || isNaN(markerData.lng)) {
                  console.error('❌ Coordenadas inválidas para marcador', index + 1);
                  return;
                }
                
                // Badge colorido baseado no índice do grupo
                const badgeColors = [
                  'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
                ];
                const badgeColor = markerData.isGrouped 
                  ? badgeColors[markerData.groupIndex % badgeColors.length]
                  : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
                
                // Ícone customizado para eventos
                const eventIcon = L.divIcon({
                  className: 'event-marker',
                  html: \`
                    <div style="
                      width: 60px;
                      height: 60px;
                      border-radius: 12px;
                      border: 3px solid white;
                      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
                      overflow: hidden;
                      position: relative;
                      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                    ">
                      \${markerData.image ? \`
                        <img 
                          src="\${markerData.image}" 
                          style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                          "
                          onerror="this.style.display='none'; this.parentElement.innerHTML += '<div style=\\"display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);\\"><svg width=\\"28\\" height=\\"28\\" viewBox=\\"0 0 24 24\\" fill=\\"white\\"><path d=\\"M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z\\"/></svg></div>';"
                        />
                      \` : \`
                        <div style="
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: 100%;
                          height: 100%;
                        ">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                          </svg>
                        </div>
                      \`}
                      <div style="
                        position: absolute;
                        bottom: -8px;
                        right: -8px;
                        background: \${badgeColor};
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                        border: 3px solid white;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                      ">\${index + 1}</div>
                      \${markerData.isGrouped ? \`
                        <div style="
                          position: absolute;
                          top: -8px;
                          left: -8px;
                          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
                          color: white;
                          width: 20px;
                          height: 20px;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 10px;
                          font-weight: bold;
                          border: 2px solid white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">\${markerData.groupSize}</div>
                      \` : ''}
                    </div>
                  \`,
                  iconSize: [60, 60],
                  iconAnchor: [30, 60],
                  popupAnchor: [0, -60]
                });

                const marker = L.marker([markerData.lat, markerData.lng], {
                  icon: eventIcon,
                  title: markerData.title
                });

                // Conteúdo do popup
                const popupContent = \`
                  <div class="custom-popup">
                    <h3>\${markerData.info.title}</h3>
                    \${markerData.info.groupInfo ? '<p style="color: #F59E0B; font-weight: bold;">📍 ' + markerData.info.groupInfo + '</p>' : ''}
                    \${markerData.info.date ? '<p>📅 ' + markerData.info.date + '</p>' : ''}
                    \${markerData.info.venue ? '<p>📍 ' + markerData.info.venue + '</p>' : ''}
                    \${markerData.info.city ? '<p>🏙️ ' + markerData.info.city + (markerData.info.state ? ', ' + markerData.info.state : '') + '</p>' : ''}
                    \${markerData.info.distance !== 'N/A' ? '<p>📏 ' + markerData.info.distance + ' km de você</p>' : ''}
                  </div>
                \`;

                marker.bindPopup(popupContent);
                marker.addTo(map);
                console.log('✅ Marcador', index + 1, 'adicionado com sucesso!');

                // Quando o marcador é clicado, envia mensagem para o React Native
                marker.on('click', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'markerClick',
                    data: markerData.info
                  }));
                });

                bounds.push([markerData.lat, markerData.lng]);
              } catch (error) {
                console.error('❌ Erro ao adicionar marcador', index + 1, ':', error);
              }
            });

            console.log('🗺️ Todos os marcadores adicionados. Ajustando bounds...');
            
            // Ajusta o zoom para incluir todos os marcadores
            if (bounds.length > 1) {
              map.fitBounds(bounds, { padding: [80, 80] });
            }
            
            console.log('✅ Mapa carregado com sucesso!');
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

  if (loading && !coords) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Mapa de Eventos</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando mapa...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mapa de Eventos</Text>
          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => {
              console.log('🔄 Alternando fonte de eventos:', useTicketmaster ? 'Local' : 'Ticketmaster');
              setUseTicketmaster(!useTicketmaster);
              setSelectedEvent(null);
              setEvents([]); // Limpa eventos para forçar reload
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={useTicketmaster ? "ticket" : "home"} 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Info bar */}
        <View style={[styles.infoBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.infoItem}>
            <Ionicons 
              name={useTicketmaster ? "ticket" : "home"} 
              size={16} 
              color={colors.primary} 
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {useTicketmaster ? 'Ticketmaster' : 'Eventos Locais'}: {eventsWithCoords.length} evento{eventsWithCoords.length !== 1 ? 's' : ''} no mapa
            </Text>
          </View>
          {events.length > eventsWithCoords.length && (
            <Text style={[styles.warningText, { color: colors.warning }]}>
              ⚠️ {events.length - eventsWithCoords.length} evento(s) sem localização
            </Text>
          )}
        </View>

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
                <View style={[styles.loadingOverlay, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Carregando mapa...
                  </Text>
                </View>
              )}
            />
          ) : !loading && coords ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {useTicketmaster 
                  ? 'Nenhum evento do Ticketmaster com localização disponível no mapa.'
                  : 'Nenhum evento local com localização disponível no mapa.'}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={useTicketmaster ? fetchEvents : fetchFirebaseEvents}
              >
                <Ionicons name="refresh-outline" size={20} color="white" />
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
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
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseDetail}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={2}>
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
    zIndex: 1,
  },
  backButton: { 
    padding: 8,
    zIndex: 10,
  },
  switchButton: { 
    padding: 8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  infoBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14,
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