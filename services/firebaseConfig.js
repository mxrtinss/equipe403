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

// ============================================
// FUNÇÕES DE FAVORITOS
// ============================================

/**
 * Adiciona um evento aos favoritos do usuário
 * @param {string} uid - ID do usuário
 * @param {object} eventData - Dados do evento a favoritar
 * @returns {Promise<string>} - ID do favorito criado
 */
export const addFavoriteEvent = async (uid, eventData) => {
  try {
    const newRef = push(dbRef(rtdb, `users/${uid}/favorites`));
    const payload = {
      ...eventData,
      favoritedAt: Date.now(),
    };
    await set(newRef, payload);
    return newRef.key;
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    throw error;
  }
};

/**
 * Remove um evento dos favoritos do usuário
 * @param {string} uid - ID do usuário
 * @param {string} eventId - ID do evento a remover
 * @returns {Promise<boolean>}
 */
export const removeFavoriteEvent = async (uid, eventId) => {
  try {
    // Busca o favorito pelo eventId
    const favoritesRef = dbRef(rtdb, `users/${uid}/favorites`);
    const snap = await get(favoritesRef);
    
    if (!snap.exists()) {
      return false;
    }

    const favorites = snap.val();
    let favoriteKey = null;

    // Encontra a chave do favorito que corresponde ao eventId
    for (const [key, value] of Object.entries(favorites)) {
      if (value.eventId === eventId) {
        favoriteKey = key;
        break;
      }
    }

    if (favoriteKey) {
      await remove(dbRef(rtdb, `users/${uid}/favorites/${favoriteKey}`));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    throw error;
  }
};

/**
 * Busca todos os eventos favoritos do usuário
 * @param {string} uid - ID do usuário
 * @returns {Promise<Array>} - Array de eventos favoritos
 */
export const getUserFavorites = async (uid) => {
  try {
    const snap = await get(dbRef(rtdb, `users/${uid}/favorites`));
    
    if (!snap.exists()) {
      return [];
    }

    const favorites = snap.val();
    const favoritesList = Object.keys(favorites).map((key) => ({
      id: key,
      ...favorites[key],
    }));

    // Ordena por data de favorito (mais recente primeiro)
    favoritesList.sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));

    return favoritesList;
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
};

/**
 * Verifica se um evento está nos favoritos do usuário
 * @param {string} uid - ID do usuário
 * @param {string} eventId - ID do evento
 * @returns {Promise<boolean>}
 */
export const isEventFavorited = async (uid, eventId) => {
  try {
    const snap = await get(dbRef(rtdb, `users/${uid}/favorites`));
    
    if (!snap.exists()) {
      return false;
    }

    const favorites = snap.val();
    
    for (const value of Object.values(favorites)) {
      if (value.eventId === eventId) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
};