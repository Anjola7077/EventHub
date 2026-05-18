import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://eventhub-backend-nfzk.onrender.com/api/v1' : 'http://localhost:5000/api/v1'),
  withCredentials: true,
});

// Add a request interceptor to automatically attach the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the backend says the token is invalid, expired, or the user was deleted
    if (error.response && error.response.status === 401) {
      // Define pages where unauthenticated users are allowed to be
      const publicPages = ['/login', '/register', '/', '/home', '/events', '/forgot-password'];
      const currentPath = window.location.pathname;

      // Check if the current route is one of the strictly defined public pages or starts with a public dynamic route
      const isPublic =
        publicPages.includes(currentPath) ||
        currentPath.startsWith('/event-details/') ||
        currentPath.startsWith('/reset-password/') ||
        currentPath.startsWith('/resetpassword/');

      // Only force redirect to login if they are on a private dashboard/profile page
      if (!isPublic) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;