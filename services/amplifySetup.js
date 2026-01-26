import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  API: {
    REST: {
      "GroceryAPI": {
        endpoint: "https://hacmh7otb8.execute-api.ap-southeast-5.amazonaws.com/default/getGroceryCatalog",
        region: "ap-southeast-5"
      }
    }
  },
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-5_V5ASezYVm',
      userPoolClientId: '3s70app91a1lcscqpeqtrhmm5j',
      loginWith: {
        email: true,
      }
    }
  }
};

Amplify.configure(amplifyConfig);
