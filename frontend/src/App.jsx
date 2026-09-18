import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import PDV from './pages/PDV.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Orders from './pages/Orders.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ContasReceber from './pages/ContasReceber';
import Users from './pages/Users';


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pdv" element={<PDV />} />
                  <Route path="/produtos" element={<Products />} />
                  <Route path="/clientes" element={<Customers />} />
                  <Route path="/pedidos" element={<Orders />} />
                  <Route path="/contas-receber" element={<ContasReceber />} />
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Route>
              </Route>
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}