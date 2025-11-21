import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('token', data.data.token);
        api.defaults.headers.Authorization = `Bearer ${data.data.token}`;
        originalRequest.headers.Authorization = `Bearer ${data.data.token}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// Board API
export const boardAPI = {
  getBoards: () => api.get('/boards'),
  getBoard: (id) => api.get(`/boards/${id}`),
  createBoard: (boardData) => api.post('/boards', boardData),
  updateBoard: (id, boardData) => api.put(`/boards/${id}`, boardData),
  deleteBoard: (id) => api.delete(`/boards/${id}`),
  inviteMember: (id, email) => api.post(`/boards/${id}/invite`, { email }),
  removeMember: (boardId, userId) => api.delete(`/boards/${boardId}/members/${userId}`),
};

// Card API
export const cardAPI = {
  createCard: (cardData) => api.post('/cards', cardData),
  updateCard: (id, cardData) => api.put(`/cards/${id}`, cardData),
  deleteCard: (id) => api.delete(`/cards/${id}`),
  moveCard: (id, moveData) => api.put(`/cards/${id}/move`, moveData),
  getRecommendations: (id) => api.get(`/cards/${id}/recommendations`),
  addComment: (id, text) => api.post(`/cards/${id}/comments`, { text }),
};

export default api;