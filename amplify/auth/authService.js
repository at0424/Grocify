import { Auth } from 'aws-amplify';

export const signUp = async (email, password) => {
  return Auth.signUp({
    username: email,
    password,
    attributes: { email },
  });
};

export const confirmSignUp = async (email, code) => {
  return Auth.confirmSignUp(email, code);
};

export const signIn = async (email, password) => {
  return Auth.signIn(email, password);
};

export const signOut = async () => {
  return Auth.signOut();
};

export const getCurrentUser = async () => {
  return Auth.currentAuthenticatedUser();
};

export const getAccessToken = async () => {
  const session = await Auth.currentSession();
  return session.getAccessToken().getJwtToken();
};
