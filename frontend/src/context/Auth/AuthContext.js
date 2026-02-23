/* @jsxImportSource react */
import React, { createContext } from "react";

import useAuth from "../../hooks/useAuth";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
	const { loading, user, isAuth, handleLogin, handleLogout, hasPermission } = useAuth();

	return (
		<AuthContext.Provider
			value={{ loading, user, isAuth, handleLogin, handleLogout, hasPermission }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };
