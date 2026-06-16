import React, { ReactNode } from "react";

interface TabPanelProps {
  children: ReactNode;
  value: string | number;
  name: string | number;
  [key: string]: unknown;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, name, ...rest }) => {
  if (value !== name) return null;
  return (
    <div
      role="tabpanel"
      id={`simple-tabpanel-${name}`}
      aria-labelledby={`simple-tab-${name}`}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
};

export default TabPanel;
