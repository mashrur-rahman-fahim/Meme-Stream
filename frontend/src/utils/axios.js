import axios from 'axios';
const api = axios.create({
  baseURL: 'http://localhost:5216/api', // Adjust the base URL as needed
  headers: {
    'Content-Type': 'application/json',
  },
});

//interceptor to insert the jwt token in the headers if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;