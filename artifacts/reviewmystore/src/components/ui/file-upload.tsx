import { useState, useCallback } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  placeholder?: string;
  accept?: string;
}

export function FileUpload({ value, onChange, className, placeholder = "Upload an image", accept = "image/*" }: FileUploadProps) {
  const { uploadFile, isUploading, progress } = useUpload();
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    const response = await uploadFile(file);
    if (response) {
      onChange(response.objectPath);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  if (value) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden border border-border group bg-card", className)}>
        {/* We assume value is a valid url path on the same origin or full URL if configured. 
            Since objectPath is returned from the API, usually it's /api/storage/uploads/...
            Wait, the prompt says "use result.objectPath as the value to store... do not try to construct a full URL".
            We'll just render it as src. If it's a relative path, the browser will resolve it. */}
        <img 
          src={value} 
          alt="Uploaded content" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onChange(null)}
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center p-6 bg-card text-center overflow-hidden cursor-pointer hover:border-primary/50",
        dragActive ? "border-primary bg-primary/5" : "border-border",
        isUploading ? "pointer-events-none" : "",
        className
      )}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-upload-" + placeholder)?.click()}
    >
      <input
        id={"file-upload-" + placeholder}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center justify-center w-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <div className="text-sm font-medium text-foreground">Uploading...</div>
          <div className="w-full max-w-[200px] h-2 bg-secondary rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{placeholder}</p>
          <p className="text-xs text-muted-foreground">Click or drag and drop</p>
        </>
      )}
    </div>
  );
}
