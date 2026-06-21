import React from "react";
import { getBackendUrl } from "../../../helpers/urlUtils";

interface ImagePreviewProps {
  value: string;
  alt?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ value, alt = "preview" }) => {
  if (!value) {
    return (
      <div className="h-16 w-32 flex items-center justify-center bg-muted/30 rounded border text-muted-foreground text-xs">
        Sem imagem
      </div>
    );
  }
  const src = value.startsWith("data:") ? value : getBackendUrl(value);
  return (
    <img
      src={src}
      alt={alt}
      className="max-h-16 w-auto object-contain bg-white p-1 rounded border shadow-sm"
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
  );
};

export default ImagePreview;
