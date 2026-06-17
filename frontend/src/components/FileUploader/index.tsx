/* @jsxImportSource react */
import React, { useCallback, useState } from "react";
import { Upload, X, File, Image as ImageIcon, FileType, FileText, FileSpreadsheet } from "lucide-react";
import { cn } from "../../lib/utils";
import { Progress } from "../ui/progress";

interface FileWithPreview extends File {
  preview?: string;
  uploading?: boolean;
  progress?: number;
}

interface FileUploaderProps {
  files?: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: string[];
  disabled?: boolean;
}

const getFileIcon = (fileType: string) => {
  const cls = "h-8 w-8 mb-1";
  if (fileType.startsWith("image/")) return <ImageIcon className={cn(cls, "text-[var(--status-default-text)]")} />;
  if (fileType === "application/pdf") return <FileType className={cn(cls, "text-[var(--status-error)]")} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className={cn(cls, "text-[var(--status-info)]")} />;
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return <FileSpreadsheet className={cn(cls, "text-[var(--status-success)]")} />;
  return <File className={cn(cls, "text-[var(--text-muted)]")} />;
};

const FileUploader: React.FC<FileUploaderProps> = ({
  files = [],
  onFilesChange,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
  accept = ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"],
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(
    (newFiles: FileWithPreview[]) => {
      const validFiles = newFiles.filter((file) => {
        if (file.size > maxSize) {
          console.warn(`Arquivo ${file.name} excede o tamanho máximo`);
          return false;
        }
        return true;
      });

      const totalFiles = [...files, ...validFiles].slice(0, maxFiles) as FileWithPreview[];

      const filesWithPreview: FileWithPreview[] = totalFiles.map((file) => {
        if ((file as FileWithPreview).preview) return file;
        if (file.type.startsWith("image/")) {
          return Object.assign(file, { preview: URL.createObjectURL(file) });
        }
        return file;
      });

      onFilesChange(filesWithPreview);
    },
    [files, maxFiles, maxSize, onFilesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files) as FileWithPreview[];
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const selectedFiles = Array.from(e.target.files) as FileWithPreview[];
      processFiles(selectedFiles);
      e.target.value = "";
    },
    [processFiles]
  );

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const removed = newFiles.splice(index, 1)[0];
    if (removed.preview) {
      URL.revokeObjectURL(removed.preview);
    }
    onFilesChange(newFiles);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "border-2 border-dashed border-[var(--action-primary)] rounded-xl p-6 text-center cursor-pointer transition-all duration-300",
          "bg-[var(--status-info-4)] hover:bg-[var(--status-info-8)] hover:border-[var(--action-primary)]",
          isDragging && "bg-[var(--status-info-15)] border-solid border-[var(--action-primary)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById("file-upload-input")?.click()}
        role="button"
        aria-label="Área de upload de arquivos"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && document.getElementById("file-upload-input")?.click()}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept={accept.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="h-12 w-12 text-[var(--action-primary)] mx-auto mb-2" />
        <p className="text-sm font-medium text-[var(--action-primary)]">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Máx. {maxFiles} arquivos, até {Math.round(maxSize / 1024 / 1024)}MB cada
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative w-[100px] h-[100px] rounded-lg overflow-hidden border border-[var(--border-default)] flex flex-col items-center justify-center bg-[var(--bg-surface)]"
            >
              {file.type?.startsWith("image/") && file.preview ? (
                <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <>
                  {getFileIcon(file.type || "")}
                  <span className="text-[10px] text-center px-1 overflow-hidden text-ellipsis whitespace-nowrap w-full">
                    {file.name}
                  </span>
                </>
              )}
              {!disabled && (
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-[var(--overlay-dark-medium)] text-[var(--bg-surface)] hover:bg-[var(--overlay-dark-strong)] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  aria-label="Remover arquivo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {file.uploading && (
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--overlay-medium)] p-1">
                  <Progress value={file.progress ?? 0} className="h-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
