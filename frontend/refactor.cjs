const fs = require('fs');
const path = require('path');

const adminFormPath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminProductForm.tsx');
let adminForm = fs.readFileSync(adminFormPath, 'utf8');

// 1. Replace Interfaces
adminForm = adminForm.replace(/interface SpecItem \{[\s\S]*?\n\}\n\ninterface SpecGroup \{[\s\S]*?\n\}/m, 
`export interface SpecItem {
  id: string;
  key: string;
  value: string;
  link?: string;
}`);

// 2. Replace States
adminForm = adminForm.replace(
/const \[specGroups, setSpecGroups\] = useState<SpecGroup\[\]>\(\[\]\);[\s\S]*?const \[newParamName, setNewParamName\] = useState\(""\);/m,
`const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [newParamName, setNewParamName] = useState("");`
);

// 3. Replace DEFAULT_SPECS_STRUCTURE
adminForm = adminForm.replace(
/const DEFAULT_SPECS_STRUCTURE: SpecGroup\[\] = \[[\s\S]*?\];\n\n  const parseFlatSpecsToGroups/m,
`const DEFAULT_SPECS_STRUCTURE: SpecItem[] = [
    { id: "e1", key: "Maximum wattage", value: "7W" },
    { id: "e2", key: "Connection voltage", value: "220-240V" },
    { id: "e4", key: "Type of fitting", value: "E27" },
    { id: "e5", key: "Includes light", value: "No" },
    { id: "e6", key: "Dimmable", value: "Yes (not included)" },
    { id: "p1", key: "Length in cm", value: "50" },
    { id: "p2", key: "Width in cm", value: "50" },
    { id: "p3", key: "Height in cm", value: "120" },
    { id: "p4", key: "Base/mounting plate width in cm", value: "12" },
    { id: "p5", key: "Foot/mounting plate length", value: "12" },
    { id: "p6", key: "Height of foot/mounting plate", value: "2.5" },
    { id: "m1", key: "Colour", value: "Black" },
    { id: "m2", key: "Material", value: "Metal" },
    { id: "m3", key: "Style", value: "Modern" },
    { id: "m4", key: "Warranty", value: "2 years" },
    { id: "l1", key: "Article number", value: "Q10757" },
    { id: "l2", key: "IP rating", value: "IP20 (dustproof)" },
    { id: "l3", key: "Installation Manual", value: "Download PDF", link: "" }
  ];

  const parseFlatSpecsToGroups`
);

// 4. Replace parse and serialize logic
adminForm = adminForm.replace(
/const parseFlatSpecsToGroups = \([\s\S]*?return flat;\n  \};/m,
`const parseSpecs = (specsObj: any): SpecItem[] => {
    if (Array.isArray(specsObj)) {
      return specsObj
        .filter(s => s.key !== "Number of lights" && s.key !== "Series")
        .map(s => ({ ...s, id: s.id || \`item-\${Math.random()}\` }));
    }
    
    // Legacy support
    if (typeof specsObj === "object" && specsObj !== null) {
      const items: SpecItem[] = [];
      Object.entries(specsObj).forEach(([fullKey, val]) => {
        let key = fullKey;
        if (fullKey.includes("::")) key = fullKey.split("::")[1];
        if (key === "Number of lights" || key === "Series") return;
        items.push({ id: \`item-\${Math.random()}\`, key, value: String(val) });
      });
      return items.length > 0 ? items : DEFAULT_SPECS_STRUCTURE;
    }
    return DEFAULT_SPECS_STRUCTURE;
  };

  const serializeSpecs = (items: SpecItem[]): any[] => {
    return items.filter(item => item.key.trim()).map(item => ({
      key: item.key.trim(),
      value: item.value.trim(),
      link: item.link?.trim() || ""
    }));
  };`
);

// 5. Replace state initialization inside useEffect
adminForm = adminForm.replace(/setSpecGroups\(DEFAULT_SPECS_STRUCTURE\);/g, 'setSpecs(DEFAULT_SPECS_STRUCTURE);');
adminForm = adminForm.replace(/setSpecGroups\([\s\S]*?parseFlatSpecsToGroups\(p\.specs || \{\}\)[\s\S]*?\);/m, 'setSpecs(parseSpecs(p.specs || []));');
adminForm = adminForm.replace(/setSpecGroups\(parsed\.length > 0 \? parsed : DEFAULT_SPECS_STRUCTURE\);/g, 'setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);');

