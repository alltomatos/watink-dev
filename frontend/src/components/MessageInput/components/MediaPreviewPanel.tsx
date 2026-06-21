import React from "react";
import { Paperclip, XCircle, Send } from "lucide-react";
import { Loader2 } from "lucide-react";
import PaperCard from "../../PaperCard";
import { i18n } from "../../../translate/i18n";
import { MediaItem } from "../hooks/useMessageInput";

interface MediaPreviewPanelProps {
  medias: MediaItem[];
  loading: boolean;
  onRemoveMedia: (index: number) => void;
  onCaptionChange: (index: number, value: string) => void;
  onAddMore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelAll: () => void;
  onUpload: () => void;
}

const MediaPreviewPanel: React.FC<MediaPreviewPanelProps> = ({
  medias,
  loading,
  onRemoveMedia,
  onCaptionChange,
  onAddMore,
  onCancelAll,
  onUpload,
}) => {
  return (
    <PaperCard
      variant="flush"
      padding="none"
      className="flex flex-col p-2 items-center w-full bg-[var(--border-default)] border-t border-[var(--border-divider)]"
    >
      <button
        type="button"
        className="self-end p-1 hover:bg-[var(--border-subtle)] rounded transition-colors"
        onClick={onCancelAll}
        aria-label="Cancelar envio"
      >
        <XCircle className="h-5 w-5 text-gray-500" />
      </button>

      <div className="flex overflow-x-auto w-full mb-2.5 gap-2.5 scrollbar-thin scrollbar-thumb-[var(--overlay-dark)] scrollbar-thumb-rounded">
        {medias.map((media, index) => (
          <div
            key={index}
            className="relative min-w-[150px] h-[180px] border border-[var(--border-divider)] rounded overflow-hidden flex flex-col justify-between items-center bg-[var(--bg-surface)] mr-2.5"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--status-success)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
            ) : (
              <>
                <button
                  type="button"
                  className="absolute top-0 right-0 text-red-500 bg-[var(--overlay-medium)] rounded-bl p-0.5 z-10 hover:bg-[var(--overlay-medium)] cursor-pointer"
                  onClick={() => onRemoveMedia(index)}
                  aria-label="Remover mídia"
                >
                  <XCircle className="h-4 w-4" />
                </button>
                {media.file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(media.file)}
                    alt="preview"
                    className="w-full h-[120px] object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center p-1.5 text-[10px] text-center h-[120px] justify-center">
                    <Paperclip className="h-10 w-10 text-[var(--text-muted)]" />
                    <span className="max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {media.file.name}
                    </span>
                  </div>
                )}
                <textarea
                  className="w-full p-1 text-xs border-none border-t border-[var(--border-divider)] outline-none h-[60px] resize-none bg-[var(--bg-surface)]"
                  placeholder={i18n.t("messagesInput.placeholderOpen") as string}
                  value={media.caption}
                  onChange={(e) => onCaptionChange(index, e.target.value)}
                />
              </>
            )}
          </div>
        ))}

        {!loading && (
          <div className="relative min-w-[150px] h-[180px] border border-dashed border-[var(--border-divider)] rounded overflow-hidden flex flex-col justify-center items-center bg-[var(--bg-surface)] mr-2.5 cursor-pointer">
            <input
              multiple
              type="file"
              id="add-more-media"
              className="hidden"
              onChange={onAddMore}
            />
            <label
              htmlFor="add-more-media"
              className="w-full h-full flex justify-center items-center cursor-pointer"
            >
              <Paperclip className="h-7 w-7 text-[var(--text-muted)]" />
            </label>
          </div>
        )}
      </div>

      <div className="flex w-full items-center gap-2.5">
        <button
          type="button"
          className="ml-auto p-1 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
          onClick={onUpload}
          disabled={loading}
          aria-label="Enviar mídia"
        >
          <Send className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </PaperCard>
  );
};

export default MediaPreviewPanel;
