/* @jsxImportSource react */
import React, { useContext } from "react";
import { Loader2 } from "lucide-react";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";

import { useMarketplace } from "./hooks/useMarketplace";
import { MarketplaceToolbar } from "./components/MarketplaceToolbar";
import { OfflineBanner, InstanceIdBanner } from "./components/MarketplaceStatusBanner";
import { PluginGrid } from "./components/PluginGrid";
import { PluginTable } from "./components/PluginTable";

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const {
    loading,
    searchParam,
    setSearchParam,
    view,
    setView,
    offline,
    instanceId,
    entitlements,
    filteredPlugins,
    handlePluginClick,
    handleCopyInstanceId,
  } = useMarketplace();

  return (
    <Can
      user={user}
      perform="view_marketplace"
      no={() => (
        <PageContainer>
          <PageContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Você não tem permissão para acessar o Marketplace.
            </div>
          </PageContent>
        </PageContainer>
      )}
      yes={() => (
        <PageContainer>
          <PageHeader
            title="Marketplace"
            description="Amplie as funcionalidades do Watink com integrações e extensões premium"
          >
            <MarketplaceToolbar
              searchParam={searchParam}
              onSearchChange={setSearchParam}
              view={view}
              onViewChange={setView}
            />
          </PageHeader>

          <PageContent>
            <OfflineBanner offline={offline} />
            <InstanceIdBanner
              instanceId={instanceId}
              entitlements={entitlements}
              onCopy={handleCopyInstanceId}
            />

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : view === "grid" ? (
              <PluginGrid plugins={filteredPlugins} onPluginClick={handlePluginClick} />
            ) : (
              <PluginTable plugins={filteredPlugins} onPluginClick={handlePluginClick} />
            )}
          </PageContent>
        </PageContainer>
      )}
    />
  );
};

export default Marketplace;
