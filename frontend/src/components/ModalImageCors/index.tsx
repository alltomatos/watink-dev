import React, { useState, useEffect } from "react";
import ModalImage from "react-modal-image";
import api from "../../services/api";

interface ModalImageCorsProps {
  imageUrl: string;
}

const ModalImageCors = ({ imageUrl }: ModalImageCorsProps) => {
  const [fetching, setFetching] = useState(true);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    let objectUrl = "";
    const fetchImage = async () => {
      try {
        const { data, headers } = await api.get(imageUrl, { responseType: "blob" });
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(
          new Blob([data], { type: String(headers["content-type"] ?? "image/jpeg") })
        );
        setBlobUrl(objectUrl);
      } catch {
        // fall through to imageUrl direct load
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    fetchImage();
    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return (
    <ModalImage
      className="object-cover w-[330px] h-auto rounded-lg"
      smallSrcSet={fetching ? imageUrl : blobUrl}
      medium={fetching ? imageUrl : blobUrl}
      large={fetching ? imageUrl : blobUrl}
      alt="image"
    />
  );
};

export default ModalImageCors;