// Replace local storage parsing
adminForm = adminForm.replace(/const parsed = parseFlatSpecsToGroups\(JSON\.parse\(savedForm\)\.specs\);/, 
  'const parsed = parseSpecs(JSON.parse(savedForm).specs);');

// Replace handle update logic
adminForm = adminForm.replace(
/const handleAddGroup[\s\S]*?setSpecGroups\(\(prev\) =>[\s\S]*?\}\);[\s\S]*?\};[\s\S]*?const handleUpdateItemValue[\s\S]*?\}\);[\s\S]*?\};/m,
`const handleAddItem = () => {
    if (!newParamName.trim()) return;
    setSpecs(prev => [...prev, { id: \`item-\${Math.random()}\`, key: newParamName, value: "", link: "" }]);
    setNewParamName("");
  };

  const handleDeleteItem = (itemId: string) => {
    setSpecs(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateItemKey = (itemId: string, newKey: string) => {
    setSpecs(prev => prev.map(item => item.id === itemId ? { ...item, key: newKey } : item));
  };

  const handleUpdateItemValue = (itemId: string, newValue: string) => {
    setSpecs(prev => prev.map(item => item.id === itemId ? { ...item, value: newValue } : item));
  };

  const handleUpdateItemLink = (itemId: string, newLink: string) => {
    setSpecs(prev => prev.map(item => item.id === itemId ? { ...item, link: newLink } : item));
  };
  
  const moveSpecItem = (index: number, direction: "up" | "down") => {
    setSpecs(prev => {
      const newSpecs = [...prev];
      if (direction === "up" && index > 0) {
        [newSpecs[index - 1], newSpecs[index]] = [newSpecs[index], newSpecs[index - 1]];
      } else if (direction === "down" && index < newSpecs.length - 1) {
        [newSpecs[index + 1], newSpecs[index]] = [newSpecs[index], newSpecs[index + 1]];
      }
      return newSpecs;
    });
  };`
);

// Form submission serialization
adminForm = adminForm.replace(
/const serializedSpecs = serializeSpecGroups\(specGroups\);\n[\s\S]*?if \(numberOfLights\) serializedSpecs\["Number of lights"\] = numberOfLights;\n[\s\S]*?if \(selectedSeries\) serializedSpecs\["Series"\] = selectedSeries;/m,
`const serializedSpecs = serializeSpecs(specs);
    if (numberOfLights) serializedSpecs.push({ key: "Number of lights", value: numberOfLights });
    if (selectedSeries) serializedSpecs.push({ key: "Series", value: selectedSeries });`
);

// Handle specific bug in edit check inside handleUpdateItemValue replacement - maybe I removed some extra methods like handleAddGroup. Let's fix the UI rendering block for Specs.
adminForm = adminForm.replace(
/<div className="flex items-center justify-between mb-4">[\s\S]*?{group\.items\.length === 0/m,
`<div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Parameter List
                  </h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="New Parameter Name" 
                      value={newParamName} 
                      onChange={e => setNewParamName(e.target.value)} 
                      className="h-8 text-xs w-48"
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
                    />
                    <Button type="button" size="sm" onClick={handleAddItem} className="h-8 px-3 rounded-lg text-xs gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {specs.length === 0`
);

adminForm = adminForm.replace(
/<p className="text-\[11px\] text-muted-foreground\/60 italic pl-2">No parameter rows inside this group\.<\/p>\n[\s\S]*?\) : \(\n[\s\S]*?<div className="grid grid-cols-1 md:grid-cols-2 gap-3\.5">[\s\S]*?\{group\.items\.map\(\(item\) => \([\s\S]*?<div key=\{item\.id\}[\s\S]*?<\/div>\n[\s\S]*?\)\}\n[\s\S]*?<\/div>\n[\s\S]*?\)\}\n[\s\S]*?<\/div>\n[\s\S]*?\)\)\n[\s\S]*?\)\}/m,
`<p className="text-[11px] text-muted-foreground/60 italic pl-2">No parameters added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {specs.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/10 group/item hover:border-muted-foreground/30 hover:bg-muted/50 transition-all duration-300">
                          <div className="flex flex-col gap-1 w-8 shrink-0">
                            <button type="button" onClick={() => moveSpecItem(index, 'up')} disabled={index === 0} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                            <button type="button" onClick={() => moveSpecItem(index, 'down')} disabled={index === specs.length - 1} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                          </div>
                          
                          <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-3 flex-grow items-center">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">Name</Label>
                              <Input
                                value={item.key}
                                onChange={(e) => handleUpdateItemKey(item.id, e.target.value)}
                                placeholder="Param Name"
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">Value / Text</Label>
                              <Input
                                value={item.value}
                                onChange={(e) => handleUpdateItemValue(item.id, e.target.value)}
                                placeholder="Param Value (e.g. Download PDF)"
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">URL Link (Optional)</Label>
                              <Input
                                value={item.link || ""}
                                onChange={(e) => handleUpdateItemLink(item.id, e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg text-primary"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors ml-2"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}`
);

