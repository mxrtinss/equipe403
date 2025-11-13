import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileSettingsScreen from './screens/ProfileSettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import NearbyEventsScreen from './screens/NearbyEventsScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import MyEventsScreen from './screens/MyEventsScreen';
import { EventsProvider } from './contexts/EventsContext';
import * as Notifications from 'expo-notifications';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="NearbyEvents" component={NearbyEventsScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch (e) {
      }
    })();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <EventsProvider>
          <AppNavigator />
        </EventsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}






