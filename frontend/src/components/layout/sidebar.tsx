import React from "react";
import { cn } from "@/lib/utils";
import {
  X
} from "lucide-react";
import { Button } from "../ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  logo?: string;
  title?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  children,
  logo,
  title
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar transition-transform duration-300 transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-sidebar/50 backdrop-blur-sm">
          {/* Logo Area */}
          <div className="h-20 flex items-center justify-center border-b border-border px-6">
            {logo ? (
              <img src={logo} alt="Logo" className="max-h-12 object-contain" />
            ) : (
              <span className="font-bold text-xl text-primary truncate">{title}</span>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden ml-auto" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1">
            {children}
          </nav>

          {/* Footer Version */}
          <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
            Watink v0.8.1
          </div>
        </div>
      </aside>
    </>
  );
};
