import React, { useContext } from "react";
import { Search, Plus } from "lucide-react";

import { i18n } from "../../../translate/i18n";
import { Can } from "../../../components/Can";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface GroupsToolbarProps {
  searchParam: string;
  onSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: () => void;
}

const GroupsToolbar: React.FC<GroupsToolbarProps> = ({
  searchParam,
  onSearch,
  onAdd,
}) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={i18n.t("groups.searchPlaceholder") as string}
          value={searchParam}
          onChange={onSearch}
          className="pl-9 h-10"
        />
      </div>
      <Can
        user={user}
        perform="groups:create"
        yes={() => (
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {i18n.t("groups.buttons.add")}
          </Button>
        )}
      />
    </div>
  );
};

export default GroupsToolbar;
