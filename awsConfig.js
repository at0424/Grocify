import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-5_V5ASezYVm',
      userPoolClientId: '3s70app91a1lcscqpeqtrhmm5j',
      loginWith: {
        email: true,
      }
    }
  },
});

export default Amplify;