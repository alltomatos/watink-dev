import { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { ReplyMessageContext } from "../../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { useLocalStorage } from "../../../hooks/useLocalStorage";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";

export interface MediaItem {
  file: File;
  caption: string;
}

export interface Participant {
  number: string;
  name?: string;
  profilePicUrl?: string;
}

export interface QuickAnswer {
  shortcut: string;
  message: string;
}

let Mp3Recorder: InstanceType<typeof import("mic-recorder-to-mp3").default> | null = null;

const initRecorder = async () => {
  if (!Mp3Recorder) {
    try {
      const MicRecorder = (await import("mic-recorder-to-mp3")).default;
      Mp3Recorder = new MicRecorder({ bitRate: 128 });
    } catch {
      return null;
    }
  }
  return Mp3Recorder;
};

export interface UseMessageInputReturn {
  ticketId: string | undefined;
  medias: MediaItem[];
  inputMessage: string;
  showEmoji: boolean;
  loading: boolean;
  recording: boolean;
  quickAnswers: QuickAnswer[];
  typeBar: boolean;
  anchorElMenu: boolean;
  mentions: Participant[];
  mentionOpen: boolean;
  signMessage: boolean;
  replyingMessage: Record<string, unknown> | null;
  user: { name?: string } | null;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  setShowEmoji: (v: boolean) => void;
  setAnchorElMenu: (v: boolean) => void;
  setReplyingMessage: (v: null) => void;
  setSignMessage: (v: boolean) => void;
  handleChangeInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleQuickAnswersClick: (value: string) => void;
  handleAddEmoji: (e: { native: string }) => void;
  handleChangeMedias: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleMediaCaptionChange: (index: number, value: string) => void;
  handleUploadMedia: (e?: React.FormEvent) => Promise<void>;
  handleRemoveMedia: (index: number) => void;
  handleSendMessage: () => Promise<void>;
  handleStartRecording: () => Promise<void>;
  handleUploadAudio: () => Promise<void>;
  handleCancelAudio: () => Promise<void>;
  handleClearMedias: () => void;
  handleMentionClick: (contact: Participant) => void;
}

export const useMessageInput = (): UseMessageInputReturn => {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState<QuickAnswer[]>([]);
  const [typeBar, setTypeBar] = useState(false);
  const [anchorElMenu, setAnchorElMenu] = useState(false);
  const [mentions, setMentions] = useState<Participant[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { setReplyingMessage, replyingMessage } = useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);
  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);

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
    if (medias.length === 0 && inputMessage) setInputMessage("");
    setMedias((prev) => [...prev, ...selectedMedias]);
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files[0]) {
      const caption = medias.length === 0 && inputMessage ? inputMessage : "";
      setMedias((prev) => [...prev, { file: e.clipboardData.files[0], caption }]);
      if (medias.length === 0 && inputMessage) setInputMessage("");
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

  const handleClearMedias = () => {
    setMedias([]);
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
          mentionedIds.push(...participants.map((p) => p.number + "@s.whatsapp.net"));
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

  const handleMentionClick = (contact: Participant) => {
    const newValue =
      inputMessage.substring(0, inputMessage.lastIndexOf("@")) + `@${contact.name || contact.number} `;
    setInputMessage(newValue);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  return {
    ticketId,
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
    replyingMessage: replyingMessage as Record<string, unknown> | null,
    user,
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
  };
};
