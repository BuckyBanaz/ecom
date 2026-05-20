import { useEffect, useRef, useState } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Image, Table, Minus, Undo, Redo, Code, Quote, Eraser, 
  Palette, Highlighter, Indent, Outdent
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, label, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value || "");

  // Color picker states
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  // Sync prop value to DOM if it changed externally (and not in source mode)
  useEffect(() => {
    if (!isSourceMode) {
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    } else {
      setHtmlSource(value || "");
    }
  }, [value, isSourceMode]);

  const executeCommand = (command: string, arg: string = "") => {
    if (isSourceMode) return;
    
    // Focus the editor first to ensure command targets the correct selection
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      onChange(currentHTML);
      setHtmlSource(currentHTML);
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

  const handleImageInsert = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      executeCommand("insertImage", url);
    }
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
            icon={Image} 
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
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
