"use client";

import { useState, useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import Image from "next/image";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userName: string;
  onUploadComplete?: (avatarUrl: string) => void;
  onDeleteComplete?: () => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  userName,
  onUploadComplete,
  onDeleteComplete,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    currentAvatarUrl
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/auth/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload avatar");
      }

      toast.success("Profile picture updated successfully");
      onUploadComplete?.(result.avatarUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload avatar"
      );
      // Revert preview on error
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (!confirm("Remove your profile picture?")) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/auth/upload-avatar", {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to remove profile picture");
      }
      setPreviewUrl(undefined);
      toast.success("Profile picture removed");
      onDeleteComplete?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove profile picture"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className={cn(
            "relative flex items-center justify-center w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-muted",
            (isUploading || isDeleting) && "opacity-50"
          )}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={userName}
              width={128}
              height={128}
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-primary/10 text-primary text-3xl font-semibold">
              {getInitials(userName)}
            </div>
          )}
        </div>

        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
            <LoadingSpinner size="lg" />
          </div>
        )}

        <button
          onClick={handleButtonClick}
          disabled={isUploading || isDeleting}
          className={cn(
            "absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors",
            (isUploading || isDeleting) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Upload profile picture"
        >
          <Upload className="h-4 w-4" />
        </button>

        {previewUrl && (
          <button
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className={cn(
              "absolute bottom-0 left-0 p-2 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 transition-colors",
              (isUploading || isDeleting) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Remove profile picture"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || isDeleting}
      />

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Click the upload button to change your profile picture
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG or GIF. Max size 5MB
        </p>
      </div>
    </div>
  );
}
