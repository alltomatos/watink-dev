import React from "react";
import { Mail } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

interface SMTPSectionProps {
  getSettingValue: (key: string) => string;
  handleUpdateSetting: (key: string, value: string) => Promise<void>;
}

const SMTPSection: React.FC<SMTPSectionProps> = ({ getSettingValue, handleUpdateSetting }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-primary">
        <Mail className="h-5 w-5" />
        Servidor SMTP (Envio de E-mail)
      </CardTitle>
      <CardDescription>Configure como a plataforma envia relatórios e alertas aos atendentes</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="smtp-server">Servidor SMTP</Label>
          <Input id="smtp-server" defaultValue={getSettingValue("smtp_server")} placeholder="smtp.exemplo.com" onBlur={(e) => handleUpdateSetting("smtp_server", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="smtp-port">Porta SMTP</Label>
          <Input id="smtp-port" defaultValue={getSettingValue("smtp_port")} placeholder="465 ou 587" onBlur={(e) => handleUpdateSetting("smtp_port", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="smtp-username">Usuário</Label>
          <Input id="smtp-username" defaultValue={getSettingValue("smtp_username")} placeholder="email@exemplo.com" onBlur={(e) => handleUpdateSetting("smtp_username", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="smtp-password">Senha</Label>
          <Input id="smtp-password" type="password" defaultValue={getSettingValue("smtp_password")} placeholder="Sua senha SMTP" onBlur={(e) => handleUpdateSetting("smtp_password", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="smtp-sender">E-mail Remetente</Label>
          <Input id="smtp-sender" defaultValue={getSettingValue("smtp_sender")} placeholder="noreply@exemplo.com" onBlur={(e) => handleUpdateSetting("smtp_sender", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Criptografia</Label>
          <Select value={getSettingValue("smtp_encryption") || "ssl"} onValueChange={(v) => handleUpdateSetting("smtp_encryption", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ssl">SSL (Recomenda-se para porta 465)</SelectItem>
              <SelectItem value="tls">TLS (Recomenda-se para porta 587)</SelectItem>
              <SelectItem value="none">Nenhuma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default SMTPSection;
