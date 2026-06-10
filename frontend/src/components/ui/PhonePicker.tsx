import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cleanAndValidatePhone, getMaxPhoneDigits } from "@/utils/phoneValidation";

interface PhonePickerProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function PhonePicker({ value, onChange, required, id, className, disabled, error }: PhonePickerProps) {
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
      else {
        // Default, no matched code
        setNumber(value);
      }
    } else {
      setNumber("");
    }
  }, [value]);

  const sanitizeNumber = (raw: string, countryCode: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    return digits.slice(0, getMaxPhoneDigits(countryCode));
  };

  const handleNumberChange = (newNum: string) => {
    const cleanedNumber = sanitizeNumber(newNum, code);
    const { fullPhone } = cleanAndValidatePhone(code, cleanedNumber);
    setNumber(cleanedNumber);
    onChange(fullPhone);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    const cleanedNumber = sanitizeNumber(number, newCode);
    const { fullPhone } = cleanAndValidatePhone(newCode, cleanedNumber);
    setNumber(cleanedNumber);
    onChange(fullPhone);
  };

  return (
    <div>
    <div className={`flex bg-zinc-50 border rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all ${error ? "border-red-500" : "border-zinc-200"} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className || ""}`}>
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
        inputMode="numeric"
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={code === "+91" ? "9876543210" : "612345678"}
        maxLength={getMaxPhoneDigits(code) + 1}
        className="flex-1 h-10 border-0 focus-visible:ring-0 rounded-none bg-transparent shadow-none" 
        required={required}
        disabled={disabled}
      />
    </div>
    {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
