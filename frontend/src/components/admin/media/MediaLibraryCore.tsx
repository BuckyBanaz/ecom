import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Folder, Image as ImageIcon, Upload, Plus, Trash2, ArrowLeft, ChevronRight, Copy, Check,
  RefreshCw, Filter, LayoutGrid, List, PanelRightClose, PanelRightOpen, Search, Edit2,
  X, RotateCcw, StopCircle, ChevronDown, ChevronUp, Scissors, ClipboardPaste, FolderInput, Minimize2,
} from "lucide-react";
import { mediaRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { resolveImgUrl } from "@/utils/image";
import { prepareImageForUpload } from "@/utils/imageCompress";

export type MediaItem = {
  name: string;
  isFolder: boolean;
  size: number;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  path: string;
};

type UploadTaskStatus = "compressing" | "uploading" | "stopped" | "completed" | "error";

type UploadTask = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: UploadTaskStatus;
  abortFn: (() => void) | null;
  error?: string;
};

type Clipboard = {
  paths: string[];
  mode: "cut" | "copy";
};

interface MediaLibraryCoreProps {
  isDialog?: boolean;
  onSelect?: (url: string) => void;
  onCancel?: () => void;
}

// ─── Folder Picker Dialog ─────────────────────────────────────────────────────
function FolderPickerDialog({
  open,
  title,
  currentPath,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  currentPath: string;
  onConfirm: (dest: string) => void;
  onClose: () => void;
}) {
  const [pickerPath, setPickerPath] = useState("");
  const [pickerItems, setPickerItems] = useState<MediaItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPickerPath("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPickerLoading(true);
    mediaRepository.list(pickerPath).then((res) => {
      if (res.success) setPickerItems(res.data.filter((i: MediaItem) => i.isFolder));
    }).finally(() => setPickerLoading(false));
  }, [pickerPath, open]);

  const navigatePicker = (name: string) =>
    setPickerPath((p) => (p ? `${p}/${name}` : name));

  const navigatePickerUp = () => {
    const parts = pickerPath.split("/");
    parts.pop();
    setPickerPath(parts.join("/"));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          Destination: <span className="font-semibold text-gray-800">/{pickerPath || "Root"}</span>
        </div>
        <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto bg-gray-50">
          {pickerPath && (
            <button
              onClick={navigatePickerUp}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 border-b text-gray-500"
            >
              <ArrowLeft className="h-4 w-4" /> .. (Go up)
            </button>
          )}
          {pickerLoading && <p className="text-xs text-center py-4 text-muted-foreground">Loading…</p>}
          {!pickerLoading && pickerItems.length === 0 && (
            <p className="text-xs text-center py-4 text-muted-foreground">No sub-folders here</p>
          )}
          {pickerItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigatePicker(item.name)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 border-b last:border-0"
            >
              <Folder className="h-4 w-4 text-amber-500" />
              {item.name}
              <ChevronRight className="h-3 w-3 ml-auto text-gray-400" />
            </button>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(pickerPath)} disabled={pickerPath === currentPath}>
            <FolderInput className="h-4 w-4 mr-2" /> Select This Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MediaLibraryCore({ isDialog = false, onSelect, onCancel }: MediaLibraryCoreProps) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection & UI State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Clipboard (cut / copy)
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);

  // Folder picker
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderPickerMode, setFolderPickerMode] = useState<"move" | "copy">("move");

  // Drag-drop
  const [isDragOver, setIsDragOver] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Upload tasks
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [widgetCollapsed, setWidgetCollapsed] = useState(false);
  const currentPathRef = useRef(currentPath);
  useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

  // Dialogs
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<MediaItem | null>(null);
  const [newName, setNewName] = useState("");

  // ─── Load ────────────────────────────────────────────────────────────────────
  const loadMedia = async (path: string) => {
    setLoading(true);
    setSelectedItems(new Set());
    try {
      const res = await mediaRepository.list(path);
      if (res.success) setItems(res.data);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMedia(currentPath); }, [currentPath]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === "c" && selectedItems.size > 0) {
        e.preventDefault();
        handleCopyToClipboard("copy");
      }
      if (e.key === "x" && selectedItems.size > 0) {
        e.preventDefault();
        handleCopyToClipboard("cut");
      }
      if (e.key === "v" && clipboard) {
        e.preventDefault();
        handlePaste(currentPath);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItems, clipboard, currentPath]);

  // ─── Upload Logic ─────────────────────────────────────────────────────────────
  const startUpload = useCallback((task: UploadTask) => {
    const folder = currentPathRef.current;
    const { promise, abort } = mediaRepository.upload(folder, task.file, (percent) => {
      setUploadTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, progress: percent } : t));
    });
    setUploadTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, abortFn: abort, status: "uploading" } : t));
    promise
      .then(() => {
        setUploadTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "completed", progress: 100, abortFn: null } : t));
        loadMedia(currentPathRef.current);
        setTimeout(() => setUploadTasks((prev) => prev.filter((t) => t.id !== task.id)), 4000);
      })
      .catch((err: Error) => {
        if (err.message === "ABORTED") {
          setUploadTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "stopped", abortFn: null } : t));
        } else {
          setUploadTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "error", abortFn: null, error: err.message } : t));
        }
      });
  }, []);

  const enqueueFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { toast.error("Only image files are supported."); return; }
    const newTasks: UploadTask[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "compressing" as UploadTaskStatus,
      abortFn: null,
    }));
    setUploadTasks((prev) => [...prev, ...newTasks]);
    setWidgetCollapsed(false);

    newTasks.forEach(async (task) => {
      try {
        const compressed = await prepareImageForUpload(task.file);
        const readyTask: UploadTask = { ...task, file: compressed, status: "uploading", progress: 0 };
        setUploadTasks((prev) => prev.map((t) => (t.id === task.id ? readyTask : t)));
        startUpload(readyTask);
      } catch {
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "error", error: "Image compression failed" } : t,
          ),
        );
      }
    });
  }, [startUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    enqueueFiles(files);
  };

  const handleStopTask = (task: UploadTask) => task.abortFn?.();
  const handleRetryTask = (task: UploadTask) => {
    const fresh = { ...task, progress: 0, status: "uploading" as UploadTaskStatus, error: undefined };
    setUploadTasks((prev) => prev.map((t) => t.id === task.id ? fresh : t));
    startUpload(fresh);
  };
  const handleDismissTask = (taskId: string) => setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));

  // ─── Clipboard operations ─────────────────────────────────────────────────────
  const handleCopyToClipboard = (mode: "cut" | "copy") => {
    if (selectedItems.size === 0) return;
    setClipboard({ paths: Array.from(selectedItems), mode });
    toast.success(mode === "cut"
      ? `${selectedItems.size} item(s) cut — navigate and Paste`
      : `${selectedItems.size} item(s) copied — navigate and Paste`
    );
  };

  const handlePaste = async (destination: string) => {
    if (!clipboard) return;
    try {
      toast.loading(clipboard.mode === "cut" ? "Moving…" : "Copying…");
      if (clipboard.mode === "cut") {
        await mediaRepository.move(clipboard.paths, destination);
        toast.dismiss();
        toast.success("Moved successfully");
        setClipboard(null);
      } else {
        await mediaRepository.copy(clipboard.paths, destination);
        toast.dismiss();
        toast.success("Copied successfully");
      }
      loadMedia(currentPath);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Operation failed");
    }
  };

  const openFolderPicker = (mode: "move" | "copy") => {
    setFolderPickerMode(mode);
    setFolderPickerOpen(true);
  };

  const handleFolderPickerConfirm = async (dest: string) => {
    setFolderPickerOpen(false);
    const paths = Array.from(selectedItems);
    try {
      toast.loading(folderPickerMode === "move" ? "Moving…" : "Copying…");
      if (folderPickerMode === "move") {
        await mediaRepository.move(paths, dest);
        toast.dismiss();
        toast.success(`Moved ${paths.length} item(s)`);
        setSelectedItems(new Set());
      } else {
        await mediaRepository.copy(paths, dest);
        toast.dismiss();
        toast.success(`Copied ${paths.length} item(s)`);
      }
      loadMedia(currentPath);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Operation failed");
    }
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (gridRef.current && !gridRef.current.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    enqueueFiles(Array.from(e.dataTransfer.files));
  };

  // ─── Other handlers ───────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await mediaRepository.createFolder(currentPath, newFolderName);
      toast.success("Folder created");
      setIsFolderDialogOpen(false);
      setNewFolderName("");
      loadMedia(currentPath);
    } catch (err: any) { toast.error(err.message || "Failed to create folder"); }
  };

  const runOptimize = async (options: { paths?: string[]; folder?: string; recursive?: boolean }, label: string) => {
    try {
      setOptimizing(true);
      toast.loading(label);
      const res = await mediaRepository.optimize(options);
      toast.dismiss();
      if (res.success) {
        const { optimized, total, savedMb } = res.summary || {};
        toast.success(`Optimized ${optimized ?? 0} of ${total ?? 0} image(s) — saved ${savedMb ?? 0} MB`);
        loadMedia(currentPath);
      } else {
        toast.error(res.message || "Optimization failed");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const handleOptimizeSelected = () => {
    const imagePaths = Array.from(selectedItems).filter((p) => {
      const item = items.find((i) => i.path === p);
      return item && !item.isFolder && /\.(jpe?g|png|webp)$/i.test(item.name);
    });
    if (imagePaths.length === 0) {
      toast.error("Select at least one image (JPG, PNG, or WebP)");
      return;
    }
    runOptimize({ paths: imagePaths }, `Compressing ${imagePaths.length} image(s)…`);
  };

  const handleOptimizeFolder = () => {
    runOptimize({ folder: currentPath, recursive: true }, "Compressing images in this folder…");
  };

  const handleOptimizeAll = () => {
    if (!confirm("Compress ALL images in the media library? Original filenames and URLs stay the same.")) return;
    runOptimize({ folder: "", recursive: true }, "Compressing entire media library…");
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} item(s)?`)) return;
    let ok = 0;
    toast.loading("Deleting…");
    for (const p of Array.from(selectedItems)) {
      try { await mediaRepository.delete(p); ok++; }
      catch (err: any) { toast.error(`Failed: ${err.message}`); }
    }
    toast.dismiss();
    if (ok > 0) { toast.success(`Deleted ${ok} item(s)`); setSelectedItems(new Set()); loadMedia(currentPath); }
  };

  const handleRename = async () => {
    if (!itemToRename || !newName.trim() || newName === itemToRename.name) { setIsRenameDialogOpen(false); return; }
    try {
      await mediaRepository.rename(itemToRename.path, newName);
      toast.success("Renamed");
      setIsRenameDialogOpen(false); setItemToRename(null); setNewName("");
      loadMedia(currentPath);
    } catch (err: any) { toast.error(err.message || "Failed to rename"); }
  };

  const copyUrlToClipboard = (url: string | null) => {
    if (!url) return;
    navigator.clipboard.writeText(resolveImgUrl(url));
    toast.success("URL copied!");
  };

  const navigateTo = (name: string) => setCurrentPath(currentPath ? `${currentPath}/${name}` : name);
  const navigateUp = () => {
    const parts = currentPath.split("/"); parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const handleItemClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (isDialog) {
      setSelectedItems((prev) => { const s = new Set<string>(); if (!prev.has(path)) s.add(path); return s; });
    } else {
      setSelectedItems((prev) => { const s = new Set(prev); s.has(path) ? s.delete(path) : s.add(path); return s; });
    }
  };

  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const lastSelectedPath = Array.from(selectedItems).pop();
  const selectedItemDetails = items.find((i) => i.path === lastSelectedPath);
  const showWidget = uploadTasks.length > 0;
  const imgSrc = (url: string) => resolveImgUrl(url);
  const statusColor = (s: UploadTaskStatus) =>
    s === "completed" ? "bg-green-500" : s === "stopped" ? "bg-orange-400" : s === "error" ? "bg-red-500" : s === "compressing" ? "bg-violet-500" : "bg-blue-500";

  return (
    <div className={cn("flex flex-col bg-white", isDialog ? "h-[65vh]" : "h-[calc(100vh-80px)] md:-m-6")}>

      {/* Breadcrumb */}
      {!isDialog && (
        <div className="px-6 py-4 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Link to="/admin" className="hover:text-primary">Dashboard</Link>
          <span>/</span>
          <span className="text-primary">Media</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-gray-50/50 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileInputChange} accept="image/*" />
              <Button className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
            </div>
            <Button variant="default" className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white px-3" onClick={() => setIsFolderDialogOpen(true)} title="New Folder"><Plus className="h-4 w-4" /></Button>
            <Button variant="default" className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white px-3" onClick={() => loadMedia(currentPath)} title="Refresh"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>

            {/* Paste button — shows when clipboard has items */}
            {clipboard && (
              <Button
                variant="outline"
                className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => handlePaste(currentPath)}
                title={`Paste ${clipboard.paths.length} item(s) here (Ctrl+V)`}
              >
                <ClipboardPaste className="h-4 w-4" />
                Paste {clipboard.paths.length} item{clipboard.paths.length > 1 ? "s" : ""}
                {clipboard.mode === "cut" ? " (Move)" : " (Copy)"}
                <button className="ml-1 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setClipboard(null); }}><X className="h-3 w-3" /></button>
              </Button>
            )}
          </div>
          {isDialog && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button disabled={!selectedItemDetails || selectedItemDetails.isFolder || !selectedItemDetails.url}
                onClick={() => { if (onSelect && selectedItemDetails?.url) onSelect(selectedItemDetails.url); }}>
                Insert Selected Image
              </Button>
            </div>
          )}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search in current folder" className="pl-9 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Sub header */}
          <div className="px-3 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between bg-white gap-3">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Folder className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-xs">{currentPath ? currentPath.split("/").pop() : "All media"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5 h-8 gap-2">Actions <ChevronRight className="h-3 w-3 rotate-90" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem disabled={selectedItems.size !== 1} onSelect={(e) => {
                    e.preventDefault();
                    const item = items.find((i) => i.path === Array.from(selectedItems)[0]);
                    if (item) { setItemToRename(item); setNewName(item.name); setIsRenameDialogOpen(true); }
                  }}><Edit2 className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                  <DropdownMenuItem disabled={selectedItems.size !== 1} onSelect={(e) => {
                    e.preventDefault();
                    const item = items.find((i) => i.path === Array.from(selectedItems)[0]);
                    if (item && !item.isFolder) copyUrlToClipboard(item.url);
                  }}><Copy className="mr-2 h-4 w-4" /> Copy URL</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={optimizing || selectedItems.size === 0} onSelect={(e) => { e.preventDefault(); handleOptimizeSelected(); }}>
                    <Minimize2 className="mr-2 h-4 w-4" /> Compress selected
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={optimizing} onSelect={(e) => { e.preventDefault(); handleOptimizeFolder(); }}>
                    <Minimize2 className="mr-2 h-4 w-4" /> Compress this folder
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={optimizing} onSelect={(e) => { e.preventDefault(); handleOptimizeAll(); }}>
                    <Minimize2 className="mr-2 h-4 w-4" /> Compress entire library
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={selectedItems.size === 0} onSelect={(e) => { e.preventDefault(); handleCopyToClipboard("copy"); }}>
                    <Copy className="mr-2 h-4 w-4" /> Copy (Ctrl+C)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={selectedItems.size === 0} onSelect={(e) => { e.preventDefault(); handleCopyToClipboard("cut"); }}>
                    <Scissors className="mr-2 h-4 w-4" /> Cut (Ctrl+X)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={selectedItems.size === 0} onSelect={(e) => { e.preventDefault(); openFolderPicker("copy"); }}>
                    <FolderInput className="mr-2 h-4 w-4" /> Copy to folder…
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={selectedItems.size === 0} onSelect={(e) => { e.preventDefault(); openFolderPicker("move"); }}>
                    <FolderInput className="mr-2 h-4 w-4" /> Move to folder…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={selectedItems.size === 0}
                    onSelect={(e) => { e.preventDefault(); handleBulkDelete(); }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center border rounded-md h-8 overflow-hidden">
                <Button variant="ghost" size="icon" className={cn("h-full w-8 rounded-none", viewMode === "grid" && "bg-muted")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className={cn("h-full w-8 rounded-none border-l", viewMode === "list" && "bg-muted")} onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => setShowSidebar(!showSidebar)}>
                {showSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Selection bar */}
          {selectedItems.size > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs flex-wrap">
              <span className="font-semibold text-blue-700">{selectedItems.size} selected</span>
              <div className="h-3 w-px bg-blue-200" />
              <button className="text-blue-600 hover:text-blue-800 font-medium hover:underline" onClick={() => setSelectedItems(new Set(filteredItems.map((i) => i.path)))}>
                All ({filteredItems.length})
              </button>
              <div className="h-3 w-px bg-blue-200" />
              <button className="text-gray-500 hover:text-gray-800 hover:underline" onClick={() => setSelectedItems(new Set())}>
                Deselect
              </button>
              <div className="h-3 w-px bg-blue-200" />
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                onClick={() => handleCopyToClipboard("copy")} title="Ctrl+C">
                <Copy className="h-3 w-3" /> Copy
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                onClick={() => handleCopyToClipboard("cut")} title="Ctrl+X">
                <Scissors className="h-3 w-3" /> Cut
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                onClick={() => openFolderPicker("move")}>
                <FolderInput className="h-3 w-3" /> Move to…
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                onClick={() => openFolderPicker("copy")}>
                <FolderInput className="h-3 w-3" /> Copy to…
              </button>
              <div className="ml-auto">
                <button className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                  onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedItems.size})
                </button>
              </div>
            </div>
          )}

          {/* Grid / List area */}
          <div
            ref={gridRef}
            className="flex-1 overflow-y-auto bg-white relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setSelectedItems(new Set())}
          >
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-600/10 border-4 border-dashed border-blue-500 pointer-events-none">
                <Upload className="h-16 w-16 text-blue-500 mb-4 animate-bounce" />
                <p className="text-xl font-semibold text-blue-600">Drop images to upload</p>
                <p className="text-sm text-blue-500 mt-1">Multiple files supported</p>
              </div>
            )}
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse p-6">Loading…</div>
            ) : filteredItems.length === 0 && !currentPath ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-3 p-6">
                <Upload className="h-12 w-12 opacity-20" />
                <p>Drag & drop images here, or click Upload</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentPath && (
                  <div onClick={(e) => { e.stopPropagation(); navigateUp(); }}
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer aspect-square text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-8 w-8 mb-2" /><span className="text-xs font-semibold">Go Back</span>
                  </div>
                )}
                {filteredItems.map((item) => {
                  const isSelected = selectedItems.has(item.path);
                  return (
                    <div key={item.path}
                      onClick={(e) => handleItemClick(e, item.path)}
                      onDoubleClick={(e) => { e.stopPropagation(); if (item.isFolder) navigateTo(item.name); else if (isDialog && onSelect && item.url) onSelect(item.url); }}
                      className={cn(
                        "group relative flex flex-col rounded-md overflow-hidden cursor-pointer border transition-all aspect-[4/5]",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-gray-200 bg-white hover:border-gray-400",
                        clipboard?.mode === "cut" && clipboard.paths.includes(item.path) && "opacity-50"
                      )}>
                      <div className={cn(
                        "absolute top-2 right-2 z-20 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary shadow-sm" : "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {item.isFolder ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-6">
                          <Folder strokeWidth={1} className={cn("h-16 w-16", isSelected ? "text-primary" : "text-gray-700")} />
                        </div>
                      ) : (
                        <div className="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
                          {item.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)
                            ? <img src={imgSrc(item.url)} alt={item.name} className="w-full h-full object-cover" />
                            : <ImageIcon strokeWidth={1} className="h-16 w-16 text-gray-400" />}
                        </div>
                      )}
                      <div className={cn("p-3 text-center border-t text-xs truncate font-medium transition-colors",
                        isSelected ? "bg-primary text-white border-primary" : "text-gray-700")} title={item.name}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentPath && (
                  <div onClick={(e) => { e.stopPropagation(); navigateUp(); }}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /><span className="text-sm font-medium">Go Back</span>
                  </div>
                )}
                {filteredItems.map((item) => {
                  const isSelected = selectedItems.has(item.path);
                  return (
                    <div key={item.path}
                      onClick={(e) => handleItemClick(e, item.path)}
                      onDoubleClick={(e) => { e.stopPropagation(); if (item.isFolder) navigateTo(item.name); else if (isDialog && onSelect && item.url) onSelect(item.url); }}
                      className={cn(
                        "flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors border-l-2",
                        isSelected ? "bg-primary/5 border-primary" : "hover:bg-gray-50 border-transparent",
                        clipboard?.mode === "cut" && clipboard.paths.includes(item.path) && "opacity-50"
                      )}>
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                        {item.isFolder ? <Folder className="h-5 w-5 text-amber-500" />
                          : item.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? <img src={imgSrc(item.url!)} alt={item.name} className="w-full h-full object-cover" />
                          : <ImageIcon className="h-5 w-5 text-gray-400" />}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{item.isFolder ? "Folder" : `${(item.size / 1024).toFixed(1)} KB`}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{new Date(item.updatedAt).toLocaleDateString()}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — hidden on mobile, shown via toggle */}
        {showSidebar && (
          <div className="hidden md:flex w-72 border-l bg-gray-50/30 flex-col">
            {selectedItemDetails ? (
              <div className="p-6">
                <div className="aspect-square bg-white border rounded-xl flex items-center justify-center overflow-hidden mb-6 shadow-sm">
                  {selectedItemDetails.isFolder ? <Folder strokeWidth={1} className="h-24 w-24 text-gray-400" />
                    : selectedItemDetails.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? <img src={imgSrc(selectedItemDetails.url)} alt={selectedItemDetails.name} className="w-full h-full object-contain" />
                    : <ImageIcon strokeWidth={1} className="h-24 w-24 text-gray-400" />}
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate" title={selectedItemDetails.name}>{selectedItemDetails.name}</h3>
                    <p className="text-muted-foreground text-xs">{selectedItemDetails.isFolder ? "Folder" : `${(selectedItemDetails.size / 1024).toFixed(1)} KB`}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                    <p className="font-medium text-xs">{new Date(selectedItemDetails.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Modified</p>
                    <p className="font-medium text-xs">{new Date(selectedItemDetails.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="pt-2 space-y-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setItemToRename(selectedItemDetails); setNewName(selectedItemDetails.name); setIsRenameDialogOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5 mr-2" /> Rename
                    </Button>
                    {!selectedItemDetails.isFolder && selectedItemDetails.url && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => copyUrlToClipboard(selectedItemDetails.url)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy URL
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openFolderPicker("copy")}>
                      <FolderInput className="h-3.5 w-3.5 mr-2" /> Copy to folder…
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openFolderPicker("move")}>
                      <FolderInput className="h-3.5 w-3.5 mr-2" /> Move to folder…
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => { setSelectedItems(new Set([selectedItemDetails.path])); handleBulkDelete(); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm">Select an item to view its details.</p>
                {clipboard && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left w-full">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      {clipboard.mode === "cut" ? "✂️ Cut" : "📋 Copied"} — {clipboard.paths.length} item(s)
                    </p>
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => handlePaste(currentPath)}>
                      Paste here (Ctrl+V)
                    </button>
                    <button className="text-xs text-gray-400 hover:text-gray-600 ml-3" onClick={() => setClipboard(null)}>
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Widget */}
      {showWidget && (
        <div className="fixed bottom-6 right-6 z-[100] w-80 rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold">
                {uploadTasks.some((t) => t.status === "compressing")
                  ? `Compressing ${uploadTasks.filter((t) => t.status === "compressing").length} file(s)…`
                  : uploadTasks.filter((t) => t.status === "uploading").length > 0
                    ? `Uploading ${uploadTasks.filter((t) => t.status === "uploading").length} file(s)…`
                    : `${uploadTasks.length} file(s) done`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWidgetCollapsed((c) => !c)} className="p-1 rounded hover:bg-white/10 transition-colors">
                {widgetCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button onClick={() => setUploadTasks([])} className="p-1 rounded hover:bg-white/10 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {!widgetCollapsed && (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {uploadTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                    <img src={task.preview} alt={task.file.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate mb-1" title={task.file.name}>{task.file.name}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", statusColor(task.status))}
                        style={{ width: task.status === "compressing" ? "35%" : `${task.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">
                        {task.status === "completed" && "✓ Done"}
                        {task.status === "compressing" && "Compressing…"}
                        {task.status === "uploading" && `${task.progress}%`}
                        {task.status === "stopped" && "Stopped"}
                        {task.status === "error" && (task.error ?? "Error")}
                      </span>
                      <span className="text-[10px] text-gray-400">{(task.file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {task.status === "uploading" && (
                      <button onClick={() => handleStopTask(task)} title="Stop" className="p-1 rounded-md hover:bg-orange-50 text-orange-500 hover:text-orange-600 transition-colors"><StopCircle className="h-4 w-4" /></button>
                    )}
                    {(task.status === "stopped" || task.status === "error") && (
                      <button onClick={() => handleRetryTask(task)} title="Retry" className="p-1 rounded-md hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-colors"><RotateCcw className="h-4 w-4" /></button>
                    )}
                    {task.status !== "uploading" && (
                      <button onClick={() => handleDismissTask(task.id)} title="Dismiss" className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Folder Picker */}
      <FolderPickerDialog
        open={folderPickerOpen}
        title={folderPickerMode === "move" ? `Move ${selectedItems.size} item(s) to…` : `Copy ${selectedItems.size} item(s) to…`}
        currentPath={currentPath}
        onConfirm={handleFolderPickerConfirm}
        onClose={() => setFolderPickerOpen(false)}
      />

      {/* Create Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Item</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="New name" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
