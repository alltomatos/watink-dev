/* @jsxImportSource react */
import React from "react";
import { Info, User, LogOut, Settings as SettingsIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { Avatar } from "../../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import NotificationsPopOver from "../NotificationsPopOver";
import { getBackendUrl } from "../../helpers/urlUtils";
import { User as UserDomain } from "../../types/domain";

interface MainTopBarProps {
  user: UserDomain | null;
  systemTitle: string;
  frontendVersion: string;
  onOpenUserModal: () => void;
  onLogout: () => void;
}

const MainTopBar: React.FC<MainTopBarProps> = ({
  user,
  systemTitle,
  frontendVersion,
  onOpenUserModal,
  onLogout
}) => {
  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground hidden sm:block">
          {systemTitle}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center h-8 w-8 text-primary cursor-help">
              <Info size={18} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Frontend v{frontendVersion}
          </TooltipContent>
        </Tooltip>

        {user?.id && <NotificationsPopOver />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 flex items-center justify-center overflow-hidden border border-border">
              <Avatar 
                src={getBackendUrl(user?.profileImage)} 
                name={user?.name} 
                size="md"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenUserModal} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default MainTopBar;
