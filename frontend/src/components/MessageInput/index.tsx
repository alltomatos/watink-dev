/* @jsxImportSource react */
import React, { useState, useEffect, useContext, useRef, Suspense, lazy } from "react";
import "emoji-mart/css/emoji-mart.css";
import { useParams } from "react-router-dom";
const EmojiPicker = lazy(() => import("emoji-mart").then((mod) => ({ default: mod.Picker })));
import clsx from "clsx";

import PaperCard from "../PaperCard";
import { Paperclip, Smile, Send, Mic, XCircle, X, MoreVertical, CheckCircle, XOctagon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Switch } from "../ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useThemeContext } from "../../context/DarkMode";
import toastError from "../../errors/toastError";

let Mp3Recorder: InstanceType<typeof import("mic-recorder-to-mp3").default> | null = null;

const initRecorder = async () => {
  if (!Mp3Recorder) {
    try {
      const MicRecorder = (await import("mic-recorder-to-mp3")).default;
      Mp3Recorder = new MicRecorder({ bitRate: 128 });
    } catch (error) {
      console.error("Failed to initialize recorder:", error);
      return null;
    }
  }
  return Mp3Recorder;
};

interface MediaItem {
  file: File;
  caption: string;
}

interface Participant {
  number: string;
  name?: string;
  profilePicUrl?: string;
}

interface QuickAnswer {
  shortcut: string;
  message: string;
}

