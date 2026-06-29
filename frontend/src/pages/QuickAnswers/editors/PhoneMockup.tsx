import React from "react";
import { Smartphone } from "lucide-react";

export function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Smartphone className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Preview</span>
      </div>
      <div
        className="relative w-[280px] rounded-[2.5rem] border-[6px] border-foreground/10 bg-[#111] shadow-2xl overflow-hidden"
        style={{ minHeight: 480 }}
      >
        {/* status bar */}
        <div className="bg-[#075E54] px-4 pt-3 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            W
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight">Watink</p>
            <p className="text-white/70 text-[10px]">online</p>
          </div>
        </div>
        {/* chat area */}
        <div
          className="p-3 flex flex-col justify-end min-h-[380px]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundColor: "hsl(var(--whatsapp-chat-bg, 37 28% 88%))",
          }}
        >
          {children}
        </div>
        {/* input bar */}
        <div className="bg-[#f0f0f0] px-2 py-2 flex items-center gap-1 border-t border-gray-200">
          <div className="flex-1 bg-white rounded-full px-3 py-1 text-xs text-gray-400">
            Mensagem
          </div>
          <div className="w-7 h-7 rounded-full bg-[#075E54] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
