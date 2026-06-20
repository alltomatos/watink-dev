import React, { useContext } from "react";
import { Search, Plus } from "lucide-react";
import { PageHeader } from "../../../components/ui/page-layout";
import { Button as ShadButton } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { i18n } from "../../../translate/i18n";

interface UsersToolbarProps {
  searchParam: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddUser: () => void;
}

const UsersToolbar: React.FC<UsersToolbarProps> = ({ searchParam, onSearch, onAddUser }) => {
  const { user: loggedInUser } = useContext(AuthContext);

  return (
    <PageHeader title={i18n.t("users.title")}>
      <div className="flex items-center gap-2">
        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            className="pl-9 h-10"
            placeholder={i18n.t("contacts.searchPlaceholder") as string}
            type="search"
            value={searchParam}
            onChange={onSearch}
          />
        </div>
        <Can
          user={loggedInUser}
          perform="users:create"
          yes={() => (
            <ShadButton onClick={onAddUser} className="gap-2">
              <Plus className="h-4 w-4" />
              {i18n.t("users.buttons.add")}
            </ShadButton>
          )}
        />
      </div>
    </PageHeader>
  );
};

export default UsersToolbar;
