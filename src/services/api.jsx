import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCheck = err.config?.url?.endsWith('/auth/me');
    if (err.response?.status === 401 && !isAuthCheck) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;