/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import { ShieldAlert } from "lucide-react";
import { getSwaggerUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";

// ─── Component ────────────────────────────────────────────────────────────────

const Swagger: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [url, setUrl] = useState("");

  const profile = (user?.profile || "").toLowerCase();
  const perms: string[] = user?.permissions || [];
  const hasPermission =
    profile === "superadmin" ||
    perms.includes("view_swagger") ||
    perms.includes("view:swagger");

  useEffect(() => {
    if (!hasPermission) return;
    const targetUrl = getSwaggerUrl();
    const raw = localStorage.getItem("token") || sessionStorage.getItem("token") || "null";
    const token = JSON.parse(raw);
    const withToken = token
      ? `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      : targetUrl;
    setUrl(withToken);
  }, [hasPermission]);

  if (!hasPermission) {
    return (
      <PageContainer>
        <PageContent>
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <p className="text-lg font-medium">Sem permissão para visualizar o Swagger.</p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Documentação API" description="Swagger UI — acesso restrito" />
      <PageContent className="p-0 flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
        <iframe
          src={url}
          title="Swagger UI"
          className="flex-1 w-full border-none"
        />
      </PageContent>
    </PageContainer>
  );
};

export default Swagger;
