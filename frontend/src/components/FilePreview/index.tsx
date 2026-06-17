/* @jsxImportSource react */
import React from "react";
import { Download, FileText, FileSpreadsheet, File, Image as ImageIcon, Music, Video, FileType } from "lucide-react";
import { cn } from "../../lib/utils";

interface FilePreviewProps {
  mediaUrl: string;
  filename?: string;
}

const getFileIcon = (extension: string) => {
  const cls = "h-8 w-8";
  switch (extension) {
    case "pdf":
      return <FileType className={cn(cls, "text-[var(--status-error)]")} />;
    case "doc":
    case "docx":
    case "txt":
    case "rtf":
      return <FileText className={cn(cls, "text-[var(--status-info)]")} />;
    case "xls":
    case "xlsx":
    case "csv":
      return <FileSpreadsheet className={cn(cls, "text-[var(--status-success)]")} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "bmp":
    case "webp":
      return <ImageIcon className={cn(cls, "text-[var(--status-default-text)]")} />;
    case "mp3":
    case "wav":
    case "ogg":
      return <Music className={cn(cls, "text-[var(--text-muted)]")} />;
    case "mp4":
    case "avi":
    case "mkv":
    case "mov":
      return <Video className={cn(cls, "text-[var(--text-muted)]")} />;
    default:
      return <File className={cn(cls, "text-[var(--text-muted)]")} />;
  }
};

const getFileColor = (extension: string): string => {
  switch (extension) {
    case "pdf":
      return "var(--status-error)";
    case "doc":
    case "docx":
      return "var(--status-info)";
    case "xls":
    case "xlsx":
    case "csv":
      return "var(--status-success)";
    case "ppt":
    case "pptx":
      return "var(--status-warning)";
    case "txt":
      return "var(--text-muted)";
    default:
      return "var(--status-default-text)";
  }
};

const FilePreview: React.FC<FilePreviewProps> = ({ mediaUrl, filename }) => {
  // Extract extension from mediaUrl first as it is more reliable for type
  let extension = "";
  if (mediaUrl) {
    const urlPart = mediaUrl.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
    if (urlPart.length <= 4) {
      extension = urlPart;
    }
  }

  if (!extension && filename?.includes(".")) {
    extension = filename.split(".").pop()?.toLowerCase() ?? "";
  }

  if (!extension) extension = "file";

  // Resolve display filename
  let displayFilename: string | null = null;

  if (mediaUrl) {
    const nameParts = mediaUrl.split("/").pop()?.split("-") ?? [];
    if (nameParts.length > 1 && /^\d{10,}$/.test(nameParts[0])) {
      displayFilename = nameParts.slice(1).join("-");
    }
  }

  if (!displayFilename) {
    if (filename && filename.toLowerCase().endsWith(`.${extension}`)) {
      displayFilename = filename;
    }
  }

  if (!displayFilename) {
    displayFilename = filename || `${extension.toUpperCase()} File`;
  }

  displayFilename = displayFilename.replace(/_/g, " ");

  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);

  return (
    <div className="flex items-center w-[300px] max-w-full p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      {isImage && mediaUrl ? (
        <img
          src={mediaUrl}
          alt={displayFilename}
          className="w-12 h-12 object-cover rounded-lg mr-3 shrink-0"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-lg mr-3 shrink-0 flex items-center justify-center text-[var(--bg-surface)]"
          style={{ backgroundColor: getFileColor(extension) }}
        >
          {getFileIcon(extension)}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col justify-center">
        <p
          className="text-sm font-semibold truncate text-[var(--text-primary)] leading-tight"
          title={displayFilename}
        >
          {displayFilename}
        </p>
        <span className="text-[11px] text-[var(--text-muted)] uppercase font-medium mt-0.5">
          {extension}
        </span>
      </div>

      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="ml-2 p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Baixar arquivo"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
};

export default FilePreview;
