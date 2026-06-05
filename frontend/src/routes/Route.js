/* @jsxImportSource react */
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";

const PrivateRoute = ({ children, isPrivate = false, isPublic = false }) => {
  const { isAuth, loading } = useContext(AuthContext);

  if (loading) {
    return <BackdropLoading />;
  }

  if (isPrivate && !isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (!isPrivate && !isPublic && isAuth) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
