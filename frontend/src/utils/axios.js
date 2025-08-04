import axios from 'axios';
const api = axios.create({
  baseURL: 'http://localhost:5216/api', // Adjust the base URL as needed
  headers: {
    'Content-Type': 'application/json',
  },
});
export default api;