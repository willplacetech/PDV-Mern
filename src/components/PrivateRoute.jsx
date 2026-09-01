import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextDefinition.jsx';

export default function PrivateRoute() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}