import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PhonePickerProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function PhonePicker({ value, onChange, required, id, className, disabled }: PhonePickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [code, setCode] = useState("+31");
  const [number, setNumber] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      if (value.startsWith("+31")) { setCode("+31"); setNumber(value.slice(3)); }
      else if (value.startsWith("+91")) { setCode("+91"); setNumber(value.slice(3)); }
      // else if (value.startsWith("+44")) { setCode("+44"); setNumber(value.slice(3)); }
      // else if (value.startsWith("+1")) { setCode("+1"); setNumber(value.slice(2)); }
      else {
        // Default, no matched code
        setNumber(value);
      }
    } else {
      setNumber("");
    }
  }, [value]);

  const handleNumberChange = (newNum: string) => {
    // Only digits
    const cleaned = newNum.replace(/\D/g, '');
    setNumber(cleaned);
    onChange(`${code}${cleaned}`);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onChange(`${newCode}${number}`);
  };

  return (
    <div className={`flex bg-zinc-50 border border-zinc-200 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all ${disabled ? "opacity-50 pointer-events-none" : ""} ${className || ""}`}>
      {isMounted && (
        <Select value={code} onValueChange={handleCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[95px] border-0 focus:ring-0 rounded-none bg-transparent h-10 text-zinc-600 font-medium shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="+31">🇳🇱 +31</SelectItem>
            <SelectItem value="+91">🇮🇳 +91</SelectItem>
            {/* <SelectItem value="+1">🇺🇸 +1</SelectItem>
            <SelectItem value="+44">🇬🇧 +44</SelectItem> */}
          </SelectContent>
        </Select>
      )}
      <div className="w-[1px] h-6 bg-zinc-200 self-center"></div>
      <Input 
        id={id}
        type="tel" 
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder="1234567890" 
        className="flex-1 h-10 border-0 focus-visible:ring-0 rounded-none bg-transparent shadow-none" 
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
