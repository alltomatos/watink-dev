import React from "react";
import { Field, FieldProps, useFormikContext } from "formik";
import { MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppData } from "../webchatModalTypes";
import { DEFAULT_WEBCHAT_BUTTON_COLOR } from "../hooks/useWebchatModal";

export const resolveDesignToken = (token: string): string => {
  if (typeof window === "undefined") return "var(--color-success)";
  const rootStyles = window.getComputedStyle(document.documentElement);
  const tokenMatch = token.match(/var\((--[^,)]+)/);
  const value = tokenMatch ? rootStyles.getPropertyValue(tokenMatch[1]).trim() : token;
  return value || "var(--color-success)";
};

const AppearanceTab: React.FC = () => {
  const { values, setFieldValue } = useFormikContext<WhatsAppData>();
  const currentColor = resolveDesignToken(values.chatConfig?.buttonColor || DEFAULT_WEBCHAT_BUTTON_COLOR);

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatConfig.title">Título do Chat</Label>
            <Field name="chatConfig.title">
              {({ field }: FieldProps) => (
                <Input {...field} id="chatConfig.title" />
              )}
            </Field>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chatConfig.subtitle">Subtítulo</Label>
            <Field name="chatConfig.subtitle">
              {({ field }: FieldProps) => (
                <Input {...field} id="chatConfig.subtitle" />
              )}
            </Field>
          </div>
          <div className="space-y-2">
            <Label>Cor do Botão</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={currentColor}
                onChange={(e) => setFieldValue("chatConfig.buttonColor", e.target.value)}
              />
              <span className="text-sm font-mono uppercase text-muted-foreground">
                {currentColor}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <Label className="mb-2">Prévia</Label>
          <div className="flex-1 min-h-[180px] rounded-lg border border-dashed flex items-end justify-end p-6 bg-muted/30 relative overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground uppercase tracking-widest">Preview Area</div>
            <div
              className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: currentColor }}
            >
              <MessageSquare className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceTab;
