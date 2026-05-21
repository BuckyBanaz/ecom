import { useState, useEffect } from "react";
import { 
  Folder, Image as ImageIcon, Upload, Plus, Trash2, ArrowLeft, ChevronRight, Copy, Check,
  RefreshCw, Filter, LayoutGrid, List, PanelRightClose, PanelRightOpen, Search, MoreVertical, Edit2
} from "lucide-react";
import { mediaRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type MediaItem = {
  name: string;
  isFolder: boolean;
  size: number;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  path: string;
};

const MediaLibrary = () => {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection & UI State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<MediaItem | null>(null);
  const [newName, setNewName] = useState("");

  const loadMedia = async (path: string) => {
    setLoading(true);
    setSelectedItems(new Set()); // clear selection on navigate
    try {
      const res = await mediaRepository.list(path);
      if (res.success) {
        setItems(res.data);
      }
    } catch (err) {
      toast.error("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia(currentPath);
  }, [currentPath]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await mediaRepository.createFolder(currentPath, newFolderName);
      toast.success("Folder created");
      setIsFolderDialogOpen(false);
      setNewFolderName("");
      loadMedia(currentPath);
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    try {
      toast.loading("Uploading...");
      await mediaRepository.upload(currentPath, file);
      toast.dismiss();
      toast.success("File uploaded successfully");
      loadMedia(currentPath);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to upload file");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
      return;
    }
    
    let successCount = 0;
    toast.loading("Deleting...");
    
    for (const path of Array.from(selectedItems)) {
      try {
        await mediaRepository.delete(path);
        successCount++;
      } catch (err: any) {
        toast.error(`Failed to delete ${path}: ${err.message || "Error"}`);
      }
    }
    
    toast.dismiss();
    if (successCount > 0) {
      toast.success(`Deleted ${successCount} item(s)`);
      setSelectedItems(new Set());
      loadMedia(currentPath);
    }
  };

  const handleRename = async () => {
    if (!itemToRename || !newName.trim() || newName === itemToRename.name) {
      setIsRenameDialogOpen(false);
      return;
    }

    try {
      await mediaRepository.rename(itemToRename.path, newName);
      toast.success("Renamed successfully");
      setIsRenameDialogOpen(false);
      setItemToRename(null);
      setNewName("");
      loadMedia(currentPath);
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    }
  };

  const copyToClipboard = (url: string | null) => {
    if (!url) return;
    const fullUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${url}` : `http://localhost:5000${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard!");
  };

  const navigateTo = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const toggleSelection = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedItems);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedItems(newSet);
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  // Get the last selected item for the info sidebar
  const lastSelectedPath = Array.from(selectedItems).pop();
  const selectedItemDetails = items.find(i => i.path === lastSelectedPath);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white -m-6">
      {/* Top Header / Breadcrumbs */}
      <div className="px-6 py-4 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Link to="/admin" className="hover:text-primary">Dashboard</Link>
        <span>/</span>
        <span className="text-primary">Media</span>
      </div>

      {/* Main Toolbar */}
      <div className="px-6 py-4 border-b bg-gray-50/50 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <div className="relative">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleFileUpload}
              accept="image/*"
            />
            <Button className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>

          <Button variant="default" className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white px-3" onClick={() => setIsFolderDialogOpen(true)} title="New Folder">
            <Plus className="h-4 w-4" />
          </Button>

          <Button variant="default" className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white px-3" onClick={() => loadMedia(currentPath)} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          <Button variant="default" className="bg-[#1a56db] hover:bg-[#1e4ebd] text-white gap-2">
            <Filter className="h-4 w-4" /> (Everything)
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search in current folder" 
            className="pl-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left pane: Grid/List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Sub Header */}
          <div className="px-6 py-3 border-b flex items-center justify-between bg-white">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Folder className="h-4 w-4" />
              <span>{currentPath ? currentPath.split('/').pop() : 'All media'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-muted-foreground h-8">
                A-Z Sort <ChevronRight className="h-3 w-3 ml-2 rotate-90" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5 h-8 gap-2">
                    Actions <ChevronRight className="h-3 w-3 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    disabled={selectedItems.size !== 1}
                    onSelect={(e) => {
                      e.preventDefault();
                      const item = items.find(i => i.path === Array.from(selectedItems)[0]);
                      if (item) {
                        setItemToRename(item);
                        setNewName(item.name);
                        setIsRenameDialogOpen(true);
                      }
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled={selectedItems.size !== 1} 
                    onSelect={(e) => {
                       e.preventDefault();
                       const item = items.find(i => i.path === Array.from(selectedItems)[0]);
                       if (item && !item.isFolder) copyToClipboard(item.url);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    disabled={selectedItems.size === 0}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleBulkDelete();
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Move to trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center border rounded-md h-8 overflow-hidden">
                <Button variant="ghost" size="icon" className={cn("h-full w-8 rounded-none", viewMode === 'grid' && "bg-muted")} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className={cn("h-full w-8 rounded-none border-l", viewMode === 'list' && "bg-muted")} onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => setShowSidebar(!showSidebar)}>
                {showSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Grid View Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">Loading...</div>
            ) : filteredItems.length === 0 && !currentPath ? (
               <div className="flex h-full items-center justify-center text-muted-foreground">No media found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                
                {/* Back button */}
                {currentPath && (
                  <div 
                    onClick={navigateUp}
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer aspect-square text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="h-8 w-8 mb-2" />
                    <span className="text-xs font-semibold">Go Back</span>
                  </div>
                )}

                {/* Items */}
                {filteredItems.map((item) => {
                  const isSelected = selectedItems.has(item.path);

                  return (
                    <div 
                      key={item.path}
                      onClick={(e) => toggleSelection(e, item.path)}
                      onDoubleClick={(e) => {
                        if (item.isFolder) {
                          navigateTo(item.name);
                        }
                      }}
                      className={cn(
                        "group relative flex flex-col rounded-md overflow-hidden cursor-pointer border hover:border-gray-400 transition-all aspect-[4/5]",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-gray-200 bg-white"
                      )}
                    >
                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                          <Check className="h-3 w-3" />
                        </div>
                      )}

                      {item.isFolder ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-6">
                          <Folder strokeWidth={1} className={cn("h-16 w-16", isSelected ? "text-primary" : "text-gray-700")} />
                        </div>
                      ) : (
                        <div className="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
                          {item.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                            <img src={`http://localhost:5000${item.url}`} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon strokeWidth={1} className="h-16 w-16 text-gray-400" />
                          )}
                        </div>
                      )}
                      
                      <div className={cn(
                        "p-3 text-center border-t text-xs truncate font-medium",
                        isSelected ? "bg-primary text-white border-primary" : "text-gray-700"
                      )} title={item.name}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Sidebar */}
        {showSidebar && (
          <div className="w-72 border-l bg-gray-50/30 flex flex-col">
            {selectedItemDetails ? (
              <div className="p-6">
                <div className="aspect-square bg-white border rounded-xl flex items-center justify-center overflow-hidden mb-6 shadow-sm">
                  {selectedItemDetails.isFolder ? (
                    <Folder strokeWidth={1} className="h-24 w-24 text-gray-400" />
                  ) : selectedItemDetails.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                    <img src={`http://localhost:5000${selectedItemDetails.url}`} alt={selectedItemDetails.name} className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon strokeWidth={1} className="h-24 w-24 text-gray-400" />
                  )}
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate" title={selectedItemDetails.name}>{selectedItemDetails.name}</h3>
                    <p className="text-muted-foreground text-xs">{selectedItemDetails.isFolder ? 'Folder' : `${(selectedItemDetails.size / 1024).toFixed(1)} KB`}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Uploaded at</p>
                    <p className="font-medium">{new Date(selectedItemDetails.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Modified at</p>
                    <p className="font-medium">{new Date(selectedItemDetails.updatedAt).toLocaleString()}</p>
                  </div>

                  {!selectedItemDetails.isFolder && selectedItemDetails.url && (
                    <Button variant="outline" className="w-full mt-4" onClick={() => copyToClipboard(selectedItemDetails.url)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy URL
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm">Select an item to view its details.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Dialogs */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Folder name" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="New name" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MediaLibrary;
