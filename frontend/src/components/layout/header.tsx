import React from "react";
import { Menu, User, Bell } from "lucide-react";
import { Button } from "../ui/button";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  onLogout: () => void;
  user?: {
    name: string;
    profileImage?: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  onLogout,
  user
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={onLogout}>
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
