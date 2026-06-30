import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: adjunta el JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dsn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si el token expiró, limpia sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dsn_token');
      localStorage.removeItem('dsn_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
