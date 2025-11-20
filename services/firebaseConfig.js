import { FIREBASE_APP } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref as dbRef, push, set, update, get, query as rtdbQuery, orderByChild, equalTo, remove } from 'firebase/database';
import { getStorage, ref as storageRef, ref as _ref, uploadBytes, getDownloadURL, deleteObject, ref as storageRefAlias, refFromURL } from 'firebase/storage';

const auth = getAuth(FIREBASE_APP);
const rtdb = getDatabase(FIREBASE_APP);
const storage = getStorage(FIREBASE_APP);

export const uploadImageAsync = async (uri, path) => {
  if (!uri) return null;
  const response = await fetch(uri);
  const blob = await response.blob();
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob);
  const downloadURL = await getDownloadURL(ref);
  return downloadURL;
};

const kmToLat = (km) => km / 110.574;
const kmToLon = (km, latitude) => km / (111.320 * Math.cos(latitude * Math.PI / 180));

export const getEventsNearby = async (lat, lon, radiusKm = 25) => {
  const snap = await get(dbRef(rtdb, 'events'));
  if (!snap.exists()) return [];
  const eventsObj = snap.val();
  const items = Object.keys(eventsObj).map((id) => ({ id, ...eventsObj[id] }));
  const within = items.filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number');
  const filtered = within.filter((e) => {
    const dLat = lat - e.latitude;
    const dLon = lon - e.longitude;
    const approxKm = Math.sqrt((dLat * 111.0) ** 2 + (dLon * 111.0) ** 2);
    return approxKm <= radiusKm;
  });
  return filtered;
};

export const createEvent = async (data) => {
  const newRef = push(dbRef(rtdb, 'events'));
  const payload = { ...data, createdAt: Date.now() };
  await set(newRef, payload);
  return newRef.key;
};

export const updateEvent = async (id, updates) => {
  await update(dbRef(rtdb, `events/${id}`), { ...updates, updatedAt: Date.now() });
  return true;
};

export const deleteEvent = async (id, imageUrl) => {
  if (imageUrl) {
    try {
      const imgRef = refFromURL(imageUrl);
      await deleteObject(imgRef);
    } catch (_) {}
  }
  await remove(dbRef(rtdb, `events/${id}`));
  return true;
};

export const getAllEvents = async () => {
  const snap = await get(dbRef(rtdb, 'events'));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map((id) => ({ id, ...val[id] }));
};

export const getUserEvents = async (uid) => {
  const q = rtdbQuery(dbRef(rtdb, 'events'), orderByChild('uid'), equalTo(uid));
  const snap = await get(q);
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map((id) => ({ id, ...val[id] }));
};

export const deleteImageByUrl = async (url) => {
  if (!url) return;
  try {
    const ref = storageRef(storage, url);
    await deleteObject(ref);
  } catch (_) {
  }
};

export const updateUserProfile = async (uid, data) => {
  await update(dbRef(rtdb, `users/${uid}`), { ...data, updatedAt: Date.now() });
  return true;
};

export const getUserProfile = async (uid) => {
  const snap = await get(dbRef(rtdb, `users/${uid}`));
  if (!snap.exists()) return null;
  const data = snap.val();
  return { id: uid, ...data };
};

/**
 * Adiciona um evento aos favoritos do usuário
 */
export const addFavoriteEvent = async (userId, event) => {
  try {
    // Cria uma referência única para o favorito
    const newRef = push(dbRef(rtdb, `favorites/${userId}`));
    
    const favoriteData = {
      eventId: event.id,
      title: event.title || event.name || '',
      date: event.date || '',
      image: event.image || '',
      url: event.url || '',
      city: event.city || '',
      state: event.state || '',
      venueName: event.venueName || '',
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      priceRange: event.priceRange || null,
      classifications: event.classifications || '',
      distance: event.distance || null,
      createdAt: Date.now(),
      source: 'ticketmaster',
    };
    
    await set(newRef, favoriteData);
    return newRef.key;
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    throw error;
  }
};

/**
 * Remove um evento dos favoritos
 */
export const removeFavoriteEvent = async (userId, eventId) => {
  try {
    const favoritesRef = dbRef(rtdb, `favorites/${userId}`);
    const q = rtdbQuery(favoritesRef, orderByChild('eventId'), equalTo(eventId));
    const snap = await get(q);
    
    if (snap.exists()) {
      const val = snap.val();
      const deletePromises = Object.keys(val).map(key => 
        remove(dbRef(rtdb, `favorites/${userId}/${key}`))
      );
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    throw error;
  }
};

/**
 * Verifica se um evento está favoritado
 */
export const isEventFavorited = async (userId, eventId) => {
  try {
    const favoritesRef = dbRef(rtdb, `favorites/${userId}`);
    const q = rtdbQuery(favoritesRef, orderByChild('eventId'), equalTo(eventId));
    const snap = await get(q);
    return snap.exists();
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
};

/**
 * Busca todos os eventos favoritos do usuário
 */
export const getUserFavorites = async (userId) => {
  try {
    const snap = await get(dbRef(rtdb, `favorites/${userId}`));
    
    if (!snap.exists()) return [];
    
    const val = snap.val();
    return Object.keys(val).map(id => ({
      id,
      ...val[id],
      isFavorite: true,
    }));
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
};