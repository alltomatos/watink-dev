import React, { createContext, ReactNode } from "react";
import useAuth, { AuthUser } from "../../hooks/useAuth";

interface AuthContextValue {
  loading: boolean;
  user: AuthUser;
  isAuth: boolean;
  handleLogin: (
    userData: { email: string; password: string },
    rememberMe?: boolean
  ) => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { loading, user, isAuth, handleLogin, handleLogout } = useAuth();

  return (
    <AuthContext.Provider
      value={{ loading, user, isAuth, handleLogin, handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
