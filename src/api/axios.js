import axios from 'axios';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://eventhub-backend-nfzk.onrender.com/api/v1' : 'http://localhost:5000/api/v1'),
  withCredentials: true, 
});

// Add a request interceptor to automatically attach the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      const publicPages = ['/login', '/register', '/', '/home', '/events'];
      const isPublic = publicPages.includes(window.location.pathname) || window.location.pathname.startsWith('/event-details/');
      
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
