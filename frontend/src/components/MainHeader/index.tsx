import React from "react";

interface MainHeaderProps {
  children: React.ReactNode;
}

const MainHeader = ({ children }: MainHeaderProps) => {
  return (
    <div className="flex items-center px-1.5 pb-1.5">{children}</div>
  );
};

export default MainHeader;
