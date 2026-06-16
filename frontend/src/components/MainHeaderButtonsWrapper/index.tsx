import React from "react";

interface MainHeaderButtonsWrapperProps {
  children: React.ReactNode;
}

const MainHeaderButtonsWrapper = ({ children }: MainHeaderButtonsWrapperProps) => {
  return (
    <div className="flex-none ml-auto flex items-center gap-2">{children}</div>
  );
};

export default MainHeaderButtonsWrapper;
