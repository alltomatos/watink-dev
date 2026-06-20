import React from "react";
import { Globe } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";

interface PAPISectionProps {
  getSettingValue: (key: string) => string;
  handleUpdateSetting: (key: string, value: string) => Promise<void>;
}

const PAPISection: React.FC<PAPISectionProps> = ({ getSettingValue, handleUpdateSetting }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-primary">
        <Globe className="h-5 w-5" />
        Gateway PAPI (Provedor Avançado)
      </CardTitle>
      <CardDescription>Configure a integração e tokens com APIs externas padrão WABA</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="papi-url">API URL base</Label>
        <Input
          id="papi-url"
          defaultValue={getSettingValue("papi_url")}
          placeholder="https://api.waba.providers.com/v1"
          onBlur={(e) => handleUpdateSetting("papi_url", e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="papi-token">Token do Gateway</Label>
        <Input
          id="papi-token"
          type="password"
          defaultValue={getSettingValue("papi_token")}
          placeholder="Bearer token corporativo"
          onBlur={(e) => handleUpdateSetting("papi_token", e.target.value)}
        />
      </div>
    </CardContent>
  </Card>
);

export default PAPISection;
