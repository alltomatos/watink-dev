/* @jsxImportSource react */
import React, { useState } from "react";
import { Download, Trash2, X, File, FileType, FileText, Image as ImageIcon } from "lucide-react";
import { getBackendUrl } from "../../config";
import { cn } from "../../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";

interface Attachment {
  id: number | string;
  filePath: string;
  originalName: string;
  fileType?: string;
}

interface AttachmentsListProps {
  attachments?: Attachment[];
  onDelete?: (id: number | string) => void;
  canDelete?: boolean;
  showEmpty?: boolean;
}

const getFileIcon = (fileType?: string) => {
  const cls = "h-9 w-9";
  if (fileType?.startsWith("image/")) return <ImageIcon className={cn(cls, "text-[var(--status-default-text)]")} />;
  if (fileType === "application/pdf") return <FileType className={cn(cls, "text-[var(--status-error)]")} />;
  if (fileType?.includes("word") || fileType?.includes("document")) return <FileText className={cn(cls, "text-[var(--status-info)]")} />;
  if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return <File className={cn(cls, "text-[var(--status-success)]")} />;
  return <File className={cn(cls, "text-[var(--text-muted)]")} />;
};

const AttachmentsList: React.FC<AttachmentsListProps> = ({
  attachments = [],
  onDelete,
  canDelete = false,
  showEmpty = true,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getUrl = (attachment: Attachment): string => {
    if (!attachment.filePath) return "";
    const url = attachment.filePath.startsWith("/") ? attachment.filePath : `/${attachment.filePath}`;
    if (url.startsWith("/public")) {
      return getBackendUrl() + url;
    }
    return getBackendUrl() + "/public" + url;
  };

  const handleDownload = (attachment: Attachment, e: React.MouseEvent | { stopPropagation: () => void }) => {
    e.stopPropagation();
    const url = getUrl(attachment);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.originalName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (attachment: Attachment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(attachment.id);
    }
  };

  const handleClick = (attachment: Attachment) => {
    if (attachment.fileType?.startsWith("image/")) {
      setSelectedImage(getUrl(attachment));
      setLightboxOpen(true);
    } else {
      handleDownload(attachment, { stopPropagation: () => {} });
    }
  };

  if (!attachments || attachments.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="text-center p-6 text-[var(--text-muted)] text-sm">
        Nenhum anexo
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <div className="flex flex-wrap gap-3 p-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "w-[110px] h-[120px] rounded-lg overflow-hidden border border-[var(--border-default)]",
                "flex flex-col bg-[var(--bg-surface)] cursor-pointer",
                "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              )}
              onClick={() => handleClick(attachment)}
            >
              {attachment.fileType?.startsWith("image/") ? (
                <img
                  src={getUrl(attachment)}
                  alt={attachment.originalName}
                  className="w-full h-20 object-cover"
                />
              ) : (
                <div className="w-full h-20 flex items-center justify-center bg-[var(--bg-surface-alt)]">
                  {getFileIcon(attachment.fileType)}
                </div>
              )}
              <div className="px-2 py-1 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex-1 flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[60px]">
                      {attachment.originalName}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{attachment.originalName}</TooltipContent>
                </Tooltip>
                <div className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="p-0.5 rounded hover:bg-[var(--border-subtle)] transition-colors"
                        onClick={(e) => handleDownload(attachment, e)}
                        aria-label="Baixar"
                      >
                        <Download className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar</TooltipContent>
                  </Tooltip>
                  {canDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-[var(--border-subtle)] transition-colors"
                          onClick={(e) => handleDelete(attachment, e)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--status-error)]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[95vw] bg-transparent border-none shadow-none p-0">
            <button
              type="button"
              className="absolute top-4 right-4 z-50 p-1.5 rounded-full bg-[var(--overlay-dark-medium)] text-[var(--bg-surface)] hover:bg-[var(--overlay-dark-strong)] transition-colors"
              onClick={() => setLightboxOpen(false)}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain mx-auto"
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
};

export default AttachmentsList;
