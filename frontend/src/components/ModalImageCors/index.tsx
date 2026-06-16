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
    const fetchImage = async () => {
      const { data, headers } = await api.get(imageUrl, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([data], { type: headers["content-type"] })
      );
      setBlobUrl(url);
      setFetching(false);
    };
    fetchImage();
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
