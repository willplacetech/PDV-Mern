import { useState } from 'react';
import { AuthContext } from './AuthContextDefinition.jsx';

export { AuthContext } from './AuthContextDefinition.jsx';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pdv_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const loading = false;
  
  const login = (username, password) => {
    if (username !== 'admin' || password !== '1234') {
      return Promise.reject(new Error('Usuário ou senha inválidos'));
    }

    const mockUser = { username: 'admin', role: 'admin' };
    localStorage.setItem('pdv_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return Promise.resolve(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('pdv_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};