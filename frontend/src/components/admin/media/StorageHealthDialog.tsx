import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  RefreshCw,
  Copy,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Sparkles,
  FileQuestion,
  Search,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { mediaRepository } from "@/client/apiClient";
import { toast } from "sonner";
import { resolveImgUrl } from "@/utils/image";

export interface MediaUsageRef {
  model: string;
  label: string;
  field: string;
  id?: string;
}

export interface AuditedMediaFile {
  name: string;
  path: string;
  url: string;
  size: number;
  hash: string;
  createdAt: string;
  updatedAt: string;
  isUnused: boolean;
  isDuplicate: boolean;
  duplicateGroupHash?: string;
  duplicateCount?: number;
  isMaster?: boolean;
  usages: MediaUsageRef[];
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  wastedBytes: number;
  masterFile: AuditedMediaFile;
  duplicateFiles: AuditedMediaFile[];
  allFiles: AuditedMediaFile[];
}

export interface MediaAuditReport {
  summary: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMb: number;
    unusedFilesCount: number;
    unusedSizeBytes: number;
    unusedSizeMb: number;
    duplicateGroupsCount: number;
    duplicateFilesCount: number;
    duplicateWastedBytes: number;
    duplicateWastedMb: number;
  };
  unusedFiles: AuditedMediaFile[];
  duplicateGroups: DuplicateGroup[];
  fileStatusMap: Record<
    string,
    {
      isUnused: boolean;
      isDuplicate: boolean;
      duplicateCount: number;
      usagesCount: number;
      usages: MediaUsageRef[];
    }
  >;
}

interface StorageHealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshMedia?: () => void;
}

