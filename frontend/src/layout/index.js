import React from "react";
import MainLayout from "./MainLayout";

// Wrapper for backward compatibility if any component expects specific layout imports
export const LoggedInLayout = ({ children }) => <MainLayout>{children}</MainLayout>;

export default LoggedInLayout;
