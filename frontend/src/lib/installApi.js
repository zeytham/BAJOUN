const nativeFetch = window.fetch.bind(window);

export function installApi() {
  window.fetch = (input, init = {}) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const base = (localStorage.getItem('phonevault_api_base') || '').replace(/\/$/, '');
      input = `${base}${input}`;
      const headers = new Headers(init.headers || {});
      const token = localStorage.getItem('phonevault_token');
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      let deviceId = localStorage.getItem('phonevault_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('phonevault_device_id', deviceId);
      }
      if (!headers.has('X-Device-Id')) headers.set('X-Device-Id', deviceId);
      init = { ...init, headers };
    }
    return nativeFetch(input, init);
  };
}
