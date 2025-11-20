import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Por favor, digite um email válido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        Alert.alert('Sucesso', result.message, [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]);
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.title}>Esqueci minha senha</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Ionicons name="calendar" size={40} color="white" />
              <Ionicons name="location" size={20} color="white" style={styles.locationIcon} />
            </View>
            <Text style={styles.appName}>festei!</Text>
          </View>

          {/* Ícone de email */}
          <View style={styles.emailIconContainer}>
            <Ionicons name="mail-outline" size={50} color="#8B5CF6" />
          </View>

          {/* Instruções */}
          <Text style={styles.instructions}>
            Digite seu email cadastrado e enviaremos um link para redefinir sua senha.
          </Text>

          {/* Campo de email */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite aqui seu email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Botão de enviar */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendResetEmail}
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Text>
          </TouchableOpacity>

          {/* Link para voltar ao login */}
          <View style={styles.backToLoginSection}>
            <Text style={styles.backToLoginText}>Lembrou da senha?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backToLoginLink}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textTransform: 'lowercase',
  },
  emailIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: '100%',
    marginBottom: 30,
  },
  sendButtonDisabled: {
    backgroundColor: '#A78BFA',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backToLoginSection: {
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 10,
  },
  backToLoginLink: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
