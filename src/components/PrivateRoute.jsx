import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

export default function PrivateRoute() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{padding:30}}>Carregando...</div>;
  return user ? <Outlet /> : <Navigate to="/login" />;
}