interface MessageInputProps {
  ticketStatus: string;
  whatsappStatus?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ ticketStatus, whatsappStatus }) => {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState<QuickAnswer[]>([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [anchorElMenu, setAnchorElMenu] = useState(false);
  const { setReplyingMessage, replyingMessage } = useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);
  const { appTheme } = useThemeContext();

  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);

  const [mentions, setMentions] = useState<Participant[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [replyingMessage]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  const handleChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    handleLoadQuickAnswer(e.target.value);
  };

  const handleQuickAnswersClick = (value: string) => {
    setInputMessage(value);
    setTypeBar(false);
  };

  const handleAddEmoji = (e: { native: string }) => {
    setInputMessage((prev) => prev + e.native);
  };

  const handleChangeMedias = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedMedias = Array.from(e.target.files).map((file, index) => {
      let caption = "";
      if (index === 0 && medias.length === 0 && inputMessage) {
        caption = inputMessage;
      }
      return { file, caption };
    });

    if (medias.length === 0 && inputMessage) {
      setInputMessage("");
    }
    setMedias((prev) => [...prev, ...selectedMedias]);
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files[0]) {
      const caption = medias.length === 0 && inputMessage ? inputMessage : "";
      setMedias((prev) => [...prev, { file: e.clipboardData.files[0], caption }]);
      if (medias.length === 0 && inputMessage) {
        setInputMessage("");
      }
    }
  };

  const handleMediaCaptionChange = (index: number, value: string) => {
    setMedias((prev) => prev.map((media, i) => (i === index ? { ...media, caption: value } : media)));
  };

  const handleUploadMedia = async (e?: React.FormEvent) => {
    setLoading(true);
    if (e) e.preventDefault();

    const formData = new FormData();
    formData.append("fromMe", "true");
    medias.forEach((media) => {
      formData.append("medias", media.file);
      formData.append("body", media.caption);
    });

    try {
      await api.post(`/messages/${ticketId}`, formData);
      setMedias([]);
      setInputMessage("");
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setLoading(true);

    let mentionedIds: string[] = [];
    if (inputMessage.includes("@")) {
      try {
        const { data: participants } = await api.get<Participant[]>(`/tickets/${ticketId}/participants`);
        const { data: ticket } = await api.get(`/tickets/${ticketId}`);
        const groupName = ticket.contact.name;

        if (groupName && inputMessage.includes(`@${groupName}`)) {
          const allIds = participants.map((p) => p.number + "@s.whatsapp.net");
          mentionedIds.push(...allIds);
        }

        participants.forEach((p) => {
          if (inputMessage.includes(`@${p.name}`) || inputMessage.includes(`@${p.number}`)) {
            mentionedIds.push(p.number + "@s.whatsapp.net");
          }
        });

        mentionedIds = [...new Set(mentionedIds)];
      } catch (err) {
        console.error("Error resolving mentions", err);
      }
    }

    let finalBody = inputMessage;
    if (inputMessage.includes("@")) {
      try {
        const { data: ticket } = await api.get(`/tickets/${ticketId}`);
        const groupName = ticket.contact.name;
        if (groupName && inputMessage.includes(`@${groupName}`)) {
          finalBody = finalBody.replace(`@${groupName}`, "").trim();
        }
      } catch (err) {
        console.error(err);
      }
    }

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: signMessage ? `*${user?.name}:*\n${finalBody}` : finalBody,
      quotedMsg: replyingMessage,
      mentionedIds,
    };

    try {
      await api.post(`/messages/${ticketId}`, message);
      setInputMessage("");
      setShowEmoji(false);
      setLoading(false);
      setReplyingMessage(null);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      const recorder = await initRecorder();
      if (!recorder) throw new Error("Recorder not available");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLoadQuickAnswer = async (value: string) => {
    if (value && value.indexOf("/") === 0) {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: value.substring(1) },
        });
        setQuickAnswer(data.quickAnswers);
        setTypeBar(data.quickAnswers.length > 0);
      } catch {
        setTypeBar(false);
      }
    } else if (value && value.lastIndexOf("@") === value.length - 1) {
      try {
        const { data } = await api.get<Participant[]>(`/tickets/${ticketId}/participants`);
        setMentions(data);
        if (data.length > 0) setMentionOpen(true);
      } catch (err) {
        toastError(err);
      }
    } else if (mentionOpen && value.lastIndexOf("@") === -1) {
      setMentionOpen(false);
    } else {
      setTypeBar(false);
    }
  };

  const handleMentionClick = (contact: Participant) => {
    const newValue =
      inputMessage.substring(0, inputMessage.lastIndexOf("@")) + `@${contact.name || contact.number} `;
    setInputMessage(newValue);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const recorder = await initRecorder();
      if (!recorder) throw new Error("Recorder not available");
      const [, blob] = await recorder.stop().getMp3();
      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }
      const formData = new FormData();
      const filename = `${new Date().getTime()}.mp3`;
      formData.append("medias", blob, filename);
      formData.append("body", filename);
      formData.append("fromMe", "true");
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }
    setRecording(false);
    setLoading(false);
  };

  const handleCancelAudio = async () => {
    try {
      const recorder = await initRecorder();
      if (recorder) await recorder.stop().getMp3();
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const renderReplyingMessage = (message: Record<string, unknown>) => {
    const fromMe = message.fromMe as boolean;
    const body = message.body as string;
    const dataJson = message.dataJson as string | object | undefined;
    const participant = message.participant as string | undefined;
    const contact = message.contact as { name?: string } | undefined;

    let pushName: string | null = null;
    let participantNumber: string | null = null;

    if (dataJson) {
      try {
        const data = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
        pushName = (data as Record<string, unknown>).pushName as string | null;
      } catch (e) {
        console.error("Error parsing dataJson:", e);
      }
    }

    if (participant) {
      participantNumber = (participant as string).replace(/\D/g, "");
    }

    const senderName = pushName
      ? `~${pushName}`
      : participantNumber
      ? `~${participantNumber}`
      : contact?.name;

    return (
      <div className="flex w-full items-center justify-center pt-2 pl-[73px] pr-[7px]">
        <div className="flex-1 mr-1.5 overflow-y-hidden bg-[var(--border-subtle)] rounded-[7.5px] flex relative">
          <span
            className={clsx("flex-none w-1", {
              "bg-[var(--message-quote-side-left)]": !fromMe,
              "bg-[var(--message-quote-side-right)]": fromMe,
            })}
          />
          <div className="p-2.5 h-auto block whitespace-pre-wrap overflow-hidden">
            {!fromMe && (
              <span className="flex text-[var(--message-quote-side-right)] font-medium">
                {senderName}
              </span>
            )}
            {body}
          </div>
        </div>
        <button
          type="button"
          className="p-1 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
          disabled={loading || ticketStatus !== "open"}
          onClick={() => setReplyingMessage(null)}
          aria-label="Cancelar resposta"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    );
  };

  if (ticketStatus !== "open") {
    return (
      <PaperCard variant="flush" padding="none" className="bg-[var(--border-default)] flex flex-col items-center border-t border-[var(--border-divider)]">
        <div className="w-full flex p-[7px] items-center bg-[var(--border-default)]">
          <span className="text-base p-2.5 m-auto text-gray-500">
            {i18n.t("messagesInput.placeholderClosed")}
          </span>
        </div>
      </PaperCard>
    );
  }

  if (whatsappStatus && whatsappStatus !== "CONNECTED") {
    return (
      <PaperCard variant="flush" padding="none" className="bg-[var(--border-default)] flex flex-col items-center border-t border-[var(--border-divider)]">
        <div className="w-full flex p-[7px] items-center bg-[var(--border-default)]">
          <div className="p-2.5 w-full text-center bg-[var(--status-error-bg)] text-[var(--status-error-text)] rounded flex flex-col items-center">
            <span className="font-bold text-sm">CONEXÃO INTERROMPIDA</span>
            <span className="text-xs mt-1">
              Não é possível enviar mensagens. Por favor, vá em "Conexões" e reconecte o WhatsApp.
            </span>
          </div>
        </div>
      </PaperCard>
    );
  }

  if (medias.length > 0) {
    return (
      <PaperCard
        variant="flush"
        padding="none"
        className="flex flex-col p-2 items-center w-full bg-[var(--border-default)] border-t border-[var(--border-divider)]"
      >
        <button
          type="button"
          className="self-end p-1 hover:bg-[var(--border-subtle)] rounded transition-colors"
          onClick={() => setMedias([])}
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
                    onClick={() => handleRemoveMedia(index)}
                    aria-label="Remover mídia"
                  >
                    <XCircle style={{ fontSize: 16 }} className="h-4 w-4" />
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
                    placeholder={i18n.t("messagesInput.placeholderOpen")}
                    value={media.caption}
                    onChange={(e) => handleMediaCaptionChange(index, e.target.value)}
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
                onChange={handleChangeMedias}
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
            onClick={handleUploadMedia}
            disabled={loading}
            aria-label="Enviar mídia"
          >
            <Send className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </PaperCard>
    );
  }

  return (
    <PaperCard
      variant="flush"
      padding="none"
      className="bg-[var(--border-default)] flex flex-col items-center border-t border-[var(--border-divider)]"
    >
      {replyingMessage && renderReplyingMessage(replyingMessage as Record<string, unknown>)}
      <div className="bg-[var(--border-default)] w-full flex p-[7px] items-center">
        {/* Desktop toolbar */}
        <div className="hidden sm:flex items-center">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
            disabled={loading || recording || ticketStatus !== "open"}
            onClick={() => setShowEmoji((prev) => !prev)}
            aria-label="Emoji"
          >
            <Smile className="h-5 w-5 text-gray-500" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-16 z-50">
              <div onMouseLeave={() => setShowEmoji(false)}>
                <Suspense fallback={<div className="text-xs p-2">Loading emoji...</div>}>
                  <EmojiPicker
                    perLine={16}
                    showPreview={false}
                    showSkinTones={false}
                    onSelect={handleAddEmoji}
                  />
                </Suspense>
              </div>
            </div>
          )}

          <input
            multiple
            type="file"
            id="upload-button"
            disabled={loading || recording || ticketStatus !== "open"}
            className="hidden"
            onChange={handleChangeMedias}
          />
          <label htmlFor="upload-button">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50 pointer-events-none"
              disabled={loading || recording || ticketStatus !== "open"}
              aria-label="Anexar arquivo"
              tabIndex={-1}
            >
              <Paperclip className="h-5 w-5 text-gray-500" />
            </button>
          </label>

          <label className="flex items-center gap-1.5 mr-1.5 text-gray-500 text-sm select-none cursor-pointer">
            <span className="text-xs">{i18n.t("messagesInput.signMessage")}</span>
            <Switch
              checked={Boolean(signMessage)}
              onCheckedChange={(checked) => setSignMessage(checked)}
              aria-label={i18n.t("messagesInput.signMessage")}
            />
          </label>
        </div>

        {/* Mobile toolbar */}
        <div className="flex sm:hidden">
          <DropdownMenu open={anchorElMenu} onOpenChange={setAnchorElMenu}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
                  disabled={loading || recording || ticketStatus !== "open"}
                  onClick={() => {
                    setShowEmoji((prev) => !prev);
                    setAnchorElMenu(false);
                  }}
                >
                  <Smile className="h-5 w-5 text-gray-500" />
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <input
                  multiple
                  type="file"
                  id="upload-button-mobile"
                  disabled={loading || recording || ticketStatus !== "open"}
                  className="hidden"
                  onChange={(e) => {
                    handleChangeMedias(e);
                    setAnchorElMenu(false);
                  }}
                />
                <label htmlFor="upload-button-mobile" className="cursor-pointer">
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
                  <span className="text-xs">{i18n.t("messagesInput.signMessage")}</span>
                  <Switch
                    checked={Boolean(signMessage)}
                    onCheckedChange={(checked) => {
                      setSignMessage(checked);
                      setAnchorElMenu(false);
                    }}
                  />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Input area */}
        <div
          className={clsx(
            "p-1.5 mr-1.5 bg-[var(--bg-surface)] flex rounded-[20px] flex-1 relative",
            appTheme === "saas" && "border border-[var(--border-default)] shadow-none"
          )}
        >
          <textarea
            ref={inputRef}
            className="pl-2.5 flex-1 border-none bg-transparent resize-none outline-none text-sm leading-5 max-h-[120px]"
            placeholder={
              ticketStatus === "open"
                ? i18n.t("messagesInput.placeholderOpen")
                : i18n.t("messagesInput.placeholderClosed")
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
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />

          {typeBar && (
            <ul className="absolute bottom-full left-0 w-full bg-[var(--bg-surface)] border border-[var(--border-divider)] p-0.5 m-0 z-50 max-h-[200px] overflow-y-auto list-none">
              {quickAnswers.map((value, index) => (
                <li key={index}>
                  <a
                    href="#"
                    className="block p-2 overflow-hidden text-ellipsis max-h-8 hover:bg-[var(--bg-surface-alt)] cursor-pointer text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleQuickAnswersClick(value.message);
                    }}
                  >
                    {`${value.shortcut} - ${value.message}`}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {mentionOpen && (
            <ul className="absolute bottom-full left-0 w-full bg-[var(--bg-surface)] border border-[var(--border-divider)] p-0.5 m-0 z-[9999] max-h-[200px] overflow-y-auto list-none">
              {mentions.map((contact, index) => (
                <li
                  key={index}
                  className="cursor-pointer hover:bg-[var(--bg-surface-alt)]"
                  onClick={() => handleMentionClick(contact)}
                >
                  <a className="flex items-center p-2 overflow-hidden max-h-[45px] border-b border-[var(--border-default)]">
                    {contact.profilePicUrl && (
                      <img
                        src={contact.profilePicUrl}
                        alt={contact.name}
                        className="w-7 h-7 rounded-full mr-2.5"
                      />
                    )}
                    {contact.name || contact.number}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action buttons */}
        {inputMessage ? (
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={loading}
            aria-label="Enviar mensagem"
          >
            <Send className="h-5 w-5 text-gray-500" />
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
            <Mic className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>
    </PaperCard>
  );
};

export default MessageInput;
