import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProtocolDetails } from "./hooks/useProtocolDetails";
import ProtocolDetailsHeader from "./components/ProtocolDetailsHeader";
import ProtocolInfoCard from "./components/ProtocolInfoCard";
import ProtocolAttachmentsCard from "./components/ProtocolAttachmentsCard";
import ProtocolUpdateCard from "./components/ProtocolUpdateCard";
import ProtocolHistoryCard from "./components/ProtocolHistoryCard";

const ProtocolDetails: React.FC = () => {
  const {
    loading,
    saving,
    uploadingFiles,
    protocol,
    history,
    attachments,
    newFiles,
    updateFiles,
    formData,
    setNewFiles,
    setUpdateFiles,
    handleChange,
    handleSelectChange,
    handleUploadFiles,
    handleDeleteAttachment,
    handleSubmit,
    handleCopyExternalLink,
    navigate,
  } = useProtocolDetails();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!protocol) return null;

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto p-6">
        <ProtocolDetailsHeader
          protocolNumber={protocol.protocolNumber}
          onBack={() => navigate("/helpdesk")}
          onCopyLink={handleCopyExternalLink}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col gap-6">
            <ProtocolInfoCard protocol={protocol} />

            <ProtocolAttachmentsCard
              attachments={attachments}
              newFiles={newFiles}
              uploadingFiles={uploadingFiles}
              onFilesChange={setNewFiles}
              onUpload={handleUploadFiles}
              onDelete={handleDeleteAttachment}
            />

            <ProtocolUpdateCard
              formData={formData}
              updateFiles={updateFiles}
              saving={saving}
              onSelectChange={handleSelectChange}
              onChange={handleChange}
              onFilesChange={setUpdateFiles}
              onSubmit={handleSubmit}
            />
          </div>

          <div>
            <ProtocolHistoryCard history={history} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProtocolDetails;
