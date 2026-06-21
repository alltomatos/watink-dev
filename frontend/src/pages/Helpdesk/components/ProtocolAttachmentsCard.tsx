import React from "react";
import { Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaperCard from "../../../components/PaperCard";
import FileUploader from "../../../components/FileUploader";
import AttachmentsList from "../../../components/AttachmentsList";
import type { Attachment } from "../protocolTypes";

interface ProtocolAttachmentsCardProps {
  attachments: Attachment[];
  newFiles: File[];
  uploadingFiles: boolean;
  onFilesChange: (files: File[]) => void;
  onUpload: () => void;
  onDelete: (id: number) => void;
}

const ProtocolAttachmentsCard: React.FC<ProtocolAttachmentsCardProps> = ({
  attachments,
  newFiles,
  uploadingFiles,
  onFilesChange,
  onUpload,
  onDelete,
}) => (
  <PaperCard>
    <div className="mb-4 flex items-center gap-2">
      <Paperclip className="h-4 w-4" />
      <h2 className="text-base font-semibold">Anexos ({attachments.length})</h2>
    </div>

    <AttachmentsList
      attachments={attachments as { id: number | string; filePath: string; originalName: string; fileType?: string }[]}
      onDelete={(id) => onDelete(Number(id))}
      canDelete={true}
      showEmpty={false}
    />

    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Adicionar novos anexos
      </p>
      <FileUploader
        files={newFiles}
        onFilesChange={onFilesChange}
        maxFiles={10}
        disabled={uploadingFiles}
      />
      {newFiles.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Button onClick={onUpload} disabled={uploadingFiles} size="sm">
            {uploadingFiles ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploadingFiles ? "Enviando..." : "Enviar Arquivos"}
          </Button>
        </div>
      )}
    </div>
  </PaperCard>
);

export default ProtocolAttachmentsCard;
