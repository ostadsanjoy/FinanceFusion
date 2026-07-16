import axios from 'axios';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signup = async (email, password, fullName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName) {
    await updateProfile(credential.user, { displayName: fullName });
  }
  await sendEmailVerification(credential.user);
  return credential.user;
};

// Used from the "check your email" screen right after signup, where the
// user is still signed in (just unverified) — no need to re-enter anything.
export const resendVerificationEmail = async () => {
  if (!auth.currentUser) {
    throw new Error('No active session to resend a verification email for.');
  }
  await sendEmailVerification(auth.currentUser);
};

export const loginWithGoogle = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
};

export const logout = async () => {
  await signOut(auth);
};

export const forgotPassword = async (email) => {
  // Firebase sends its own password-reset email (with a hosted reset page)
  // directly — no backend involvement, no deliverability issues to debug.
  await sendPasswordResetEmail(auth, email);
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

export const importTransactions = async (file, year) => {
  const formData = new FormData();
  formData.append('file', file);
  if (year) formData.append('year', year);

  const response = await axios.post(`${API_URL}/transactions/import`, formData, {
    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { imported, skipped }
};

export const exportTransactions = async () => {
  const response = await axios.get(`${API_URL}/transactions/export`, {
    headers: getAuthHeader(),
    responseType: 'blob',
  });

  // Trigger a browser download of the returned xlsx file
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const filename = `spends_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};