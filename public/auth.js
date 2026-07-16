function getToken() {
  return localStorage.getItem('pkm_token');
}

function setToken(token) {
  localStorage.setItem('pkm_token', token);
}

function clearToken() {
  localStorage.removeItem('pkm_token');
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return null;
  }
  return token;
}

async function apiAuth(url, options = {}) {
  const token = checkAuth();
  if (!token) throw new Error('Not authenticated');

  const headers = options.headers || {};
  if (!options.body || !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      'Authorization': 'Bearer ' + token
    }
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    throw new Error('Sesi habis, silakan login ulang');
  }

  return res;
}

async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    } catch (_) {}
  }
  clearToken();
  window.location.href = '/login.html';
}
