import React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Contact } from "../hooks/useProtocolModal";

interface ProtocolContactSearchProps {
  contactSearch: string;
  contactLoading: boolean;
  contactOptions: Contact[];
  onSearch: (value: string) => void;
  onSelect: (contact: Contact) => void;
}

export function ProtocolContactSearch({
  contactSearch,
  contactLoading,
  contactOptions,
  onSearch,
  onSelect,
}: ProtocolContactSearchProps) {
  return (
    <div className="flex flex-col gap-1.5 relative">
      <Label htmlFor="contact-search">
        Contato <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Input
          id="contact-search"
          value={contactSearch}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Digite o nome do contato (mín. 3 letras)"
        />
        {contactLoading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {contactOptions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
          {contactOptions.map((contact) => (
            <li
              key={contact.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={() => onSelect(contact)}
            >
              {contact.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
