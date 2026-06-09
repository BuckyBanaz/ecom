import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Image as ImageIcon, Table, Minus, Undo, Redo, Code, Quote, Eraser, 
  Palette, Highlighter, Indent, Outdent, ArrowUp, ArrowDown, Edit, Trash, Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UIBlocksDialog } from "./UIBlocksDialog";
import { MediaLibraryDialog } from "./media/MediaLibraryDialog";
import { LayoutTemplate } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, label, placeholder }: RichTextEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value || "");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [compressedDataUrl, setCompressedDataUrl] = useState("");
  const [compressedInfo, setCompressedInfo] = useState<{ size: number; type: string; width: number; height: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [isUIBlocksOpen, setIsUIBlocksOpen] = useState(false);
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  // Color picker states
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  const [activeBlockNode, setActiveBlockNode] = useState<HTMLElement | null>(null);
  const [editingShortcode, setEditingShortcode] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node) && !((e.target as HTMLElement).closest('.block-toolbar'))) {
        setActiveBlockNode(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Sync prop value to DOM if it changed externally (and not in source mode)
  useEffect(() => {
    if (!isSourceMode) {
      let processedValue = value || "";
      
      if (editorRef.current && editorRef.current.innerHTML !== processedValue) {
        editorRef.current.innerHTML = processedValue;
      }
      
      // Clean up and ensure all blocks are properly structured
      if (editorRef.current) {
        // Step 1: Unwrap nested .cms-block elements - keep only the outer one
        const allBlocks = editorRef.current.querySelectorAll('.cms-block');
        allBlocks.forEach(b => {
          const nestedBlocks = b.querySelectorAll('.cms-block');
          nestedBlocks.forEach(nested => {
            // Extract the shortcode text from nested block and remove the nested wrapper
            const shortcodeMatch = nested.innerHTML.match(/\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/);
            if (shortcodeMatch) {
              const textNode = document.createTextNode(shortcodeMatch[0]);
              nested.replaceWith(textNode);
            } else {
              nested.remove();
            }
          });
        });
        
        // Step 2: Now process each top-level block - remove old toolbars, keep shortcode, add fresh toolbar
        const blocks = editorRef.current.querySelectorAll('.cms-block');
        blocks.forEach(b => {
          if (!b.textContent?.trim()) {
            b.remove();
            return;
          }
          b.setAttribute('contenteditable', 'false');
          (b as HTMLElement).style.userSelect = 'none';
          
          // Extract the pure shortcode from the block
          const shortcodeMatch = b.textContent.match(/\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/);
          if (!shortcodeMatch) return;
          
          const shortcode = shortcodeMatch[0];
          const blockType = shortcodeMatch[1];
          const friendlyName = blockType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          
          // Rebuild the block with single clean toolbar
          b.innerHTML = `<span style="position: absolute; top: -1px; right: -1px; background-color: #3f3f46; color: white; padding: 4px 10px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><span style="opacity: 0.85; margin-right: 4px;">${friendlyName}</span><button type="button" class="cms-block-above-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Insert Text Above">T↑</button><button type="button" class="cms-block-below-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0; margin-right: 4px;" title="Insert Text Below">T↓</button><button type="button" class="cms-block-up-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Up">▲</button><button type="button" class="cms-block-down-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Down">▼</button><button type="button" class="cms-block-edit-btn" style="background: #2563eb; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Edit Block">Edit</button><button type="button" class="cms-block-delete-btn" style="background: #dc2626; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Delete Block">Delete</button></span>${shortcode}`;
        });
        
        // Step 3: Auto-wrap any raw shortcodes that aren't yet wrapped (in text nodes)
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);
        const textNodesToWrap: Text[] = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeValue && node.nodeValue.includes('[') && !(node.parentElement?.closest('.cms-block'))) {
            const regex = /\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/;
            if (regex.test(node.nodeValue)) {
              textNodesToWrap.push(node as Text);
            }
          }
        }
        
        textNodesToWrap.forEach(textNode => {
          const text = textNode.nodeValue || "";
          const regex = /\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/g;
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            const shortcodeType = match[1];
            const fullShortcode = match[0];
            const friendlyName = shortcodeType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            
            const wrapper = document.createElement("div");
            wrapper.className = "cms-block";
            wrapper.contentEditable = "false";
            wrapper.setAttribute("style", "background-color: #f4f4f5; padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; position: relative; font-family: monospace; font-size: 14px; color: #52525b; user-select: none;");
            wrapper.innerHTML = `<span style="position: absolute; top: -1px; right: -1px; background-color: #3f3f46; color: white; padding: 4px 10px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><span style="opacity: 0.85; margin-right: 4px;">${friendlyName}</span><button type="button" class="cms-block-above-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Insert Text Above">T↑</button><button type="button" class="cms-block-below-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0; margin-right: 4px;" title="Insert Text Below">T↓</button><button type="button" class="cms-block-up-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Up">▲</button><button type="button" class="cms-block-down-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Down">▼</button><button type="button" class="cms-block-edit-btn" style="background: #2563eb; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Edit Block">Edit</button><button type="button" class="cms-block-delete-btn" style="background: #dc2626; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Delete Block">Delete</button></span>${fullShortcode}`;
            
            fragment.appendChild(wrapper);
            lastIndex = regex.lastIndex;
          }
          
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          
          textNode.parentNode?.replaceChild(fragment, textNode);
        });
      }
    } else {
      setHtmlSource(value || "");
    }
  }, [value, isSourceMode]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedSelection(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (savedSelection) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelection);
      }
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const executeCommand = (command: string, arg: string = "") => {
    if (isSourceMode) return;
    
    restoreSelection();
    
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      // Also enforce during input just in case browsers try to strip it
      const blocks = editorRef.current.querySelectorAll('.cms-block');
      let changed = false;
      blocks.forEach(b => {
        if (!b.textContent?.trim()) {
          b.remove();
          changed = true;
          return;
        }
        if (b.getAttribute('contenteditable') !== 'false') {
          b.setAttribute('contenteditable', 'false');
          (b as HTMLElement).style.userSelect = 'none';
          changed = true;
        }
      });
      
      const currentHTML = editorRef.current.innerHTML;
      onChange(currentHTML);
      setHtmlSource(currentHTML);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    if (isSourceMode) return;
    const target = e.target as HTMLElement;
    
    // Check if user clicked an image inside the editor to allow resizing
    if (target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      const currentWidth = (target as HTMLImageElement).style.width || target.getAttribute('width') || '100%';
      const newWidth = prompt("Resize Image - Enter new width (e.g., 200px, 50%, auto):", currentWidth);
      if (newWidth !== null) {
        (target as HTMLImageElement).style.width = newWidth;
        (target as HTMLImageElement).style.height = 'auto'; // keep aspect ratio
        handleInput();
      }
      return;
    }
    
    // Check direct inline controls clicks
    if (target.classList.contains('cms-block-above-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block && editorRef.current) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editorRef.current.insertBefore(p, block);
        handleInput();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }

    if (target.classList.contains('cms-block-below-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block && editorRef.current) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        if (block.nextSibling) {
          editorRef.current.insertBefore(p, block.nextSibling);
        } else {
          editorRef.current.appendChild(p);
        }
        handleInput();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }

    if (target.classList.contains('cms-block-up-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block && editorRef.current) {
        const prev = block.previousElementSibling;
        if (prev) {
          editorRef.current.insertBefore(block, prev);
          handleInput();
        }
      }
      return;
    }

    if (target.classList.contains('cms-block-down-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block && editorRef.current) {
        const next = block.nextElementSibling;
        if (next) {
          if (next.nextSibling) {
            editorRef.current.insertBefore(block, next.nextSibling);
          } else {
            editorRef.current.appendChild(block);
          }
          handleInput();
        }
      }
      return;
    }

    if (target.classList.contains('cms-block-edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block) {
        setActiveBlockNode(block);
        let shortcode = "";
        block.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent?.trim().startsWith('[')) {
              shortcode = node.textContent.trim();
            }
          }
        });
        if (!shortcode) {
          const match = block.innerHTML.match(/\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/);
          if (match) shortcode = match[0];
        }
        if (shortcode) {
          setEditingShortcode(shortcode);
          saveSelection();
          setIsUIBlocksOpen(true);
        }
      }
      return;
    }

    if (target.classList.contains('cms-block-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const block = target.closest('.cms-block') as HTMLElement;
      if (block) {
        block.remove();
        setActiveBlockNode(null);
        handleInput();
      }
      return;
    }

    const block = target.closest('.cms-block') as HTMLElement;
    if (block && editorRef.current?.contains(block)) {
      setActiveBlockNode(block);
    } else {
      setActiveBlockNode(null);
    }
  };

  const handleEditorKeyDown = () => {
    if (activeBlockNode) setActiveBlockNode(null);
  };

  const moveBlockUp = () => {
    if (!activeBlockNode || !editorRef.current) return;
    const prev = activeBlockNode.previousElementSibling;
    if (prev) {
      editorRef.current.insertBefore(activeBlockNode, prev);
      handleInput();
      setActiveBlockNode(activeBlockNode); 
    }
  };

  const moveBlockDown = () => {
    if (!activeBlockNode || !editorRef.current) return;
    const next = activeBlockNode.nextElementSibling;
    if (next) {
      if (next.nextSibling) {
        editorRef.current.insertBefore(activeBlockNode, next.nextSibling);
      } else {
        editorRef.current.appendChild(activeBlockNode);
      }
      handleInput();
      setActiveBlockNode(activeBlockNode);
    }
  };

  const insertSpaceAbove = () => {
    if (!activeBlockNode || !editorRef.current) return;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    editorRef.current.insertBefore(p, activeBlockNode);
    handleInput();
    
    // Move cursor to the new line
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const insertSpaceBelow = () => {
    if (!activeBlockNode || !editorRef.current) return;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    if (activeBlockNode.nextSibling) {
      editorRef.current.insertBefore(p, activeBlockNode.nextSibling);
    } else {
      editorRef.current.appendChild(p);
    }
    handleInput();
    
    // Move cursor to the new line
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const deleteBlock = () => {
    if (!activeBlockNode) return;
    activeBlockNode.remove();
    setActiveBlockNode(null);
    handleInput();
  };

  const handleEditBlockClick = () => {
    if (!activeBlockNode) return;
    
    let shortcode = "";
    activeBlockNode.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim().startsWith('[')) {
          shortcode = node.textContent.trim();
        }
      }
    });

    if (!shortcode) {
      const match = activeBlockNode.innerHTML.match(/\[([a-zA-Z0-9-]+)[^\]]*\]\[\/\1\]/);
      if (match) shortcode = match[0];
    }

    if (shortcode) {
      setEditingShortcode(shortcode);
      saveSelection();
      setIsUIBlocksOpen(true);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlSource(val);
    onChange(val);
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Transitioning from Source (HTML text) back to Editor
      setIsSourceMode(false);
    } else {
      // Transitioning from Editor to Source HTML
      if (editorRef.current) {
        setHtmlSource(editorRef.current.innerHTML);
      }
      setIsSourceMode(true);
    }
  };

  const handleLinkInsert = () => {
    const url = prompt("Enter link URL (e.g., https://example.com):");
    if (url !== null) {
      executeCommand("createLink", url);
    }
  };

  const readFileAsDataUrl = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });



  const handleImageInsert = () => {
    saveSelection();
    setImageMode("upload");
    setImageUrl("");
    setCompressedDataUrl("");
    setCompressedInfo(null);
    setImageError("");
    setIsImageDialogOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true); // Keeping state for visual loading indicator
    setImageError("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCompressedDataUrl(dataUrl);
      setCompressedInfo({
        size: file.size,
        type: file.type,
        width: 0,
        height: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Read error";
      setImageError(`Failed to read image. ${message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleInsertFromDialog = () => {
    if (imageMode === "url") {
      if (!imageUrl.trim()) return;
      setIsImageDialogOpen(false);
      setTimeout(() => executeCommand("insertImage", imageUrl.trim()), 50);
      return;
    }

    if (!compressedDataUrl) return;
    setIsImageDialogOpen(false);
    setTimeout(() => executeCommand("insertImage", compressedDataUrl), 50);
  };

  const handleTableInsert = () => {
    const rowsStr = prompt("Enter number of rows:", "3");
    const colsStr = prompt("Enter number of columns:", "3");
    if (rowsStr && colsStr) {
      const rows = parseInt(rowsStr) || 3;
      const cols = parseInt(colsStr) || 3;
      
      let tableHtml = "<table style='border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; margin: 12px 0;'><tbody>";
      for (let i = 0; i < rows; i++) {
        tableHtml += "<tr>";
        for (let j = 0; j < cols; j++) {
          tableHtml += "<td style='border: 1px solid #cbd5e1; padding: 8px; text-align: left;'>Cell</td>";
        }
        tableHtml += "</tr>";
      }
      tableHtml += "</tbody></table><p></p>";
      
      executeCommand("insertHTML", tableHtml);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
        
        {/* Advanced Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
          
          {/* Group 1: Source & History */}
          <ToolbarButton 
            active={isSourceMode}
            icon={Code} 
            label="HTML Source" 
            onClick={toggleSourceMode} 
          />
          <div className="w-[1px] h-6 bg-border mx-1" />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Undo} 
            label="Undo" 
            onClick={() => executeCommand("undo")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Redo} 
            label="Redo" 
            onClick={() => executeCommand("redo")} 
          />
          
          <div className="w-[1px] h-6 bg-border mx-1" />
          
          {/* Group 2: Paragraph / Heading Format */}
          <select
            disabled={isSourceMode}
            onChange={(e) => executeCommand("formatBlock", e.target.value)}
            defaultValue="<p>"
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus-visible:outline-none"
          >
            <option value="<p>">Normal Text</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
            <option value="<h4>">Heading 4</option>
            <option value="<blockquote>">Quote</option>
            <option value="<pre>">Code Block</option>
          </select>

          {/* Group 3: Font Family */}
          <select
            disabled={isSourceMode}
            onChange={(e) => executeCommand("fontName", e.target.value)}
            defaultValue="Inter"
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus-visible:outline-none"
          >
            <option value="Inter">Font: Inter</option>
            <option value="Arial">Font: Arial</option>
            <option value="Georgia">Font: Georgia</option>
            <option value="Courier New">Font: Monospace</option>
            <option value="Times New Roman">Font: Times</option>
            <option value="Verdana">Font: Verdana</option>
          </select>

          {/* Group 4: Font Size */}
          <select
            disabled={isSourceMode}
            onChange={(e) => executeCommand("fontSize", e.target.value)}
            defaultValue="3"
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus-visible:outline-none"
          >
            <option value="1">Size: Small</option>
            <option value="3">Size: Normal</option>
            <option value="4">Size: Medium</option>
            <option value="5">Size: Large</option>
            <option value="6">Size: X-Large</option>
            <option value="7">Size: XX-Large</option>
          </select>

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 5: Core Styles */}
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Bold} 
            label="Bold" 
            onClick={() => executeCommand("bold")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Italic} 
            label="Italic" 
            onClick={() => executeCommand("italic")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Underline} 
            label="Underline" 
            onClick={() => executeCommand("underline")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Strikethrough} 
            label="Strikethrough" 
            onClick={() => executeCommand("strikeThrough")} 
          />
          
          <div className="w-[1px] h-6 bg-border mx-1" />
          
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Subscript} 
            label="Subscript" 
            onClick={() => executeCommand("subscript")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Superscript} 
            label="Superscript" 
            onClick={() => executeCommand("superscript")} 
          />

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 6: Alignment */}
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={AlignLeft} 
            label="Align Left" 
            onClick={() => executeCommand("justifyLeft")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={AlignCenter} 
            label="Align Center" 
            onClick={() => executeCommand("justifyCenter")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={AlignRight} 
            label="Align Right" 
            onClick={() => executeCommand("justifyRight")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={AlignJustify} 
            label="Justify" 
            onClick={() => executeCommand("justifyFull")} 
          />

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 7: Lists & Indents */}
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={List} 
            label="Bullet List" 
            onClick={() => executeCommand("insertUnorderedList")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={ListOrdered} 
            label="Numbered List" 
            onClick={() => executeCommand("insertOrderedList")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Outdent} 
            label="Decrease Indent" 
            onClick={() => executeCommand("outdent")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Indent} 
            label="Increase Indent" 
            onClick={() => executeCommand("indent")} 
          />

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 8: Colors */}
          {/* Text Color Trigger */}
          <div className="relative">
            <ToolbarButton 
              disabled={isSourceMode} 
              icon={Palette} 
              label="Text Color" 
              onClick={() => textColorInputRef.current?.click()} 
            />
            <input 
              ref={textColorInputRef}
              type="color" 
              className="absolute pointer-events-none opacity-0 w-0 h-0"
              onChange={(e) => executeCommand("foreColor", e.target.value)}
            />
          </div>
          
          {/* Highlight Color Trigger */}
          <div className="relative">
            <ToolbarButton 
              disabled={isSourceMode} 
              icon={Highlighter} 
              label="Highlight Color" 
              onClick={() => bgColorInputRef.current?.click()} 
            />
            <input 
              ref={bgColorInputRef}
              type="color" 
              className="absolute pointer-events-none opacity-0 w-0 h-0"
              onChange={(e) => executeCommand("hiliteColor", e.target.value)}
            />
          </div>

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 9: Inserts */}
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Link} 
            label="Insert Link" 
            onClick={handleLinkInsert} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={ImageIcon} 
            label="Insert Image" 
            onClick={handleImageInsert} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Table} 
            label="Insert Table" 
            onClick={handleTableInsert} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Minus} 
            label="Insert Horizontal Line" 
            onClick={() => executeCommand("insertHorizontalRule")} 
          />
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={LayoutTemplate} 
            label="UI Blocks" 
            onClick={() => {
              saveSelection();
              setIsUIBlocksOpen(true);
            }} 
          />

          <div className="w-[1px] h-6 bg-border mx-1" />

          {/* Group 10: Clear / Utility */}
          <ToolbarButton 
            disabled={isSourceMode} 
            icon={Eraser} 
            label="Clear Formatting" 
            onClick={() => executeCommand("removeFormat")} 
          />
        </div>

        {/* Editor Content Area */}
        <div className="relative min-h-[220px] p-4 bg-background">
          {isSourceMode ? (
            <textarea
              value={htmlSource}
              onChange={handleSourceChange}
              placeholder="Write raw HTML code here..."
              className="w-full min-h-[220px] bg-muted/10 p-3 rounded-lg border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-y leading-relaxed"
            />
          ) : (
            <>
              <div
                ref={editorRef}
                contentEditable
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="outline-hidden prose prose-sm max-w-none dark:prose-invert min-h-[220px] max-h-[520px] resize-y overflow-auto text-foreground leading-relaxed focus:outline-none"
              />
              {!value && !isFocused && placeholder && (
                <div className="absolute top-4 left-4 text-sm text-muted-foreground pointer-events-none">
                  {placeholder}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer info showing current mode */}
        <div className="flex justify-between items-center bg-muted/20 px-3 py-1 border-t text-[10px] text-muted-foreground">
          <div>Features: HTML Editor, Font attributes, Link & Media inserts</div>
          <div className="font-semibold text-primary/80">
            {isSourceMode ? "HTML SOURCE MODE" : "VISUAL EDITOR"}
          </div>
        </div>
      </div>

      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={imageMode === "upload" ? "secondary" : "outline"}
              onClick={() => setImageMode("upload")}
            >
              Upload
            </Button>
            <Button
              type="button"
              variant={imageMode === "url" ? "secondary" : "outline"}
              onClick={() => setImageMode("url")}
            >
              Insert URL
            </Button>
          </div>

          {imageMode === "upload" ? (
            <div className="space-y-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsMediaLibraryOpen(true)}>
                Browse Media Storage
              </Button>
              {compressedDataUrl && <div className="text-xs text-green-600">Image selected from storage.</div>}
              {imageError && <div className="text-xs text-destructive">{imageError}</div>}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInsertFromDialog}
              disabled={imageMode === "upload" ? !compressedDataUrl || isCompressing : !imageUrl.trim()}
            >
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaLibraryDialog 
        open={isMediaLibraryOpen}
        onOpenChange={setIsMediaLibraryOpen}
        onSelect={(url) => {
          setCompressedDataUrl(url.startsWith("http") ? url : `http://localhost:5000${url}`);
          setIsMediaLibraryOpen(false);
        }}
      />

      <UIBlocksDialog 
        open={isUIBlocksOpen} 
        onOpenChange={(open) => {
          setIsUIBlocksOpen(open);
          if (!open) setEditingShortcode(null);
        }} 
        onInsert={(shortcode, isEdit) => {
          if (isEdit && activeBlockNode && editorRef.current) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = shortcode;
            const newBlock = tempDiv.firstElementChild;
            if (newBlock) {
              activeBlockNode.replaceWith(newBlock);
              setActiveBlockNode(newBlock as HTMLElement);
            }
            setEditingShortcode(null);
            handleInput();
          } else if (editorRef.current) {
            // For new blocks, wrap them properly with toolbar
            const shortcodeMatch = shortcode.match(/\[([a-zA-Z0-9-]+)([^\]]*)\]\[\/\1\]/);
            if (shortcodeMatch) {
              const blockType = shortcodeMatch[1];
              const friendlyName = blockType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              
              const wrapper = document.createElement("div");
              wrapper.className = "cms-block";
              wrapper.contentEditable = "false";
              wrapper.setAttribute("style", "background-color: #f4f4f5; padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; position: relative; font-family: monospace; font-size: 14px; color: #52525b; user-select: none;");
              
              wrapper.innerHTML = `<span style="position: absolute; top: -1px; right: -1px; background-color: #3f3f46; color: white; padding: 4px 10px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <span style="opacity: 0.85; margin-right: 4px;">${friendlyName}</span>
                <button type="button" class="cms-block-above-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Insert Text Above">T↑</button>
                <button type="button" class="cms-block-below-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0; margin-right: 4px;" title="Insert Text Below">T↓</button>
                <button type="button" class="cms-block-up-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Up">▲</button>
                <button type="button" class="cms-block-down-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 10px; padding: 0;" title="Move Down">▼</button>
                <button type="button" class="cms-block-edit-btn" style="background: #2563eb; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Edit Block">Edit</button>
                <button type="button" class="cms-block-delete-btn" style="background: #dc2626; border: none; color: white; cursor: pointer; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; line-height: 1;" title="Delete Block">Delete</button>
              </span>${shortcode}`;
              
              restoreSelection();
              editorRef.current.appendChild(wrapper);
              setActiveBlockNode(wrapper);
              handleInput();
            }
          }
        }} 
        editingShortcode={editingShortcode}
      />
    </div>
  );
}

function ToolbarButton({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled = false,
  active = false
}: { 
  icon: any; 
  label: string; 
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      disabled={disabled}
      className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-all duration-150 ${
        active ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15" : ""
      }`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
