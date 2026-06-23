import React, { useState, useEffect } from "react";
import {
  Download,
  Loader2,
  AlertCircle,
  FileText,
  Mic,
  Video as VideoIcon,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../../services/api";
import { parseData } from "../utils/messageHelpers";
import { Message } from "../types";

interface Props {
  message: Message;
}

const typeIcon = (t?: string) => {
  switch (t) {
    case "image":
    case "sticker":
      return ImageIcon;
    case "video":
      return VideoIcon;
    case "audio":
      return Mic;
    default:
      return FileText;
  }
};

const typeLabel = (t?: string): string => {
  switch (t) {
    case "image":
      return "Imagem";
    case "sticker":
      return "Sticker";
    case "video":
      return "Vídeo";
    case "audio":
      return "Áudio";
    default:
      return "Arquivo";
  }
};

/**
 * Renders a pending (not-yet-downloaded) WhatsApp media message: a blurred
 * thumbnail (or a compact card for media without a thumbnail) plus a download
 * button. Clicking calls the on-demand download endpoint; when the media
 * finishes downloading the backend emits an appMessage update with the real
 * mediaUrl, at which point the parent re-renders this as actual media.
 */
const OnDemandMediaPreview: React.FC<Props> = ({ message }) => {
  const data = parseData(message.dataJson) as
    | { thumbnail?: string; mediaStatus?: string }
    | undefined;
  const thumbnail = data?.thumbnail;
  const serverFailed = data?.mediaStatus === "failed";

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const failed = error || serverFailed;
  const busy = downloading && !failed;

  useEffect(() => {
    if (serverFailed) setDownloading(false);
  }, [serverFailed]);

  const handleDownload = async () => {
    setError(false);
    setDownloading(true);
    try {
      await api.post(`/media/${message.id}/download`);
      // Success: a socket appMessage "update" carrying the stored mediaUrl will
      // replace this preview with the real media. Keep the spinner until then.
    } catch {
      setError(true);
      setDownloading(false);
    }
  };

  const Icon = typeIcon(message.mediaType);
  const label = typeLabel(message.mediaType);

  if (thumbnail) {
    return (
      <div className="relative w-[260px] max-w-full rounded-lg overflow-hidden bg-[var(--bg-surface)]">
        <img
          src={`data:image/jpeg;base64,${thumbnail}`}
          alt={label}
          className="w-full h-auto max-h-[300px] object-cover blur-md scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <button
            onClick={handleDownload}
            disabled={busy}
            className="flex items-center gap-2 rounded-full bg-black/60 hover:bg-black/75 text-white px-4 py-2 text-sm transition-colors disabled:opacity-70"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : failed ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {busy
              ? "Baixando…"
              : failed
                ? "Tentar de novo"
                : `Baixar ${label.toLowerCase()}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-left hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-70 w-[240px] max-w-full"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)]">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : failed ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <span className="flex flex-col overflow-hidden">
        <span className="text-sm text-[var(--text-primary)] truncate">
          {message.body || label}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {busy
            ? "Baixando…"
            : failed
              ? "Falhou — tentar de novo"
              : "Toque para baixar"}
        </span>
      </span>
    </button>
  );
};

export default OnDemandMediaPreview;
