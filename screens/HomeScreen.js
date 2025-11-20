import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH;
const CAROUSEL_HEIGHT = Math.round(CAROUSEL_WIDTH * 0.68);
const BUTTON_CAROUSEL_WIDTH = SCREEN_WIDTH;

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getNearbyEvents } from '../services/eventsApiService';
import EventosCard from '../components/EventosCard';

const HomeScreen = ({ navigation }) => {
  const { isLoggedIn, user, loading } = useAuth();
  const { colors, theme } = useTheme();
  
  const [carouselEvents, setCarouselEvents] = useState([]);
  const [carouselLoading, setCarouselLoading] = useState(true);

  // Carregar eventos para o carrossel
  useEffect(() => {
    const loadCarouselEvents = async () => {
      try {
        setCarouselLoading(true);
        
        // Pega localização do usuário
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const latitude = loc.coords.latitude;
          const longitude = loc.coords.longitude;
          
          // Busca eventos próximos
          const events = await getNearbyEvents(latitude, longitude, 100);
          
          // Filtra apenas eventos com imagem e pega os 5 primeiros
          const eventsWithImages = events
            .filter(event => event.image)
            .slice(0, 5);
          
          setCarouselEvents(eventsWithImages);
        } else {
          // Se não tiver permissão, busca eventos de uma localização padrão (São Paulo)
          const events = await getNearbyEvents(-23.5505, -46.6333, 100);
          const eventsWithImages = events
            .filter(event => event.image)
            .slice(0, 5);
          
          setCarouselEvents(eventsWithImages);
        }
      } catch (error) {
        console.error('Erro ao carregar eventos do carrossel:', error);
        // Em caso de erro, mantém array vazio
        setCarouselEvents([]);
      } finally {
        setCarouselLoading(false);
      }
    };

    loadCarouselEvents();
  }, []);

  const flatListRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [buttonCarouselIndex, setButtonCarouselIndex] = useState(0);
  const buttonsFlatListRef = useRef(null);

  // Auto-scroll do carrossel
  useEffect(() => {
    if (!carouselEvents || carouselEvents.length <= 1 || carouselLoading) return;
    
    const interval = setInterval(() => {
      const next = (carouselIndex + 1) % carouselEvents.length;
      setCarouselIndex(next);
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({ index: next, animated: true });
        } catch (e) {
          console.log('Erro ao fazer scroll:', e);
        }
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, [carouselIndex, carouselEvents, carouselLoading]);

  const checkLoginRequired = (actionName) => {
    if (!isLoggedIn) {
      navigation.navigate('Login', { 
        actionName: actionName 
      });
      return false;
    }
    return true;
  };

  const handleEventosProximos = () => {
    navigation.navigate('NearbyEvents');
  };

  const handleCriarEvento = () => {
    if (checkLoginRequired('criar um evento')) {
      navigation.navigate('CreateEvent');
    }
  };

  const handleSeusEventos = () => {
    if (checkLoginRequired('ver seus eventos')) {
      navigation.navigate('MyEvents');
    }
  };

  const BUTTONS = [
    {
      id: '1',
      nome: "Eventos próximos",
      descricao: "Descubra os próximos eventos que acontecerão pertinho de você!",
    },
    {
      id: '2',
      nome: "Criar um evento",
      descricao: "Crie e organize eventos, faça as memórias acontecerem!",
    },
    {
      id: '3',
      nome: "Seus eventos",
      descricao: "Aqui você consulta aqueles eventos que já viraram memórias e aqueles que você quer ir!",
    },
  ];

  const styles = createStyles(colors, theme);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
          </View>

          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.subTitle}>O guia de eventos perfeito para você!</Text>

          {/* Carrossel de botões principais */}
          <View style={styles.buttonsCarouselContainer}>
            <TouchableOpacity
              disabled={buttonCarouselIndex === 0}
              style={[
                styles.carouselArrow,
                buttonCarouselIndex === 0 && styles.carouselArrowDisabled,
              ]}
              onPress={() => {
                if (buttonCarouselIndex === 0) return;
                if (buttonsFlatListRef.current) {
                  buttonsFlatListRef.current.scrollToOffset({
                    offset: Math.max(0, (buttonCarouselIndex - 1) * BUTTON_CAROUSEL_WIDTH),
                    animated: true,
                  });
                }
              }}
            >
              <Ionicons name="chevron-back" size={24} color={buttonCarouselIndex === 0 ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>

            <FlatList
              ref={buttonsFlatListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              onMomentumScrollEnd={(ev) => {
                const newIndex = Math.round(ev.nativeEvent.contentOffset.x / BUTTON_CAROUSEL_WIDTH);
                setButtonCarouselIndex(newIndex);
              }}
              data={BUTTONS}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.buttonCardContainer}>
                  <EventosCard
                    nome={item.nome}
                    descricao={item.descricao}
                    onPress={item.id === '1' ? handleEventosProximos : item.id === '2' ? handleCriarEvento : handleSeusEventos}
                  />
                </View>
              )}
            />

            <TouchableOpacity
              disabled={buttonCarouselIndex >= BUTTONS.length - 1}
              style={[
                styles.carouselArrow,
                styles.carouselArrowRight,
                buttonCarouselIndex >= BUTTONS.length - 1 && styles.carouselArrowDisabled,
              ]}
              onPress={() => {
                if (buttonCarouselIndex >= BUTTONS.length - 1) return;
                if (buttonsFlatListRef.current) {
                  buttonsFlatListRef.current.scrollToOffset({
                    offset: (buttonCarouselIndex + 1) * BUTTON_CAROUSEL_WIDTH,
                    animated: true,
                  });
                }
              }}
            >
              <Ionicons name="chevron-forward" size={24} color={buttonCarouselIndex >= BUTTONS.length - 1 ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Título do carrossel */}
          <Text style={styles.carouselTitle}>Eventos em Destaque</Text>

          {/* Carousel de eventos da API */}
          <View style={styles.carouselWrap}>
            {carouselLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando eventos...</Text>
              </View>
            ) : carouselEvents.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={carouselEvents}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.carouselImageContainer}
                    activeOpacity={0.9}
                    onPress={() => {
                      // Redireciona para NearbyEvents e passa o evento selecionado
                      navigation.navigate('NearbyEvents', { 
                        selectedEvent: item,
                        scrollToEvent: true 
                      });
                    }}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                    {/* Overlay com informações do evento */}
                    <View style={styles.eventOverlay}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {item.title || item.name}
                        </Text>
                        {item.date && (
                          <View style={styles.eventDateRow}>
                            <Ionicons name="calendar-outline" size={14} color="white" />
                            <Text style={styles.eventDate} numberOfLines={1}>
                              {item.date}
                            </Text>
                          </View>
                        )}
                        {item.city && (
                          <View style={styles.eventLocationRow}>
                            <Ionicons name="location-outline" size={14} color="white" />
                            <Text style={styles.eventLocation} numberOfLines={1}>
                              {item.city}{item.state ? `, ${item.state}` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                      {/* Badge indicando que é clicável */}
                      <View style={styles.clickableBadge}>
                        <Text style={styles.clickableBadgeText}>Ver Detalhes</Text>
                        <Ionicons name="arrow-forward" size={12} color="white" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                onMomentumScrollEnd={(ev) => {
                  const width = ev.nativeEvent.layoutMeasurement.width;
                  const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                  setCarouselIndex(index);
                }}
                getItemLayout={(data, index) => ({ 
                  length: CAROUSEL_WIDTH, 
                  offset: CAROUSEL_WIDTH * index, 
                  index 
                })}
              />
            ) : (
              <View style={styles.emptyCarousel}>
                <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Nenhum evento disponível no momento</Text>
              </View>
            )}

            {/* Indicadores de página */}
            {!carouselLoading && carouselEvents.length > 1 && (
              <View style={styles.pagination}>
                {carouselEvents.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === carouselIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </View>
      </ScrollView>
      
      {/* Rodape da pagina */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerOption}
          onPress={() => navigation.navigate('Home')}
        >
          <Image source={require('../assets/imagens_rodape/pagina-inicial.png')} style={styles.footerIcon} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.footerOption}
          onPress={() => {
            if (isLoggedIn) {
              navigation.navigate('ProfileSettings');
            } else {
              navigation.navigate('Login', { 
                actionName: 'acessar configurações do perfil' 
              });
            }
          }}
        >
          <Image source={require('../assets/imagens_rodape/foto-perfil.png')} style={styles.footerIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors, theme) => StyleSheet.create({
  scrollViewContainer: {
    paddingBottom: 80,
    backgroundColor: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    paddingTop: 40,
    alignItems: 'center',
  },
  buttonsCarouselContainer: {
    width: SCREEN_WIDTH,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCardContainer: {
    width: BUTTON_CAROUSEL_WIDTH,
    paddingHorizontal: 56,
  },
  carouselArrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    position: 'absolute',
    zIndex: 1,
    left: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carouselArrowDisabled: {
    backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(200, 200, 200, 0.5)',
    opacity: 0.5,
  },
  carouselArrowRight: {
    left: undefined,
    right: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerLeft: {
    width: 40,
  },
  subTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerOption: {
    alignItems: 'center',
    flex: 1,
  },
  footerIcon: {
    width: 35,
    height: 35,
    marginBottom: 2,
    tintColor: colors.textSecondary,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  carouselWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  carouselImageContainer: {
    width: CAROUSEL_WIDTH - 24,
    height: CAROUSEL_HEIGHT,
    marginHorizontal: 12,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.separator,
  },
  eventOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eventInfo: {
    gap: 4,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDate: {
    fontSize: 12,
    color: 'white',
    flex: 1,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: 'white',
    flex: 1,
  },
  clickableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  clickableBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    width: CAROUSEL_WIDTH - 24,
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyCarousel: {
    width: CAROUSEL_WIDTH - 24,
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});

export default HomeScreen;