import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUserEvents as getUserEventsDb, deleteEvent as deleteEventDb } from '../services/firebaseConfig';
import { useTheme } from '@react-navigation/native';

const formatDateTime = (item) => {
  if (item.createdAt) {
    const d = new Date(item.createdAt);
    return d.toLocaleString();
  }
  if (item.date || item.time) {
    return [item.date, item.time].filter(Boolean).join(' ');
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

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
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
    })();
  }, [user?.uid]);

  const onDelete = async (item) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventDb(item.id, item.image);
              setEvents((prev) => prev.filter((e) => e.id !== item.id));
              Alert.alert('Sucesso', 'Evento excluído com sucesso!');
            } catch (_) {
              Alert.alert('Erro', 'Não foi possível excluir o evento.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header com setinha */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 45, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border, 
        backgroundColor: colors.card 
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Meus Eventos</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const addrKey = item.latitude && item.longitude ? `${item.latitude},${item.longitude}` : '';
          const address = addresses[addrKey] || item.place || '';
          return (
            <View style={{ 
              borderWidth: 1, 
              borderColor: colors.border, 
              borderRadius: 12, 
              marginBottom: 12, 
              overflow: 'hidden', 
              backgroundColor: colors.card,
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
                  backgroundColor: colors.border, 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <Ionicons name="calendar-outline" size={48} color={colors.text} opacity={0.3} />
                </View>
              )}
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6, color: colors.text }}>
                  {item.title}
                </Text>
                
                {formatDateTime(item) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text} opacity={0.7} />
                    <Text style={{ color: colors.text, opacity: 0.7, marginLeft: 6 }}>
                      {formatDateTime(item)}
                    </Text>
                  </View>
                )}
                
                {!!address && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="location-outline" size={16} color={colors.text} opacity={0.7} />
                    <Text style={{ color: colors.text, opacity: 0.7, marginLeft: 6, flex: 1 }} numberOfLines={2}>
                      {address}
                    </Text>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
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
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <Ionicons name="calendar-outline" size={64} color={colors.text} opacity={0.3} />
            <Text style={{ color: colors.text, textAlign: 'center', marginTop: 16, fontSize: 16 }}>
              Você ainda não criou eventos.
            </Text>
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
          </View>
        }
      />
    </View>
  );
};

export default MyEventsScreen;