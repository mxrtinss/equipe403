import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert, FlatList, Dimensions } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH;
const CAROUSEL_HEIGHT = Math.round(CAROUSEL_WIDTH * 0.68);
const BUTTON_CAROUSEL_WIDTH = SCREEN_WIDTH;
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../services/authService';
import { getAllEvents, getAllUsers } from '../services/databaseService';
import EventosCard from '../components/EventosCard';

const HomeScreen = ({ navigation }) => {
  const { isLoggedIn, user, loading } = useAuth();
  
  const [events, setEvents] = useState({});
  const [users, setUsers] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        const [eventsData, usersData] = await Promise.all([
          getAllEvents(),
          getAllUsers()
        ]);
        setEvents(eventsData);
        setUsers(usersData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  const CAROUSEL_IMAGES = [
    { 
      id: '1',
      source: require('../assets/evento1.jpg')  
    },
    {
      id: '2',
      source: require('../assets/evento2.jpg')  
    },
    {
      id: '3',
      source: require('../assets/evento3.jpg')  
    }
  ];

  const flatListRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [buttonCarouselIndex, setButtonCarouselIndex] = useState(0);
  const buttonsFlatListRef = useRef(null);
  

  useEffect(() => {
    if (!CAROUSEL_IMAGES || CAROUSEL_IMAGES.length <= 1) return;
    const interval = setInterval(() => {
      const next = (carouselIndex + 1) % CAROUSEL_IMAGES.length;
      setCarouselIndex(next);
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({ index: next, animated: true });
        } catch (e) {
        }
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [carouselIndex]);

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.container}>
          {/* Header com botão de login */}
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
              <Ionicons name="chevron-back" size={24} color={buttonCarouselIndex === 0 ? '#C7C7CC' : '#8B5CF6'} />
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
              <Ionicons name="chevron-forward" size={24} color={buttonCarouselIndex >= BUTTONS.length - 1 ? '#C7C7CC' : '#8B5CF6'} />
            </TouchableOpacity>
          </View>

          {/* Carousel de imagens usando assets locais */}
          <View style={styles.carouselWrap}>
            <FlatList
              ref={flatListRef}
              data={CAROUSEL_IMAGES}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image
                  source={item.source}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              )}
              onMomentumScrollEnd={(ev) => {
                const width = ev.nativeEvent.layoutMeasurement.width;
                const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                setCarouselIndex(index);
              }}
              getItemLayout={(data, index) => ({ length: CAROUSEL_WIDTH, offset: CAROUSEL_WIDTH * index, index })}
            />
          </View>

          <StatusBar style="auto" />
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

const styles = StyleSheet.create({
  scrollViewContainer: {
    paddingBottom: 80,
    backgroundColor: '#f5f5f5',
  },
  container: {
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    position: 'absolute',
    zIndex: 1,
    left: 10,
  },
  carouselArrowDisabled: {
    backgroundColor: 'rgba(200,200,200,0.6)',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textTransform: 'lowercase',
  },
  loginButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loggedInButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  subTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
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
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerOption: {
    alignItems: 'center',
    flex: 1,
  },
  footerIcon: {
    width: 35,
    height: 35,
    marginBottom: 2,
  },
  carouselWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 20,
  },
  carouselImage: {
    width: CAROUSEL_WIDTH - 24,
    height: CAROUSEL_HEIGHT,
    borderRadius: 12,
    marginHorizontal: 12,
    backgroundColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default HomeScreen;
