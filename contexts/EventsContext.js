import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'user-events';

const EventsContext = createContext({});

export const useEvents = () => {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within EventsProvider');
  return ctx;
};

export const EventsProvider = ({ children }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setEvents(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch {}
    })();
  }, [events]);

  const createEvent = (payload) => {
    const id = uuidv4();
    const newEvent = { id, ...payload, createdAt: Date.now() };
    setEvents((prev) => [newEvent, ...prev]);
    return id;
  };

  const updateEvent = (id, updates) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const value = useMemo(() => ({ events, createEvent, updateEvent, deleteEvent }), [events]);

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};