fs.writeFileSync(adminFormPath, adminForm, 'utf8');

// Also update Product.tsx to render the new specs
const productPath = path.join(__dirname, 'src', 'pages', 'shop', 'Product.tsx');
let productContent = fs.readFileSync(productPath, 'utf8');

productContent = productContent.replace(
/const specsObj: Record<string, any> = product\.specs || \{\};\n[\s\S]*?const groups: Record<string, Array<\{ key: string; value: string \}>> = \{\};\n[\s\S]*?Object\.entries\(specsObj\)\.forEach\(\(\[fullKey, value\]\) => \{[\s\S]*?\}\);\n[\s\S]*?return Object\.entries\(groups\)\.map\(\(\[groupName, items\]\) => \(\n[\s\S]*?<div key=\{groupName\} className="space-y-2">\n[\s\S]*?<h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground\/80 px-1">\{groupName\}<\/h4>\n[\s\S]*?<div className="grid gap-1">\n[\s\S]*?\{items\.map\(\(item\) => \(\n[\s\S]*?<div key=\{item\.key\} className="flex justify-between rounded-lg bg-muted\/30 px-3 py-2 text-sm border border-transparent hover:border-border hover:bg-muted\/50 transition-colors">\n[\s\S]*?<span className="text-muted-foreground">\{item\.key\}<\/span>\n[\s\S]*?<span className="font-medium text-right max-w-\[60%\]">\{item\.value\}<\/span>\n[\s\S]*?<\/div>\n[\s\S]*?\)\}\n[\s\S]*?<\/div>\n[\s\S]*?<\/div>\n[\s\S]*?\)\);/m,
`const renderSpecs = () => {
              if (Array.isArray(product.specs)) {
                return (
                  <div className="grid gap-1">
                    {product.specs.filter((s: any) => s.key !== 'Number of lights' && s.key !== 'Series').map((item: any) => (
                      <div key={item.key} className="flex justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">{item.key}</span>
                        <span className="font-medium text-right max-w-[60%]">
                          {item.link ? (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              {item.value} 
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          ) : (
                            item.value
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }

              // Legacy rendering fallback
              const specsObj: Record<string, any> = product.specs || {};
              const groups: Record<string, Array<{ key: string; value: string }>> = {};

              Object.entries(specsObj).forEach(([fullKey, value]) => {
                let groupName = "General Specifications";
                let displayKey = fullKey;

                if (fullKey.includes("::")) {
                  const parts = fullKey.split("::");
                  groupName = parts[0];
                  displayKey = parts[1];
                }

                if (!groups[groupName]) {
                  groups[groupName] = [];
                }
                groups[groupName].push({ key: displayKey, value: String(value) });
              });

              return Object.entries(groups).map(([groupName, items]) => (
                <div key={groupName} className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 px-1">{groupName}</h4>
                  <div className="grid gap-1">
                    {items.map((item) => (
                      <div key={item.key} className="flex justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">{item.key}</span>
                        <span className="font-medium text-right max-w-[60%]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            };

            return renderSpecs();`
);

fs.writeFileSync(productPath, productContent, 'utf8');
console.log("Refactoring complete.");
