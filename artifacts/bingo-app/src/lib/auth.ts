import { setAuthTokenGetter } from '@workspace/api-client-react';

export function setupAuth() {
  setAuthTokenGetter(() => localStorage.getItem('bingoToken'));
}

export function setToken(token: string) {
  localStorage.setItem('bingoToken', token);
}

export function getToken() {
  return localStorage.getItem('bingoToken');
}

export function clearToken() {
  localStorage.removeItem('bingoToken');
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  clearToken();
  window.location.href = '/login';
}

export function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function isAdmin() {
  const token = getToken();
  if (!token) return false;
  const decoded = parseJwt(token);
  return decoded?.role === 'admin';
}
