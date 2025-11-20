const TICKETMASTER_API_KEY = 'IxtAkQ9VsDLwZ381ls9yaeFivOofsWND';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2'; 

export const kmDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius 
 * @returns {Promise<Array>}
 */
export const getNearbyEvents = async (latitude, longitude, radius = 50) => {
  try {
    console.log('=== DEBUG TICKETMASTER BRASIL API ===');
    console.log('Localização:', { latitude, longitude });
    console.log('Raio:', radius, 'km');

    const url = `${BASE_URL}/events.json?apikey=${TICKETMASTER_API_KEY}&latlong=${latitude},${longitude}&radius=${radius}&unit=km&size=50&sort=date,asc`;
    
    console.log('URL da requisição:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Ticketmaster Brasil:', response.status, errorText);
      throw new Error(`Erro na API Ticketmaster Brasil: ${response.status}`);
    }

    const data = await response.json();
    console.log('Eventos encontrados:', data._embedded?.events?.length || 0);

    if (!data._embedded || !data._embedded.events) {
      console.log('Nenhum evento encontrado');
      return [];
    }

    const events = data._embedded.events.map(event => {
      const image = event.images?.find(img => img.ratio === '16_9' && img.width > 1000)?.url 
                    || event.images?.[0]?.url 
                    || null;

      const venue = event._embedded?.venues?.[0];
      const eventLatitude = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
      const eventLongitude = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

      const distance = (eventLatitude && eventLongitude) 
        ? kmDistance(latitude, longitude, eventLatitude, eventLongitude)
        : null;

      const date = event.dates?.start?.localDate || '';
      const time = event.dates?.start?.localTime || '';
      const formattedDate = formatDate(date, time);

      return {
        id: event.id,
        title: event.name,
        name: event.name,
        date: formattedDate,
        image: image,
        url: event.url,
        city: venue?.city?.name || '',
        state: venue?.state?.stateCode || '',
        country: venue?.country?.countryCode || 'BR',
        venueName: venue?.name || '',
        latitude: eventLatitude,
        longitude: eventLongitude,
        distance: distance,
        priceRange: event.priceRanges?.[0] ? {
          min: event.priceRanges[0].min,
          max: event.priceRanges[0].max,
          currency: event.priceRanges[0].currency
        } : null,
        classifications: event.classifications?.[0]?.segment?.name || 'Evento',
        status: event.dates?.status?.code || 'onsale'
      };
    });

    const sortedEvents = events.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    console.log('Eventos processados:', sortedEvents.length);
    console.log('================================');

    return sortedEvents;
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    throw error;
  }
};

const formatDate = (date, time) => {
  if (!date) return 'Data não disponível';

  try {
    const [year, month, day] = date.split('-');
    const dateObj = new Date(year, month - 1, day);
    
    const options = { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    };
    
    let formatted = dateObj.toLocaleDateString('pt-BR', options);
    
    if (time) {
      formatted += ` às ${time}`;
    }
    
    return formatted;
  } catch (error) {
    return date;
  }
};

export const getEventDetails = async (eventId) => {
  try {
    const url = `${BASE_URL}/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar detalhes do evento:', error);
    throw error;
  }
};

export const getEventsByCategory = async (latitude, longitude, category, radius = 50) => {
  try {
    const url = `${BASE_URL}/events.json?apikey=${TICKETMASTER_API_KEY}&latlong=${latitude},${longitude}&radius=${radius}&unit=km&classificationName=${category}&size=50`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data._embedded || !data._embedded.events) {
      return [];
    }
    
    return data._embedded.events;
  } catch (error) {
    console.error('Erro ao buscar eventos por categoria:', error);
    throw error;
  }
};
