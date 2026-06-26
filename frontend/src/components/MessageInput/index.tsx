/* @jsxImportSource react */
import React from "react";
import clsx from "clsx";
import { Send, Mic, XOctagon, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

import RecordingTimer from "./RecordingTimer";
import { i18n } from "../../translate/i18n";
import { useThemeContext } from "../../context/DarkMode";

import { useMessageInput } from "./hooks/useMessageInput";
import ReplyPreview from "./components/ReplyPreview";
import MediaPreviewPanel from "./components/MediaPreviewPanel";
import InputToolbar from "./components/InputToolbar";
import QuickAnswersList from "./components/QuickAnswersList";
import MentionsList from "./components/MentionsList";

interface MessageInputProps {
  ticketStatus: string;
  whatsappStatus?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ ticketStatus, whatsappStatus }) => {
  const { appTheme } = useThemeContext();

  const {
    medias,
    inputMessage,
    showEmoji,
    loading,
    recording,
    quickAnswers,
    typeBar,
    anchorElMenu,
    mentions,
    mentionOpen,
    signMessage,
    replyingMessage,
    inputRef,
    setShowEmoji,
    setAnchorElMenu,
    setReplyingMessage,
    setSignMessage,
    handleChangeInput,
    handleQuickAnswersClick,
    handleAddEmoji,
    handleChangeMedias,
    handleInputPaste,
    handleMediaCaptionChange,
    handleUploadMedia,
    handleRemoveMedia,
    handleClearMedias,
    handleSendMessage,
    handleStartRecording,
    handleUploadAudio,
    handleCancelAudio,
    handleMentionClick,
  } = useMessageInput();

  if (ticketStatus !== "open") {
    return (
      <div className="flex h-[62px] w-full shrink-0 items-center justify-center border-t border-[var(--border-divider)] bg-[var(--bg-surface-alt)] px-4">
        <span className="text-sm text-muted-foreground">
          {i18n.t("messagesInput.placeholderClosed")}
        </span>
      </div>
    );
  }

  if (whatsappStatus && whatsappStatus !== "CONNECTED") {
    return (
      <div className="w-full shrink-0 border-t border-[var(--border-divider)] bg-[var(--bg-surface-alt)] px-4 py-3">
        <div className="w-full text-center bg-[var(--status-error-bg)] text-[var(--status-error-text)] rounded-lg p-3 flex flex-col items-center">
          <span className="font-bold text-sm">CONEXÃO INTERROMPIDA</span>
          <span className="text-xs mt-1">
            Não é possível enviar mensagens. Por favor, vá em "Conexões" e reconecte o WhatsApp.
          </span>
        </div>
      </div>
    );
  }

  if (medias.length > 0) {
    return (
      <MediaPreviewPanel
        medias={medias}
        loading={loading}
        onRemoveMedia={handleRemoveMedia}
        onCaptionChange={handleMediaCaptionChange}
        onAddMore={handleChangeMedias}
        onCancelAll={handleClearMedias}
        onUpload={handleUploadMedia}
      />
    );
  }

  return (
    <div className="w-full shrink-0 flex flex-col border-t border-[var(--border-divider)] bg-[var(--bg-surface-alt)]">
      {replyingMessage && (
        <ReplyPreview
          message={replyingMessage}
          loading={loading}
          ticketStatus={ticketStatus}
          onCancel={() => setReplyingMessage(null)}
        />
      )}

      <div className="bg-[var(--bg-surface-alt)] w-full flex px-3 py-2.5 items-center gap-1">
        <InputToolbar
          loading={loading}
          recording={recording}
          ticketStatus={ticketStatus}
          showEmoji={showEmoji}
          signMessage={Boolean(signMessage)}
          anchorElMenu={anchorElMenu}
          onToggleEmoji={() => setShowEmoji(!showEmoji)}
          onEmojiClose={() => setShowEmoji(false)}
          onEmojiSelect={handleAddEmoji}
          onMediaChange={handleChangeMedias}
          onSignChange={setSignMessage}
          onMenuOpenChange={setAnchorElMenu}
        />

        {/* Input area */}
        <div
          className={clsx(
            "px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center rounded-full flex-1 relative min-h-[48px]",
            appTheme === "saas" && "shadow-none"
          )}
        >
          <textarea
            ref={inputRef}
            className="flex-1 border-none bg-transparent resize-none outline-none text-[15px] leading-[1.5] min-h-[24px] max-h-[160px]"
            placeholder={
              ticketStatus === "open"
                ? i18n.t("messagesInput.placeholderOpen") as string
                : i18n.t("messagesInput.placeholderClosed") as string
            }
            rows={1}
            value={inputMessage}
            onChange={handleChangeInput}
            disabled={recording || loading || ticketStatus !== "open"}
            onPaste={(e) => ticketStatus === "open" && handleInputPaste(e)}
            onKeyPress={(e) => {
              if (loading || e.shiftKey) return;
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />

          {typeBar && (
            <QuickAnswersList
              answers={quickAnswers}
              onSelect={handleQuickAnswersClick}
            />
          )}

          {mentionOpen && (
            <MentionsList
              mentions={mentions}
              onSelect={handleMentionClick}
            />
          )}
        </div>

        {/* Action buttons */}
        {inputMessage ? (
          <button
            type="button"
            className="p-2.5 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={loading}
            aria-label="Enviar mensagem"
          >
            <Send className="h-6 w-6 text-gray-500" />
          </button>
        ) : recording ? (
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
              disabled={loading}
              onClick={handleCancelAudio}
              aria-label="Cancelar gravação"
            >
              <XOctagon className="h-5 w-5 text-red-500" />
            </button>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[var(--status-success)] opacity-70" />
            ) : (
              <RecordingTimer />
            )}
            <button
              type="button"
              className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
              onClick={handleUploadAudio}
              disabled={loading}
              aria-label="Enviar áudio gravado"
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
            disabled={loading || ticketStatus !== "open"}
            onClick={handleStartRecording}
            aria-label="Gravar áudio"
          >
            <Mic className="h-6 w-6 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
