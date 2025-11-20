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
import { registerUser } from '../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu nome');
      return;
    }

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

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser(name, email, password);
      
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
            <Text style={styles.title}>Criar Conta</Text>
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

          {/* Formulário */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome completo"
                placeholderTextColor="#666"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite aqui seu email"
                placeholderTextColor="#666"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
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
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
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

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirme sua senha"
                placeholderTextColor="#666"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#8B5CF6" 
                />
              </TouchableOpacity>
            </View>

            {/* Botão de cadastro */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Text>
            </TouchableOpacity>

            {/* Link para login */}
            <View style={styles.loginSection}>
              <Text style={styles.loginQuestion}>Já possui uma conta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Faça login aqui!</Text>
              </TouchableOpacity>
            </View>
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
  form: {
    width: '100%',
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
  registerButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: '100%',
    marginTop: 20,
    marginBottom: 30,
  },
  registerButtonDisabled: {
    backgroundColor: '#A78BFA',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loginSection: {
    alignItems: 'center',
  },
  loginQuestion: {
    color: '#666',
    fontSize: 16,
    marginBottom: 10,
  },
  loginLink: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;
