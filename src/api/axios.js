import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://eventhub-backend-nfzk.onrender.com/api/v1' : 'http://localhost:5000/api/v1'),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {

    if (error.response && error.response.status === 401) {

      const publicPages = ['/login', '/register', '/', '/home', '/events', '/forgot-password'];
      const currentPath = window.location.pathname;

      const isPublic =
        publicPages.includes(currentPath) ||
        currentPath.startsWith('/event-details/') ||
        currentPath.startsWith('/reset-password/') ||
        currentPath.startsWith('/resetpassword/');

      if (!isPublic) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;