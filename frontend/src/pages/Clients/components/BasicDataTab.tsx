import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientFormData } from "../clientTypes";

interface BasicDataTabProps {
  formData: ClientFormData;
  onChange: (field: keyof ClientFormData, value: string) => void;
}

const BasicDataTab: React.FC<BasicDataTabProps> = ({ formData, onChange }) => (
  <TabsContent value="basic" className="space-y-4 mt-4">
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-1 space-y-1.5">
        <label className="text-sm font-medium">Tipo</label>
        <Select value={formData.type} onValueChange={(v) => onChange("type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pf">Pessoa Física</SelectItem>
            <SelectItem value="pj">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3 space-y-1.5">
        <label className="text-sm font-medium">
          Nome / Razão Social <span className="text-destructive">*</span>
        </label>
        <Input
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Nome completo ou razão social"
        />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {formData.type === "pf" ? "CPF" : "CNPJ"}
        </label>
        <Input
          value={formData.document}
          onChange={(e) => onChange("document", e.target.value)}
          placeholder={formData.type === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="email@exemplo.com"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Telefone</label>
        <Input
          value={formData.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </div>
    </div>
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Observações</label>
      <Textarea
        value={formData.notes}
        onChange={(e) => onChange("notes", e.target.value)}
        rows={3}
        placeholder="Anotações sobre o cliente..."
      />
    </div>
  </TabsContent>
);

export default BasicDataTab;
