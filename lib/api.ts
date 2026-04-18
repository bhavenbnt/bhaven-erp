// lib/api.ts
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

async function request(method: string, path: string, body?: unknown) {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    // 토큰 만료 시 자동 로그아웃 (로그인/회원가입 요청은 제외)
    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return { data };
    }
    throw { response: { data, status: res.status } };
  }
  return { data };
}

const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  put: (path: string, body?: unknown) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
};

export default api;
