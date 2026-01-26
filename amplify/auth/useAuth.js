import { useContext } from 'react';
import { AuthContext } from '../../auth/authContext';

export default function useAuth() {
  return useContext(AuthContext);
}
