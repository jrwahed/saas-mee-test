import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandupFile } from "@/hooks/useTaskCommandCenter";
import { format, isToday, isSameDay, parseISO } from "date-fns";
import { Upload, File as FileIcon, Image, FileText, Music, Video, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface WeekFilesPanelProps {
  files: StandupFile[];
  selectedDate: Date;
  weekStart: Date;
}

export default function WeekFilesPanel({ files, selectedDate, weekStart }: WeekFilesPanelProps) {
  const [activeTab, setActiveTab] = useState<"today" | "week" | "all">("today");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-8 w-8 text-blue-400" />;
    if (fileType.startsWith("video/")) return <Video className="h-8 w-8 text-purple-400" />;
    if (fileType.startsWith("audio/")) return <Music className="h-8 w-8 text-green-400" />;
    if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-red-400" />;
    return <FileIcon className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleUpload = async (file: File) => {
    // Validate file size (max 10MB for now)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File is too large. Max size is 10MB`);
      return;
    }

    setIsUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${weekStartStr}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("standup-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("standup-files")
        .getPublicUrl(fileName);

      // Create DB record
      const { error: dbError } = await supabase
        .from("standup_files")
        .insert({
          org_id: (user as any).org_id,
          user_id: user.id,
          week_start: weekStartStr,
          day: dateStr,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          tags: [],
          notes: null,
        });

      if (dbError) throw dbError;

      toast.success("File uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Upload first file (could be extended for multiple)
    handleUpload(droppedFiles[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    handleUpload(selectedFiles[0]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // First get the file to delete from storage
      const { data: fileData } = await supabase
        .from("standup_files")
        .select("file_url")
        .eq("id", fileId)
        .single();

      if (fileData) {
        // Extract path from URL
        const urlParts = fileData.file_url.split("/storage/v1/object/public/standup-files/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("standup-files").remove([filePath]);
        }
      }

      // Delete DB record
      await supabase.from("standup_files").delete().eq("id", fileId);

      toast.success("File deleted");
    } catch (error) {
      toast.error("Failed to delete file");
      console.error(error);
    }
  };

  // Filter files based on active tab
  const filteredFiles = files.filter((file) => {
    const fileDate = parseISO(file.day);
    if (activeTab === "today") return isToday(fileDate);
    if (activeTab === "week") return true; // All files are already filtered by week
    return true;
  });

  const todayFiles = filteredFiles.filter(f => isSameDay(parseISO(f.day), selectedDate));
  const weekFiles = filteredFiles.filter(f => !isSameDay(parseISO(f.day), selectedDate));

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-2">Week Files & Evidence</h3>
          <p className="text-sm text-muted-foreground">
            Drop screenshots, reports, voice notes, or any evidence of your work
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today ({todayFiles.length})</TabsTrigger>
            <TabsTrigger value="week">This Week ({weekFiles.length})</TabsTrigger>
            <TabsTrigger value="all">All ({files.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                Images, videos, audio, PDFs, documents (max 10MB)
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Files List */}
      {filteredFiles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">{getFileIcon(file.file_type)}</div>
                
                <div className="flex-1 min-w-0">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:text-primary truncate block"
                    title={file.file_name}
                  >
                    {file.file_name}
                  </a>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{format(parseISO(file.day), "MMM d")}</span>
                  </div>
                  
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {file.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-all"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <Card className="p-12 text-center bg-card/50 border-border/50">
          <FileIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h4 className="font-medium mb-2">No files yet</h4>
          <p className="text-sm text-muted-foreground">
            Upload files to keep track of your work and progress
          </p>
        </Card>
      )}
    </div>
  );
}
