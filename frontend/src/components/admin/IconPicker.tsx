import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { iconList, iconMap } from "@/utils/fontawesome";

const labelFromName = (name: string) =>
  name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const resolveIcon = (value: string) => iconMap.get(value) || iconMap.get("star");

type IconPickerProps = {
  value: string;
  onChange: (value: string) => void;
  buttonLabel?: string;
};

export const IconPicker = ({ value, onChange, buttonLabel }: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? iconList.filter((i) => {
        const name = i.iconName.toLowerCase();
        const prefix = String(i.prefix || "").toLowerCase();
        return name.includes(normalized) || prefix.includes(normalized);
      })
    : iconList.slice(0, 240);
  const displayList = filtered.slice(0, 240);
  const activeIcon = resolveIcon(value);

  return (
    <div>
      <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => setOpen(true)}>
        {activeIcon && <FontAwesomeIcon icon={activeIcon} className="h-4 w-4 text-primary" />}
        <span>{buttonLabel || labelFromName(value || "star")}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select icon</DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons..."
            className="mt-2"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            {normalized ? `${filtered.length} icons found` : "Type to search all icons"}
          </div>
          {displayList.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No icons found. Try a different keyword.
            </div>
          ) : (
            <div key={normalized} className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto">
              {displayList.map((item) => (
                <button
                  key={`${normalized}-${item.iconName}`}
                  type="button"
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    onChange(item.iconName);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <FontAwesomeIcon icon={item} className="h-4 w-4 text-primary" />
                  <span className="truncate">{labelFromName(item.iconName)}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
