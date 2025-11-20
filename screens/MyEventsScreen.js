import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUserEvents as getUserEventsDb, deleteEvent as deleteEventDb, getUserFavorites, removeFavoriteEvent } from '../services/firebaseConfig';
import { useTheme } from '@react-navigation/native';

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

const reverseGeocode = async (lat, lon) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    return data?.display_name || '';
  } catch (_) { return ''; }
};

const MyEventsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [activeTab, setActiveTab] = useState('created');
  const [refreshing, setRefreshing] = useState(false);

  // Recarrega quando a tela fica em foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.uid) {
        loadEvents();
      }
    });
    return unsubscribe;
  }, [navigation, user?.uid, activeTab]);

  useEffect(() => {
    if (!user?.uid) return;
    loadEvents();
  }, [user?.uid, activeTab]);

  const loadEvents = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'created') {
        const list = await getUserEventsDb(user.uid);
        setEvents(list);
        const cache = {};
        await Promise.all(list.map(async (e) => {
          if (e.latitude && e.longitude) {
            const key = `${e.latitude},${e.longitude}`;
            if (!cache[key]) {
              cache[key] = await reverseGeocode(e.latitude, e.longitude);
            }
          }
        }));
        setAddresses(cache);
      } else {
        // Carrega favoritos
        const favorites = await getUserFavorites(user.uid);
        console.log('Favoritos carregados:', favorites);
        setEvents(favorites);
        setAddresses({});
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os eventos.');
    } finally {
      setRefreshing(false);
    }
  };

  const onDelete = async (item) => {
    const isCreated = activeTab === 'created';
    
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja ${isCreated ? 'excluir' : 'remover dos favoritos'} "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isCreated ? 'Excluir' : 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isCreated) {
                await deleteEventDb(item.id, item.image);
                setEvents((prev) => prev.filter((e) => e.id !== item.id));
              } else {
                // Para favoritos, usa eventId
                await removeFavoriteEvent(user.uid, item.eventId);
                setEvents((prev) => prev.filter((e) => e.eventId !== item.eventId));
              }
              Alert.alert('Sucesso', `Evento ${isCreated ? 'excluído' : 'removido dos favoritos'} com sucesso!`);
            } catch (error) {
              console.error('Erro ao deletar:', error);
              Alert.alert('Erro', `Não foi possível ${isCreated ? 'excluir' : 'remover'} o evento.`);
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

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 45, 
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e5e5', 
        backgroundColor: 'white'
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>Meus Eventos</Text>
        <TouchableOpacity onPress={loadEvents} style={{ padding: 8 }}>
          <Ionicons name="refresh-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Abas */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e5e5'
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'created' ? '#8B5CF6' : 'transparent',
          }}
          onPress={() => setActiveTab('created')}
        >
          <Text style={{ 
            textAlign: 'center', 
            fontWeight: activeTab === 'created' ? 'bold' : 'normal',
            color: activeTab === 'created' ? '#8B5CF6' : '#6b7280'
          }}>
            Meus Eventos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'favorites' ? '#8B5CF6' : 'transparent',
          }}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={{ 
            textAlign: 'center', 
            fontWeight: activeTab === 'favorites' ? 'bold' : 'normal',
            color: activeTab === 'favorites' ? '#8B5CF6' : '#6b7280'
          }}>
            Favoritos {events.length > 0 && activeTab === 'favorites' ? `(${events.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => activeTab === 'favorites' ? item.eventId : item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={loadEvents}
        renderItem={({ item }) => {
          const addrKey = item.latitude && item.longitude ? `${item.latitude},${item.longitude}` : '';
          const address = addresses[addrKey] || item.address || item.place || (item.city ? `${item.city}${item.state ? ', ' + item.state : ''}` : '');
          const isFavorite = activeTab === 'favorites';
          
          return (
            <View style={{ 
              borderWidth: 1, 
              borderColor: '#e5e5e5', 
              borderRadius: 12, 
              marginBottom: 12, 
              overflow: 'hidden', 
              backgroundColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
              ) : (
                <View style={{ 
                  width: '100%', 
                  height: 180, 
                  backgroundColor: '#f3f4f6', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                </View>
              )}

              {/* Badge de favorito */}
              {isFavorite && (
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: '#EF4444',
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
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#1f2937' }}>
                  {item.title}
                </Text>
                
                {formatDateTime(item) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={{ color: '#6b7280', marginLeft: 6 }}>
                      {formatDateTime(item)}
                    </Text>
                  </View>
                )}
                
                {!!address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={{ color: '#6b7280', marginLeft: 6, flex: 1 }} numberOfLines={2}>
                      {address}
                    </Text>
                  </View>
                )}

                {isFavorite && item.venueName && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="business-outline" size={16} color="#6b7280" />
                    <Text style={{ color: '#6b7280', marginLeft: 6, flex: 1 }} numberOfLines={1}>
                      {item.venueName}
                    </Text>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                  {!isFavorite ? (
                    <>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('CreateEvent', { ...item, id: item.id })}
                        style={{
                          flex: 1,
                          backgroundColor: '#8B5CF6',
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Editar</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => onDelete(item)}
                        style={{
                          flex: 1,
                          backgroundColor: '#EF4444',
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Excluir</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity 
                        onPress={() => handleOpenUrl(item.url, item.title)}
                        style={{
                          flex: 1,
                          backgroundColor: '#8B5CF6',
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        disabled={!item.url}
                      >
                        <Ionicons name="open-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>
                          {item.url ? 'Abrir' : 'Sem link'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => onDelete(item)}
                        style={{
                          flex: 1,
                          backgroundColor: '#EF4444',
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
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <Ionicons 
              name={activeTab === 'created' ? "calendar-outline" : "heart-outline"} 
              size={64} 
              color="#9ca3af"
            />
            <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 16, fontSize: 16, lineHeight: 24 }}>
              {activeTab === 'created' 
                ? 'Você ainda não criou eventos.'
                : 'Você ainda não favoritou eventos.\nFavorite eventos em "Eventos Próximos"!'}
            </Text>
            {activeTab === 'created' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateEvent')}
                style={{
                  marginTop: 20,
                  backgroundColor: '#8B5CF6',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Criar meu primeiro evento</Text>
              </TouchableOpacity>
            )}
            {activeTab === 'favorites' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('NearbyEvents')}
                style={{
                  marginTop: 20,
                  backgroundColor: '#8B5CF6',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Buscar eventos próximos</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

export default MyEventsScreen;