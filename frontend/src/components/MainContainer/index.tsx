import React from "react";

interface MainContainerProps {
  children: React.ReactNode;
}

const MainContainer = ({ children }: MainContainerProps) => {
  return (
    <div className="flex-1 p-0 h-full">
      <div className="h-full overflow-y-hidden flex flex-col">{children}</div>
    </div>
  );
};

export default MainContainer;
