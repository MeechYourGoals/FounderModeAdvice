import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRY_OPTIONS, OTHER_INDUSTRY, isCustomIndustry } from "@/lib/industries";

interface IndustrySelectProps {
  /** Current stored industry value (a known option or a custom string). */
  value: string;
  /** Receives the effective industry string (known option or custom text). */
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Industry picker with a fixed list of categories plus a custom "Other" entry.
 * The effective value (selected label or custom text) is reported via onChange
 * and stored as-is in the profile's free-text `industry` column.
 */
export const IndustrySelect = ({ value, onChange, disabled, id = "industry" }: IndustrySelectProps) => {
  // "Other" mode is active when there is a non-empty value not in the known list.
  const [isOther, setIsOther] = useState<boolean>(isCustomIndustry(value));

  // Keep "Other" mode in sync when the value is loaded/replaced externally
  // (e.g. selecting a saved profile or opening the edit dialog).
  useEffect(() => {
    setIsOther(isCustomIndustry(value));
  }, [value]);

  const selectValue = isOther ? OTHER_INDUSTRY : value;

  const handleSelect = (next: string) => {
    if (next === OTHER_INDUSTRY) {
      setIsOther(true);
      onChange(""); // start with an empty custom value
    } else {
      setIsOther(false);
      onChange(next);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Industry</Label>
      <Select value={selectValue} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select industry" />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRY_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_INDUSTRY}>{OTHER_INDUSTRY}</SelectItem>
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          aria-label="Custom industry"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your industry"
          disabled={disabled}
        />
      )}
    </div>
  );
};