export function StorageHealthDialog({
  open,
  onOpenChange,
  onRefreshMedia,
}: StorageHealthDialogProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [auditData, setAuditData] = useState<MediaAuditReport | null>(null);
  const [activeTab, setActiveTab] = useState<"unused" | "duplicates">("unused");
  const [searchUnused, setSearchUnused] = useState("");
  const [selectedUnusedPaths, setSelectedUnusedPaths] = useState<Set<string>>(
    new Set()
  );

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await mediaRepository.audit();
      if (res.success && res.data) {
        setAuditData(res.data);
        setSelectedUnusedPaths(new Set());
      } else {
        toast.error(res.message || "Failed to scan storage");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to scan storage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAudit();
    }
  }, [open]);

  // Handle single or multiple unused delete
  const handleDeleteUnused = async (paths?: string[], all = false) => {
    const targetCount = all
      ? auditData?.unusedFiles.length || 0
      : paths?.length || selectedUnusedPaths.size;

    if (targetCount === 0) return;

    const confirmMsg = all
      ? `Are you sure you want to delete ALL ${targetCount} unused images (${auditData?.summary.unusedSizeMb} MB)? This action cannot be undone.`
      : `Are you sure you want to delete ${targetCount} selected unused image(s)?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    const toastId = toast.loading("Deleting unused image(s)...");

    try {
      const pathsToDelete = all
        ? undefined
        : paths || Array.from(selectedUnusedPaths);
      const res = await mediaRepository.deleteUnused({
        paths: pathsToDelete,
        all,
      });

      if (res.success) {
        toast.success(
          `Successfully removed ${res.data.deletedCount} unused image(s) and freed ${res.data.mbSaved} MB!`,
          { id: toastId }
        );
        await fetchAudit();
        if (onRefreshMedia) onRefreshMedia();
      } else {
        toast.error(res.message || "Failed to delete unused images", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting unused images", {
        id: toastId,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deduplication (single group or all)
  const handleDeduplicate = async (hash?: string) => {
    const confirmMsg = hash
      ? "Merge duplicates in this group? Database references will be pointed to the master file and duplicate files will be safely removed."
      : "Auto-deduplicate all duplicate groups? This will re-link all products, categories, and blogs to the primary photos and delete redundant copies.";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    const toastId = toast.loading("Deduplicating images...");

    try {
      const res = await mediaRepository.deduplicate({ hash });
      if (res.success) {
        toast.success(
          `Removed ${res.data.duplicatesRemoved} duplicate file(s) and freed ${res.data.mbSaved} MB! (${res.data.dbReferencesUpdated} DB references re-linked)`,
          { id: toastId }
        );
        await fetchAudit();
        if (onRefreshMedia) onRefreshMedia();
      } else {
        toast.error(res.message || "Failed to deduplicate images", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error deduplicating images", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectUnused = (path: string) => {
    const next = new Set(selectedUnusedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedUnusedPaths(next);
  };

  const toggleSelectAllUnused = () => {
    if (!auditData) return;
    const filtered = auditData.unusedFiles.filter((f) =>
      f.name.toLowerCase().includes(searchUnused.toLowerCase())
    );
    if (selectedUnusedPaths.size === filtered.length && filtered.length > 0) {
      setSelectedUnusedPaths(new Set());
    } else {
      setSelectedUnusedPaths(new Set(filtered.map((f) => f.path)));
    }
  };

  const filteredUnused = (auditData?.unusedFiles || []).filter((f) =>
    f.name.toLowerCase().includes(searchUnused.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const mb = bytes / (k * k);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / k).toFixed(1)} KB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50/70 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Storage Health & Image Cleaner
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Scan for orphaned unlinked images and duplicate files to free up
              storage safely.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAudit}
            disabled={loading || actionLoading}
            className="gap-1.5 h-8 text-xs ml-auto mr-6"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Scanning..." : "Re-Scan"}
          </Button>
        </DialogHeader>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-white border-b text-xs">
          <div className="p-3 bg-gray-50 border rounded-lg">
            <span className="text-gray-500 block mb-1 flex items-center gap-1.5 font-medium">
              <HardDrive className="h-3.5 w-3.5 text-gray-600" /> Total Storage
            </span>
            <span className="text-base font-bold text-gray-900">
              {auditData ? `${auditData.summary.totalSizeMb} MB` : "—"}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              {auditData ? `${auditData.summary.totalFiles} files total` : ""}
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg">
            <span className="text-amber-800 block mb-1 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Unused
              Images
            </span>
            <span className="text-base font-bold text-amber-900">
              {auditData ? `${auditData.summary.unusedFilesCount} files` : "—"}
            </span>
            <span className="text-[11px] text-amber-700 block mt-0.5">
              {auditData ? `${auditData.summary.unusedSizeMb} MB unlinked` : ""}
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-lg">
            <span className="text-purple-800 block mb-1 flex items-center gap-1.5 font-medium">
              <Copy className="h-3.5 w-3.5 text-purple-600" /> Duplicate Files
            </span>
            <span className="text-base font-bold text-purple-900">
              {auditData
                ? `${auditData.summary.duplicateFilesCount} duplicates`
                : "—"}
            </span>
            <span className="text-[11px] text-purple-700 block mt-0.5">
              {auditData
                ? `${auditData.summary.duplicateGroupsCount} duplicate groups`
                : ""}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg">
            <span className="text-emerald-800 block mb-1 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Recoverable
            </span>
            <span className="text-base font-bold text-emerald-900">
              {auditData
                ? `${(
                    auditData.summary.unusedSizeMb +
                    auditData.summary.duplicateWastedMb
                  ).toFixed(2)} MB`
                : "—"}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              Safe to clean up
            </span>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b bg-gray-50/50 flex items-center justify-between">
            <TabsList className="bg-transparent h-11 p-0 gap-6">
              <TabsTrigger
                value="unused"
                className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-2 font-semibold text-xs flex items-center gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Unused Images
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] bg-amber-100 text-amber-800 font-bold"
                >
                  {auditData?.summary.unusedFilesCount || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="duplicates"
                className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent px-2 font-semibold text-xs flex items-center gap-2"
              >
                <Copy className="h-3.5 w-3.5 text-purple-500" />
                Duplicates
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] bg-purple-100 text-purple-800 font-bold"
                >
                  {auditData?.summary.duplicateGroupsCount || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Quick Actions per Tab */}
            {activeTab === "unused" && (
              <div className="flex items-center gap-2">
                {selectedUnusedPaths.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteUnused()}
                    disabled={actionLoading}
                    className="h-7 text-xs gap-1.5 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected ({selectedUnusedPaths.size})
                  </Button>
                )}
                {(auditData?.unusedFiles.length || 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteUnused(undefined, true)}
                    disabled={actionLoading}
                    className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clean All Unused ({auditData?.summary.unusedSizeMb} MB)
                  </Button>
                )}
              </div>
            )}

            {activeTab === "duplicates" && (
              <div className="flex items-center gap-2">
                {(auditData?.duplicateGroups.length || 0) > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleDeduplicate()}
                    disabled={actionLoading}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Auto Deduplicate All ({auditData?.summary.duplicateWastedMb} MB)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: UNUSED IMAGES */}
          <TabsContent
            value="unused"
            className="flex-1 flex flex-col p-0 m-0 overflow-hidden"
          >
            {/* Search and Selection Toolbar */}
            <div className="px-6 py-2.5 bg-white border-b flex items-center justify-between gap-4">
              <div className="relative w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <Input
                  placeholder="Filter unused files..."
                  value={searchUnused}
                  onChange={(e) => setSearchUnused(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {filteredUnused.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Checkbox
                    id="select-all-unused"
                    checked={
                      selectedUnusedPaths.size === filteredUnused.length &&
                      filteredUnused.length > 0
                    }
                    onCheckedChange={toggleSelectAllUnused}
                  />
                  <label
                    htmlFor="select-all-unused"
                    className="cursor-pointer font-medium select-none"
                  >
                    Select All ({filteredUnused.length})
                  </label>
                </div>
              )}
            </div>

            {/* List of Unused Images */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredUnused.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3 opacity-90" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    No Unused Images Found
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    All images in storage are currently linked to active
                    products, categories, reviews, or CMS pages!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredUnused.map((file) => {
                    const isSelected = selectedUnusedPaths.has(file.path);
                    return (
                      <div
                        key={file.path}
                        onClick={() => toggleSelectUnused(file.path)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectUnused(file.path)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border flex items-center justify-center">
                          <img
                            src={resolveImgUrl(file.url)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src = "";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-semibold text-gray-800 truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">
                            /{file.path}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium text-gray-500">
                              {formatBytes(file.size)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50/50"
                            >
                              0 references
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUnused([file.path]);
                          }}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete this unused file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: DUPLICATES */}
          <TabsContent
            value="duplicates"
            className="flex-1 flex flex-col p-0 m-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {(auditData?.duplicateGroups || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3 opacity-90" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    No Duplicate Files Detected
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    All stored files have unique binary content. Your storage has
                    zero duplicate waste!
                  </p>
                </div>
              ) : (
                auditData?.duplicateGroups.map((group, idx) => (
                  <div
                    key={group.hash}
                    className="border border-purple-200/80 rounded-xl p-4 bg-purple-50/20 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-600 text-white text-[11px]">
                          Group #{idx + 1}
                        </Badge>
                        <span className="text-xs font-semibold text-gray-800">
                          {group.duplicateFiles.length + 1} Identical Copies
                        </span>
                        <span className="text-xs text-gray-400">
                          ({formatBytes(group.size)} each)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                          Wasted: {formatBytes(group.wastedBytes)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeduplicate(group.hash)}
                          disabled={actionLoading}
                          className="h-7 text-xs border-purple-300 text-purple-800 hover:bg-purple-100/70"
                        >
                          Merge This Group
                        </Button>
                      </div>
                    </div>

                    {/* Master vs Duplicate Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Master Item */}
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-3">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-white flex-shrink-0 border flex items-center justify-center">
                          <img
                            src={resolveImgUrl(group.masterFile.url)}
                            alt={group.masterFile.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-600 text-white text-[10px] px-1 py-0">
                              Master / Primary
                            </Badge>
                            <span className="text-[11px] text-emerald-800 font-semibold truncate">
                              Will Be Kept
                            </span>
                          </div>
                          <p
                            className="text-xs font-semibold text-gray-800 mt-1 truncate"
                            title={group.masterFile.name}
                          >
                            {group.masterFile.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">
                            /{group.masterFile.path}
                          </p>
                          {group.masterFile.usages.length > 0 && (
                            <p className="text-[10px] text-emerald-700 mt-1 truncate">
                              Used in:{" "}
                              {group.masterFile.usages
                                .map((u) => `${u.model}: ${u.label}`)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Duplicates to be removed */}
                      <div className="space-y-2">
                        {group.duplicateFiles.map((dup) => (
                          <div
                            key={dup.path}
                            className="p-3 bg-white border border-dashed border-purple-300 rounded-lg flex items-start gap-3"
                          >
                            <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border flex items-center justify-center">
                              <img
                                src={resolveImgUrl(dup.url)}
                                alt={dup.name}
                                className="w-full h-full object-cover opacity-80"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 text-purple-800 text-[10px] px-1 py-0"
                                >
                                  Redundant Copy
                                </Badge>
                                <span className="text-[11px] text-purple-700">
                                  Will be merged & deleted
                                </span>
                              </div>
                              <p
                                className="text-xs font-semibold text-gray-700 mt-1 truncate"
                                title={dup.name}
                              >
                                {dup.name}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono truncate">
                                /{dup.path}
                              </p>
                              {dup.usages.length > 0 && (
                                <p className="text-[10px] text-purple-700 mt-1 truncate">
                                  References to update: {dup.usages.length}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
