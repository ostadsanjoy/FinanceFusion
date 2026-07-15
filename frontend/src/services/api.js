import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const response = await axios.post(`${API_URL}/api/v1/auth/login`, formData);
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
};

export const signup = async (email, password, fullName) => {
  const response = await axios.post(`${API_URL}/api/v1/auth/signup`, {
    email,
    password,
    full_name: fullName,
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getTransactions = async () => {
  try {
    const response = await axios.get(`${API_URL}/transactions`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
};

export const createTransaction = async (transactionData) => {
  try {
    const response = await axios.post(`${API_URL}/transactions`, transactionData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
};

export const updateTransaction = async (id, transactionData) => {
  try {
    const response = await axios.put(`${API_URL}/transactions/${id}`, transactionData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Update error:", error);
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    await axios.delete(`${API_URL}/transactions/${id}`, {
      headers: getAuthHeader(),
    });
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};

export const getBudgets = async () => {
  try {
    const response = await axios.get(`${API_URL}/budgets`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Fetch budgets error:", error);
    return [];
  }
};

export const setBudget = async (category, amount) => {
  try {
    const response = await axios.post(`${API_URL}/budgets`, { category, amount }, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Set budget error:", error);
    throw error;
  }
};

export const forgotPassword = async (email) => {
  const response = await axios.post(`${API_URL}/api/v1/auth/forgot-password`, { email });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
    email,
    otp,
    new_password: newPassword,
  });
  return response.data;
};