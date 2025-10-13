import { FIREBASE_AUTH } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged, updateProfile } from 'firebase/auth';

export const loginUser = async (email, password) => {
  try {
    console.log('🔥 Tentando fazer login com:', email);
    console.log('🔥 Auth instance:', FIREBASE_AUTH);
    console.log('🔥 Auth app name:', FIREBASE_AUTH.app.name);
    
    const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
    return {
      success: true,
      user: userCredential.user,
      message: 'Login realizado com sucesso!'
    };
  } catch (error) {
    console.error('❌ Erro completo no login:', error);
    console.error('❌ Código do erro:', error.code);
    console.error('❌ Mensagem do erro:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    let errorMessage = 'Erro ao fazer login. Tente novamente.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Usuário não encontrado.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Senha incorreta.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email inválido.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Esta conta foi desabilitada.';
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

export const registerUser = async (name, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
    
    await updateProfile(userCredential.user, {
      displayName: name
    });
    
    return {
      success: true,
      user: userCredential.user,
      message: 'Conta criada com sucesso!'
    };
  } catch (error) {
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

export const createCompleteAccount = async (userData) => {
  try {
    const { createAccount } = await import('./databaseService.js');
    return await createAccount(userData);
  } catch (error) {
    console.error('Erro ao importar createAccount:', error);
    return {
      success: false,
      error: 'Erro interno. Tente novamente.'
    };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(FIREBASE_AUTH);
    return {
      success: true,
      message: 'Logout realizado com sucesso!'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao fazer logout.'
    };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(FIREBASE_AUTH, email);
    return {
      success: true,
      message: 'Email de redefinição enviado! Verifique sua caixa de entrada.'
    };
  } catch (error) {
    let errorMessage = 'Erro ao enviar email de redefinição.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Usuário não encontrado.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email inválido.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
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

export const onAuthStateChange = (callback) => {
  try {
    return onAuthStateChanged(FIREBASE_AUTH, callback);
  } catch (error) {
    console.error('Erro ao configurar listener de autenticação:', error);
    return () => {};
  }
};

export const getCurrentUser = () => {
  try {
    return FIREBASE_AUTH.currentUser;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
};

export const updateUserProfile = async (updates) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Usuário não está logado.'
      };
    }

    await updateProfile(user, updates);
    
    return {
      success: true,
      user: user,
      message: 'Perfil atualizado com sucesso!'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao atualizar perfil.'
    };
  }
};