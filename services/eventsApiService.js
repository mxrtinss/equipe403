// services/eventsApiService.js
import * as Location from 'expo-location';

const SYMPLA_API_BASE = 'https://api.sympla.com.br/public/v4';
const SYMPLA_TOKEN = '0aab2a866d1c9219f54dcff7723521a31a8b276da74dbdb04ed6bbd1114f48a7';

/**
 * Obtém a localização atual do usuário
 */
export const getUserLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permissão de localização negada');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Erro ao obter localização:', error);
    throw error;
  }
};

/**
 * Calcula a distância entre dois pontos (em km) usando a fórmula de Haversine
 */
export const kmDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Busca eventos do Sympla
 */
export const getSymplaEvents = async () => {
  try {
    const response = await fetch(`${SYMPLA_API_BASE}/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        's_token': SYMPLA_TOKEN,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Sympla:', response.status, errorText);
      throw new Error(`Erro na API Sympla: ${response.status}`);
    }

    const data = await response.json();
    console.log('Eventos Sympla:', data);
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar eventos do Sympla:', error);
    throw error;
  }
};

/**
 * Formata evento do Sympla para o padrão do app
 */
const formatSymplaEvent = (event) => {
  return {
    id: event.id,
    title: event.name,
    name: event.name,
    date: event.start_date ? new Date(event.start_date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Data não informada',
    image: event.image || null,
    latitude: event.address?.lat ? parseFloat(event.address.lat) : null,
    longitude: event.address?.lng ? parseFloat(event.address.lng) : null,
    address: event.address?.name || 'Local não informado',
    city: event.address?.city || '',
    state: event.address?.state || '',
    description: event.description || '',
    url: event.url || '',
  };
};

/**
 * Busca eventos próximos à localização do usuário
 */
export const getNearbyEvents = async (latitude, longitude, radiusKm = 50) => {
  try {
    // Busca todos os eventos do Sympla
    const events = await getSymplaEvents();
    
    // Filtra eventos próximos e adiciona distância
    const nearbyEvents = events
      .map(event => {
        const formattedEvent = formatSymplaEvent(event);
        
        // Verifica se o evento tem coordenadas
        if (formattedEvent.latitude && formattedEvent.longitude) {
          const distance = kmDistance(
            latitude,
            longitude,
            formattedEvent.latitude,
            formattedEvent.longitude
          );
          
          return {
            ...formattedEvent,
            distance: distance,
          };
        }
        return null;
      })
      .filter(event => event !== null && event.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return nearbyEvents;
  } catch (error) {
    console.error('Erro ao buscar eventos próximos:', error);
    throw error;
  }
};

/**
 * Busca eventos por cidade/estado (fallback se a API do Sympla suportar)
 */
export const getEventsByLocation = async (city, state) => {
  try {
    const response = await fetch(
      `${SYMPLA_API_BASE}/events?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          's_token': SYMPLA_TOKEN,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro na API Sympla: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map(formatSymplaEvent);
  } catch (error) {
    console.error('Erro ao buscar eventos por localização:', error);
    throw error;
  }
};

/**
 * Busca detalhes de um evento específico
 */
export const getEventDetails = async (eventId) => {
  try {
    const response = await fetch(`${SYMPLA_API_BASE}/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        's_token': SYMPLA_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API Sympla: ${response.status}`);
    }

    const data = await response.json();
    return formatSymplaEvent(data.data);
  } catch (error) {
    console.error('Erro ao buscar detalhes do evento:', error);
    throw error;
  }
};