import { createContext, useContext, useEffect, useState } from 'react';
import {
  confirmSignUp as confirmSignUpService,
  getCurrentUser,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService
} from './authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkUser();
  }, []);

  const signIn = async (email, password) => {
    const result = await signInService({ username: email, password });
    
    if (result.isSignedIn) {
      await checkUser(); 
    }
    
    return result; 
  };

  const signUp = async (email, password) => {
    return signUpService({
      username: email,
      password,
      options: {
        userAttributes: { email } 
      }
    });
  };

  const confirmSignUp = async (email, code) => {
    return confirmSignUpService({
      username: email,
      confirmationCode: code
    });
  };

  const signOut = async () => {
    try {
      await signOutService();
    } catch (err) {
      console.log("Sign out error", err);
    }
    setUser(null);
  };

  const value = {
    user,
    loading,
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
