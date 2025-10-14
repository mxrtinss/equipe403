import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../services/authService';

const LoginScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Por favor, digite um email válido');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Erro', 'Por favor, digite sua senha');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        if (route.params?.onLoginSuccess) {
          route.params.onLoginSuccess();
        }
        
        const successMessage = route.params?.actionName 
          ? `Login realizado! Agora você pode ${route.params.actionName.toLowerCase()}.`
          : 'Login realizado com sucesso!';
          
        Alert.alert('Sucesso', successMessage, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
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

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header com botão voltar */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Login</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Mensagem personalizada se veio de uma ação específica */}
          {route.params?.actionName && (
            <View style={styles.actionMessage}>
              <Text style={styles.actionMessageText}>
                Faça login para {route.params.actionName.toLowerCase()}
              </Text>
            </View>
          )}

          {/* Logo e nome do app */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Ionicons name="calendar" size={40} color="white" />
              <Ionicons name="location" size={20} color="white" style={styles.locationIcon} />
            </View>
            <Text style={styles.appName}>festei!</Text>
          </View>

          {/* Ícone do usuário */}
          <View style={styles.userIconContainer}>
            <Ionicons name="person-outline" size={40} color="#8B5CF6" />
          </View>

          {/* Campos de entrada */}
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

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite aqui sua senha"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#8B5CF6" 
              />
            </TouchableOpacity>
          </View>

          {/* Link esqueci senha */}
          <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          {/* Botão de login */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          {/* Seção de cadastro */}
          <View style={styles.registerSection}>
            <Text style={styles.registerQuestion}>Não possui uma conta?</Text>
            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
              <Text style={styles.registerButtonText}>Cadastre-se agora!</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  actionMessage: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  actionMessageText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
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
  userIconContainer: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
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
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: '100%',
    marginBottom: 30,
  },
  loginButtonDisabled: {
    backgroundColor: '#A78BFA',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  registerSection: {
    alignItems: 'center',
  },
  registerQuestion: {
    color: '#666',
    fontSize: 16,
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: '#A78BFA',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
