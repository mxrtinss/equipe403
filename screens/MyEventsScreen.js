import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
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
    try {
      await deleteEventDb(item.id, item.image);
      setEvents((prev) => prev.filter((e) => e.id !== item.id));
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível excluir o evento.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ color: colors.primary }}>Voltar</Text>
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
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 12, overflow: 'hidden', backgroundColor: colors.card }}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={{ width: '100%', height: 140 }} />
              ) : null}
              <View style={{ padding: 12 }}>
                <Text style={{ fontWeight: '700', marginBottom: 4, color: colors.text }}>{item.title}</Text>
                <Text style={{ color: colors.text }}>{formatDateTime(item)}</Text>
                {!!address && <Text style={{ color: colors.text, marginTop: 4 }}>{address}</Text>}
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('CreateEvent', { ...item, id: item.id })} style={{ marginRight: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item)}>
                    <Text style={{ color: '#EF4444', fontWeight: '600' }}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: colors.text, textAlign: 'center', marginTop: 24 }}>Você ainda não criou eventos.</Text>}
      />
    </View>
  );
};

export default MyEventsScreen;

