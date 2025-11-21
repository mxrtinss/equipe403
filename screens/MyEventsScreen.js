import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Alert, 
  Linking,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserFavorites, removeFavoriteEvent } from '../services/firebaseConfig';

const formatDateTime = (item) => {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (item.date || item.time) {
    return [item.date, item.time].filter(Boolean).join(' às ');
  }
  return '';
};

const MyEventsScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Recarrega quando a tela fica em foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) {
        loadEvents();
      }
    });
    return unsubscribe;
  }, [navigation, user?.uid]);

  // Recarrega quando muda de aba
  useEffect(() => {
    if (!user?.uid) return;
    loadEvents();
  }, [activeTab]);

  const loadEvents = async () => {
    if (!user?.uid) {
      console.log('Usuário não autenticado');
      setLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      if (activeTab === 'tickets') {
        console.log('Carregando ingressos do usuário:', user.uid);
        // Por enquanto, mostra array vazio para ingressos
        // Você pode implementar a lógica de ingressos depois
        setEvents([]);
      } else {
        console.log('Carregando favoritos do usuário:', user.uid);
        const favorites = await getUserFavorites(user.uid);
        console.log('Favoritos carregados:', favorites);
        setEvents(favorites);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os eventos.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const onRemoveFavorite = async (item) => {
    Alert.alert(
      'Remover dos favoritos',
      `Tem certeza que deseja remover "${item.title}" dos favoritos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFavoriteEvent(user.uid, item.eventId);
              setEvents((prev) => prev.filter((e) => e.eventId !== item.eventId));
              Alert.alert('Sucesso', 'Evento removido dos favoritos!');
            } catch (error) {
              console.error('Erro ao remover favorito:', error);
              Alert.alert('Erro', 'Não foi possível remover o evento dos favoritos.');
            }
          }
        }
      ]
    );
  };

  const handleOpenUrl = (url, title) => {
    if (url) {
      Alert.alert(
        title,
        'Deseja abrir o evento no Ticketmaster?',
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 16, color: colors.textSecondary }}>
            Carregando...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: 20, 
          paddingVertical: 16, 
          borderBottomWidth: 1, 
          borderBottomColor: colors.border, 
          backgroundColor: colors.card,
        }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ padding: 8 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
            Meus Eventos
          </Text>
          <TouchableOpacity 
            onPress={loadEvents} 
            style={{ padding: 8 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Abas */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: colors.card, 
          borderBottomWidth: 1, 
          borderBottomColor: colors.border,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeTab === 'tickets' ? colors.primary : 'transparent',
            }}
            onPress={() => setActiveTab('tickets')}
          >
            <Text style={{ 
              textAlign: 'center', 
              fontWeight: activeTab === 'tickets' ? 'bold' : 'normal',
              color: activeTab === 'tickets' ? colors.primary : colors.textSecondary,
            }}>
              Meus Ingressos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeTab === 'favorites' ? colors.primary : 'transparent',
            }}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={{ 
              textAlign: 'center', 
              fontWeight: activeTab === 'favorites' ? 'bold' : 'normal',
              color: activeTab === 'favorites' ? colors.primary : colors.textSecondary,
            }}>
              Favoritos {events.length > 0 && activeTab === 'favorites' ? `(${events.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => activeTab === 'favorites' ? item.eventId : item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshing={refreshing}
          onRefresh={loadEvents}
          renderItem={({ item }) => {
            const address = item.address || item.place || (item.city ? `${item.city}${item.state ? ', ' + item.state : ''}` : '');
            const isTicket = activeTab === 'tickets';
            
            return (
              <View style={{ 
                borderWidth: 1, 
                borderColor: colors.border, 
                borderRadius: 12, 
                marginBottom: 12, 
                overflow: 'hidden', 
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}>
                {item.image ? (
                  <Image 
                    source={{ uri: item.image }} 
                    style={{ width: '100%', height: 180 }} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={{ 
                    width: '100%', 
                    height: 180, 
                    backgroundColor: colors.separator, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                  }}>
                    <Ionicons 
                      name={isTicket ? "ticket-outline" : "heart-outline"} 
                      size={48} 
                      color={colors.textTertiary} 
                    />
                  </View>
                )}

                {/* Badge */}
                {!isTicket && (
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: colors.error,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Ionicons name="heart" size={14} color="white" />
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>Favorito</Text>
                  </View>
                )}

                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6, color: colors.text }}>
                    {item.title}
                  </Text>
                  
                  {formatDateTime(item) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, marginLeft: 6 }}>
                        {formatDateTime(item)}
                      </Text>
                    </View>
                  )}
                  
                  {!!address && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, marginLeft: 6, flex: 1 }} numberOfLines={2}>
                        {address}
                      </Text>
                    </View>
                  )}

                  {!isTicket && item.venueName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, marginLeft: 6, flex: 1 }} numberOfLines={1}>
                        {item.venueName}
                      </Text>
                    </View>
                  )}
                  
                  {/* Botões para Ingressos */}
                  {isTicket && (
                    <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                      <TouchableOpacity 
                        onPress={() => handleOpenUrl(item.url, item.title)}
                        style={{
                          flex: 1,
                          backgroundColor: item.url ? colors.primary : colors.separator,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        disabled={!item.url}
                      >
                        <Ionicons name="ticket-outline" size={18} color={item.url ? "white" : colors.textTertiary} />
                        <Text style={{ 
                          color: item.url ? "white" : colors.textTertiary, 
                          fontWeight: '600', 
                          marginLeft: 6 
                        }}>
                          Ver Ingresso
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Botões para Favoritos */}
                  {!isTicket && (
                    <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                      <TouchableOpacity 
                        onPress={() => handleOpenUrl(item.url, item.title)}
                        style={{
                          flex: 1,
                          backgroundColor: item.url ? colors.primary : colors.separator,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        disabled={!item.url}
                      >
                        <Ionicons name="open-outline" size={18} color={item.url ? "white" : colors.textTertiary} />
                        <Text style={{ 
                          color: item.url ? "white" : colors.textTertiary, 
                          fontWeight: '600', 
                          marginLeft: 6 
                        }}>
                          {item.url ? 'Abrir' : 'Sem link'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => onRemoveFavorite(item)}
                        style={{
                          flex: 1,
                          backgroundColor: colors.error,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="heart-dislike-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Ionicons 
                name={activeTab === 'tickets' ? "ticket-outline" : "heart-outline"} 
                size={64} 
                color={colors.textTertiary}
              />
              <Text style={{ 
                color: colors.textSecondary, 
                textAlign: 'center', 
                marginTop: 16, 
                fontSize: 16, 
                lineHeight: 24,
                paddingHorizontal: 20,
              }}>
                {activeTab === 'tickets' 
                  ? 'Você ainda não possui ingressos.\nCompre ingressos em "Eventos Próximos"!'
                  : 'Você ainda não favoritou eventos.\nFavorite eventos em "Eventos Próximos"!'}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('NearbyEvents')}
                style={{
                  marginTop: 20,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {activeTab === 'tickets' ? 'Buscar eventos próximos' : 'Buscar eventos próximos'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default MyEventsScreen;