import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler, tokenStore } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    if (!tokenStore.get()) {
      setBooting(false);
      return;
    }
    refresh()
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, [refresh]);

  const login = useCallback(async (email, password, remember = true) => {
    const { token, user: u } = await authService.login(email, password);
    tokenStore.set(token, remember);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    if (res.token) {
      tokenStore.set(res.token, true);
      setUser(res.user);
    }
    return res;
  }, []);

  const value = useMemo(() => ({ user, booting, login, register, logout, refresh, setUser }), [user, booting, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
