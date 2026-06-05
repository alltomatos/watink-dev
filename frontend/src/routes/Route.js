/* @jsxImportSource react */
import React, { useContext } from "react";
import { Route as RouterRoute, Navigate } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";

const Route = ({ isPrivate = false, isPublic = false, component: Component, ...rest }) => {
  const { isAuth, loading } = useContext(AuthContext);

  if (loading) {
    return <BackdropLoading />;
  }

  if (!isAuth && isPrivate) {
    return (
    <Navigate to="/login" state={{ from: rest.location }} replace />
    );
  }

  if (isAuth && !isPrivate && !isPublic) {
  return (
  <Navigate to="/" state={{ from: rest.location }} replace />
  );
  }

  return (
  <RouterRoute {...rest} element={<Component />} />
  );
};

export default Route;
