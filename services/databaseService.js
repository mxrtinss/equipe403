import { FIREBASE_DB } from '../config/firebase.js';
import { ref, set, get, push, update, remove, onValue, off } from 'firebase/database';

export const createInitialData = async () => {
  try {
    console.log('🔥 Criando dados iniciais no Realtime Database...');

    const usersData = {
      "user1": {
        nome: "Victor Secchi",
        email: "victor@email.com",
        senha: "senha123",
        fotoPerfil: "https://i.imgur.com/abcd123.png",
        dataCadastro: new Date().toISOString()
      },
      "user2": {
        nome: "Maria Oliveira",
        email: "maria@email.com",
        senha: "senha123",
        fotoPerfil: "https://i.imgur.com/efgh456.png",
        dataCadastro: new Date().toISOString()
      }
    };

    const eventsData = {
      "event1": {
        nome: "Festival de Música",
        descricao: "Um evento incrível com várias bandas",
        local: "São Paulo",
        latitude: -23.55052,
        longitude: -46.633308,
        dataInicio: new Date("2025-11-01T18:00:00Z").toISOString(),
        dataFim: new Date("2025-11-02T23:00:00Z").toISOString(),
        criadoPor: "user1",
        participantes: ["user2"]
      },
      "event2": {
        nome: "Feira de Tecnologia",
        descricao: "Feira com startups e palestras de tecnologia",
        local: "Rio de Janeiro",
        latitude: -22.906847,
        longitude: -43.172896,
        dataInicio: new Date("2025-12-05T09:00:00Z").toISOString(),
        dataFim: new Date("2025-12-05T18:00:00Z").toISOString(),
        criadoPor: "user2",
        participantes: ["user1"]
      }
    };

    await set(ref(FIREBASE_DB, 'users'), usersData);
    console.log('✅ Usuários criados com sucesso!');

    await set(ref(FIREBASE_DB, 'events'), eventsData);
    console.log('✅ Eventos criados com sucesso!');

    return { success: true, message: 'Dados iniciais criados com sucesso!' };
  } catch (error) {
    console.error('❌ Erro ao criar dados iniciais:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersRef = ref(FIREBASE_DB, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return {};
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
};

export const getAllEvents = async () => {
  try {
    const eventsRef = ref(FIREBASE_DB, 'events');
    const snapshot = await get(eventsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return {};
    }
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const userRef = ref(FIREBASE_DB, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }
};

export const getEventById = async (eventId) => {
  try {
    const eventRef = ref(FIREBASE_DB, `events/${eventId}`);
    const snapshot = await get(eventRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const newUserRef = push(ref(FIREBASE_DB, 'users'));
    const userDataWithTimestamp = {
      ...userData,
      dataCadastro: new Date().toISOString()
    };
    
    await set(newUserRef, userDataWithTimestamp);
    return newUserRef.key;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
};

export const createEvent = async (eventData) => {
  try {
    const newEventRef = push(ref(FIREBASE_DB, 'events'));
    const eventDataWithTimestamp = {
      ...eventData,
      dataCriacao: new Date().toISOString()
    };
    
    await set(newEventRef, eventDataWithTimestamp);
    return newEventRef.key;
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const userRef = ref(FIREBASE_DB, `users/${userId}`);
    const userDataWithTimestamp = {
      ...userData,
      dataAtualizacao: new Date().toISOString()
    };
    
    await update(userRef, userDataWithTimestamp);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    const eventRef = ref(FIREBASE_DB, `events/${eventId}`);
    const eventDataWithTimestamp = {
      ...eventData,
      dataAtualizacao: new Date().toISOString()
    };
    
    await update(eventRef, eventDataWithTimestamp);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const userRef = ref(FIREBASE_DB, `users/${userId}`);
    await remove(userRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const eventRef = ref(FIREBASE_DB, `events/${eventId}`);
    await remove(eventRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    throw error;
  }
};

export const listenToUsers = (callback) => {
  const usersRef = ref(FIREBASE_DB, 'users');
  const unsubscribe = onValue(usersRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });
  
  return () => off(usersRef, 'value', unsubscribe);
};

export const listenToEvents = (callback) => {
  const eventsRef = ref(FIREBASE_DB, 'events');
  const unsubscribe = onValue(eventsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });
  
  return () => off(eventsRef, 'value', unsubscribe);
};

export const getEventsByUser = async (userId) => {
  try {
    const eventsRef = ref(FIREBASE_DB, 'events');
    const snapshot = await get(eventsRef);
    
    if (snapshot.exists()) {
      const events = snapshot.val();
      const userEvents = {};
      
      Object.keys(events).forEach(eventId => {
        if (events[eventId].criadoPor === userId) {
          userEvents[eventId] = events[eventId];
        }
      });
      
      return userEvents;
    } else {
      return {};
    }
  } catch (error) {
    console.error('Erro ao buscar eventos do usuário:', error);
    throw error;
  }
};

export const addParticipantToEvent = async (eventId, userId) => {
  try {
    const eventRef = ref(FIREBASE_DB, `events/${eventId}/participantes`);
    const snapshot = await get(eventRef);
    
    let participantes = [];
    if (snapshot.exists()) {
      participantes = snapshot.val();
    }
    
    if (!participantes.includes(userId)) {
      participantes.push(userId);
      await set(eventRef, participantes);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    throw error;
  }
};

export const removeParticipantFromEvent = async (eventId, userId) => {
  try {
    const eventRef = ref(FIREBASE_DB, `events/${eventId}/participantes`);
    const snapshot = await get(eventRef);
    
    if (snapshot.exists()) {
      let participantes = snapshot.val();
      participantes = participantes.filter(id => id !== userId);
      await set(eventRef, participantes);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    throw error;
  }
};

export const createAccount = async (userData) => {
  try {
    console.log('🔥 Criando nova conta...');
    
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const { FIREBASE_AUTH } = await import('../config/firebase.js');
    
    const userCredential = await createUserWithEmailAndPassword(
      FIREBASE_AUTH, 
      userData.email, 
      userData.senha
    );
    
    const user = userCredential.user;
    console.log('✅ Usuário criado no Auth:', user.uid);
    
    await updateProfile(user, {
      displayName: userData.nome
    });
    
    const userProfile = {
      uid: user.uid,
      nome: userData.nome,
      email: userData.email,
      fotoPerfil: userData.fotoPerfil || '',
      dataCadastro: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
      ativo: true,
      eventosCriados: [],
      eventosParticipando: []
    };
    
    await set(ref(FIREBASE_DB, `users/${user.uid}`), userProfile);
    console.log('✅ Perfil criado no Database');
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        ...userProfile
      },
      message: 'Conta criada com sucesso!'
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar conta:', error);
    
    let errorMessage = 'Erro ao criar conta. Tente novamente.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Este email já está em uso.';
        break;
      case 'auth/weak-password':
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email inválido.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Operação não permitida.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Erro de conexão. Verifique sua internet.';
        break;
      default:
        errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

export const getUserProfile = async (uid) => {
  try {
    const userRef = ref(FIREBASE_DB, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = ref(FIREBASE_DB, `users/${uid}`);
    
    const updatesWithTimestamp = {
      ...updates,
      dataAtualizacao: new Date().toISOString()
    };
    
    await update(userRef, updatesWithTimestamp);
    console.log('✅ Perfil atualizado com sucesso');
    
    return { success: true, message: 'Perfil atualizado com sucesso!' };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { success: false, error: 'Erro ao atualizar perfil.' };
  }
};

export const deleteAccount = async (uid) => {
  try {
    const { deleteUser } = await import('firebase/auth');
    const { FIREBASE_AUTH } = await import('../config/firebase.js');
    
    const userRef = ref(FIREBASE_DB, `users/${uid}`);
    await remove(userRef);
    console.log('✅ Perfil removido do Database');
    
    const user = FIREBASE_AUTH.currentUser;
    if (user && user.uid === uid) {
      await deleteUser(user);
      console.log('✅ Usuário removido do Auth');
    }
    
    return { success: true, message: 'Conta deletada com sucesso!' };
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    return { success: false, error: 'Erro ao deletar conta.' };
  }
};
