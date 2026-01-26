import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp
} from 'aws-amplify/auth';

export const register = async (email, password) => {
  return await signUp({
    username: email,
    password,
    options: {
      userAttributes: { email } 
    }
  });
};

export const confirmUser = async (email, code) => {
  return await confirmSignUp({
    username: email,
    confirmationCode: code
  });
};

export const login = async (email, password) => {
  return await signIn({
    username: email,
    password
  });
};

export const logout = async () => {
  return await signOut();
};

export const getUserId = async () => {
  try {
    const { userId } = await getCurrentUser();
    return userId;
  } catch (error) {
    console.log("Not logged in");
    return null;
  }
};

export const getAccessToken = async () => {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens.accessToken.toString();
  } catch (err) {
    console.log(err);
    return null;
  }
};