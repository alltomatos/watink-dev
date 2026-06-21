import { useState } from "react";
import toastError from "../../../errors/toastError";
import api from "../../../services/api";

export interface MediaItem {
  file: File;
  caption: string;
}

export interface UseMediaUploadReturn {
  medias: MediaItem[];
  handleChangeMedias: (e: React.ChangeEvent<HTMLInputElement>, currentInputMessage: string, clearInput: () => void) => void;
  handleInputPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>, currentInputMessage: string, clearInput: () => void) => void;
  handleMediaCaptionChange: (index: number, value: string) => void;
  handleUploadMedia: (ticketId: string | undefined, e?: React.FormEvent) => Promise<void>;
  handleRemoveMedia: (index: number) => void;
  clearMedias: () => void;
}

export function useMediaUpload(setLoading: (v: boolean) => void): UseMediaUploadReturn {
  const [medias, setMedias] = useState<MediaItem[]>([]);

  const handleChangeMedias = (
    e: React.ChangeEvent<HTMLInputElement>,
    currentInputMessage: string,
    clearInput: () => void
  ) => {
    if (!e.target.files) return;
    const selectedMedias = Array.from(e.target.files).map((file, index) => {
      let caption = "";
      if (index === 0 && medias.length === 0 && currentInputMessage) {
        caption = currentInputMessage;
      }
      return { file, caption };
    });

    if (medias.length === 0 && currentInputMessage) {
      clearInput();
    }
    setMedias((prev) => [...prev, ...selectedMedias]);
  };

  const handleInputPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    currentInputMessage: string,
    clearInput: () => void
  ) => {
    if (e.clipboardData.files[0]) {
      const caption = medias.length === 0 && currentInputMessage ? currentInputMessage : "";
      setMedias((prev) => [...prev, { file: e.clipboardData.files[0], caption }]);
      if (medias.length === 0 && currentInputMessage) {
        clearInput();
      }
    }
  };

  const handleMediaCaptionChange = (index: number, value: string) => {
    setMedias((prev) => prev.map((media, i) => (i === index ? { ...media, caption: value } : media)));
  };

  const handleUploadMedia = async (ticketId: string | undefined, e?: React.FormEvent) => {
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
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const clearMedias = () => setMedias([]);

  return {
    medias,
    handleChangeMedias,
    handleInputPaste,
    handleMediaCaptionChange,
    handleUploadMedia,
    handleRemoveMedia,
    clearMedias,
  };
}
