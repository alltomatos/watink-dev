import React from "react";
import { Camera } from "lucide-react";
import { Avatar } from "../../../components/ui/avatar";
import { Card } from "../../../components/ui/card";

interface ProfileAvatarCardProps {
  profileImage: string | undefined;
  userName: string | undefined;
  userProfile: string | undefined;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileAvatarCard({
  profileImage,
  userName,
  userProfile,
  fileInputRef,
  onUpload,
}: ProfileAvatarCardProps) {
  return (
    <Card className="flex flex-col items-center p-6 text-center">
      <div className="relative group">
        <Avatar
          src={profileImage}
          name={userName}
          className="h-32 w-32 text-4xl border-4 border-card shadow-xl"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Camera className="text-white h-8 w-8" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={onUpload}
        />
      </div>
      <div className="mt-4">
        <h3 className="text-xl font-bold">{userName}</h3>
        <p className="text-sm text-muted-foreground">
          {userProfile === "admin" ? "Administrador" : "Atendente"}
        </p>
      </div>
    </Card>
  );
}
