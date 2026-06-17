import React from "react";
import toastError from "../../errors/toastError";
import { Button } from "@/components/ui/button";

interface LocationPreviewProps {
  image?: string;
  link?: string;
  description?: string;
}

const LocationPreview: React.FC<LocationPreviewProps> = ({
  image,
  link,
  description,
}) => {
  const handleLocation = () => {
    try {
      if (link) window.open(link);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="min-w-[250px]">
      <div>
        <div className="float-left">
          <img
            src={image}
            onClick={handleLocation}
            className="w-[100px] cursor-pointer"
            alt="location"
          />
        </div>
        {description && (
          <div className="flex flex-wrap">
            <p className="mb-2 ml-4 mr-4 mt-3 text-base font-medium text-primary">
              <span
                dangerouslySetInnerHTML={{
                  __html: description.replace("\\n", "<br />"),
                }}
              />
            </p>
          </div>
        )}
        <div className="clear-both block" />
        <div>
          <hr className="my-2 border-border" />
          <Button
            className="w-full"
            variant="ghost"
            onClick={handleLocation}
            disabled={!link}
          >
            Visualizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocationPreview;
