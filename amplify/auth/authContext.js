import { createContext, useContext, useEffect, useState } from 'react';
import {
  confirmUser,
  getUserId,
  login,
  logout,
  register
} from './authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const userId = await getUserId(); 
      setUser(userId);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkUser();
  }, []);

  const signIn = async (email, password) => {
    const result = await login(email, password);
    
    if (result.isSignedIn) {
      await checkUser(); 
    }
    
    return result; 
  };

  const signUp = async (email, password) => {
    return register(email, password);
  };

  const confirmSignUp = async (email, code) => {
    return confirmUser(email, code);
  };

  const signOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.log("Sign out error", err);
    }
    setUser(null); 
  };

  const value = {
    user,              
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    refreshUser: checkUser,
    isAuthenticated: !!user, 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};