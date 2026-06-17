import React from "react";
import MainLayout from "./MainLayout";

// Wrapper for backward compatibility if any component expects specific layout imports
export const LoggedInLayout = ({ children }: { children: React.ReactNode }) => (
  <MainLayout>{children}</MainLayout>
);

export default LoggedInLayout;
