/* @jsxImportSource react */
import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";

const Route = ({ component: Component, isPrivate = false, isPublic = false, ...rest }) => {
  const { isAuth, loading } = useContext(AuthContext);

  if (loading) {
    return <BackdropLoading />;
  }

  // Allow initial-setup regardless of auth
  if (rest.path === "/initial-setup") {
    return <RouterRoute {...rest} component={Component} />;
  }

  if (!isAuth && isPrivate) {
    return (
      <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
    );
  }

  if (isAuth && !isPrivate && !isPublic) {
    return (
      <Redirect to={{ pathname: "/", state: { from: rest.location } }} />
    );
  }

  return (
    <RouterRoute {...rest} component={Component} />
  );
};

export default Route;
