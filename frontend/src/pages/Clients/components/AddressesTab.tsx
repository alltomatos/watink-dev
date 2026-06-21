import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "../clientTypes";

interface AddressesTabProps {
  addresses: AddressInput[];
  onAdd: () => void;
  onAddressChange: (index: number, field: keyof AddressInput, value: string) => void;
  onRemove: (index: number) => void;
  onCepBlur: (index: number) => void;
}

const AddressesTab: React.FC<AddressesTabProps> = ({
  addresses, onAdd, onAddressChange, onRemove, onCepBlur,
}) => (
  <TabsContent value="addresses" className="mt-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-muted-foreground">Endereços</p>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar
      </Button>
    </div>

    {addresses.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum endereço adicionado
      </p>
    ) : (
      <div className="space-y-4">
        {addresses.map((address, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-muted/20 p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 text-destructive"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-4 gap-3 pr-10">
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-medium">Rótulo (ex: Sede)</label>
                <Input
                  value={address.label}
                  onChange={(e) => onAddressChange(index, "label", e.target.value)}
                  placeholder="Sede"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-medium">CEP</label>
                <Input
                  value={address.zipCode}
                  onChange={(e) => onAddressChange(index, "zipCode", e.target.value)}
                  onBlur={() => onCepBlur(index)}
                  placeholder="00000-000"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-medium">Número</label>
                <Input
                  value={address.number}
                  onChange={(e) => onAddressChange(index, "number", e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-medium">Complemento</label>
                <Input
                  value={address.complement}
                  onChange={(e) => onAddressChange(index, "complement", e.target.value)}
                  placeholder="Sala 101"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium">Logradouro</label>
                <Input
                  value={address.street}
                  onChange={(e) => onAddressChange(index, "street", e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium">Bairro</label>
                <Input
                  value={address.neighborhood}
                  onChange={(e) => onAddressChange(index, "neighborhood", e.target.value)}
                  placeholder="Bairro"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium">Cidade</label>
                <Input
                  value={address.city}
                  onChange={(e) => onAddressChange(index, "city", e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium">Estado (UF)</label>
                <Input
                  value={address.state}
                  onChange={(e) => onAddressChange(index, "state", e.target.value)}
                  placeholder="CE"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </TabsContent>
);

export default AddressesTab;
