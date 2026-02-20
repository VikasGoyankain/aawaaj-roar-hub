import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Shield, ChevronRight, ChevronLeft, CheckCircle2, Volume2, Mic, Loader2, AlertCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FooterSection from "@/components/FooterSection";
import logoSvg from "@/assets/logo aawaaj.svg";
import { supabase } from "@/lib/supabase";
import {
  ALL_STATES,
  STATES_AND_DISTRICTS,
  lookupPincode,
  EMAIL_DOMAINS,
  isValidIndianMobile,
  searchColleges,
  SKILLS_LIST,
} from "@/lib/india-data";

/* ─── Types ─────────────────────────────────────────────────── */
type Role = "volunteer" | "victim" | null;
type ServeRole = "regional_head" | "campus_coordinator" | "volunteer_sub" | null;
type VolunteerScope = "campus" | "region" | null;

/* ─── Step progress indicator ───────────────────────────────── */
const STEPS = ["Identity", "Path", "Recognition", "Roar"];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
          className={cn(
            "transition-all duration-500 rounded-full",
            i < current
              ? "w-6 h-6 bg-saffron flex items-center justify-center"
              : i === current
              ? "w-3 h-3 bg-saffron shadow-saffron"
              : "w-2 h-2 bg-white/25"
          )}
        >
          {i < current && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        {i < total - 1 && (
          <div className={cn("h-px w-4 sm:w-8 transition-all duration-500", i < current ? "bg-saffron" : "bg-white/20")} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Multi-select Skills Dropdown ────────────────────────────── */
function MultiSelectSkills({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = SKILLS_LIST.filter((s) => s.toLowerCase().includes(filter.toLowerCase()));

  const toggle = (skill: string) => {
    onChange(
      selected.includes(skill)
        ? selected.filter((x) => x !== skill)
        : [...selected, skill]
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full min-h-[2.75rem] rounded-md border px-3 py-2 text-sm text-left flex items-center gap-2 flex-wrap focus:outline-none focus:ring-2 focus:ring-saffron focus:border-saffron/60 transition-all",
          "bg-white/[0.08] border-white/20 text-white"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-white/30">Select your skills…</span>
        ) : (
          selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 bg-saffron/20 border border-saffron/40 text-saffron text-xs font-heading tracking-wide px-2 py-0.5 rounded-full"
            >
              {s}
              <span
                onClick={(e) => { e.stopPropagation(); toggle(s); }}
                className="cursor-pointer hover:text-white ml-0.5 text-[10px] leading-none"
              >
                ✕
              </span>
            </span>
          ))
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-white/20 bg-[hsl(150_47%_12%)] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search skills…"
              className="bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-white/40 text-sm font-body text-center">No skills found</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm font-body flex items-center gap-2 transition-colors",
                    selected.includes(s)
                      ? "bg-saffron/20 text-saffron"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition-all",
                    selected.includes(s)
                      ? "bg-saffron border-saffron text-white"
                      : "border-white/30 bg-transparent"
                  )}>
                    {selected.includes(s) && "✓"}
                  </span>
                  {s}
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 text-xs text-white/40 font-body">
              {selected.length} skill{selected.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── College Search Component ───────────────────────────────── */
function CollegeSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (raw: string) => {
    setQuery(raw);
    onChange(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.length < 2) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchColleges(raw);
      setResults(data);
      setShowDrop(data.length > 0);
      setLoading(false);
    }, 400);
  };

  const pick = (name: string) => {
    setQuery(name);
    onChange(name);
    setShowDrop(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length) setShowDrop(true); }}
          placeholder="Search your college / university…"
          className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-saffron" />}
      </div>
      {showDrop && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-white/20 bg-[hsl(150_47%_12%)] shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {results.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(name); }}
              className="w-full text-left px-3 py-2.5 text-sm text-white/90 hover:bg-saffron/20 hover:text-white transition-colors font-body border-b border-white/5 last:border-0"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Serve Sub-role Option Card ──────────────────────────────── */
function ServeRoleOption({
  selected,
  onClick,
  emoji,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 sm:p-4 rounded-lg border transition-all duration-200",
        selected
          ? "border-saffron bg-saffron/10"
          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className={cn("font-heading font-bold text-sm tracking-wide", selected ? "text-saffron" : "text-white")}>{title}</div>
          <div className="text-white/50 text-xs font-body leading-relaxed mt-0.5">{desc}</div>
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-saffron flex-shrink-0" />}
      </div>
    </button>
  );
}

/* ─── Email Autocomplete Component ───────────────────────────── */
function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (raw: string) => {
    onChange(raw);
    const atIdx = raw.indexOf("@");
    if (atIdx >= 1) {
      const domPart = raw.slice(atIdx + 1).toLowerCase();
      const matches = EMAIL_DOMAINS.filter((d) => d.startsWith(domPart) && d !== domPart);
      setSuggestions(matches.map((d) => raw.slice(0, atIdx + 1) + d));
      setShowSugg(matches.length > 0);
    } else {
      setShowSugg(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        type="email"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="you@example.com"
        autoComplete="off"
        className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
        onFocus={() => { if (suggestions.length) setShowSugg(true); }}
      />
      {showSugg && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-white/20 bg-[hsl(150_47%_12%)] shadow-xl overflow-hidden">
          {suggestions.slice(0, 5).map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-saffron/20 hover:text-white transition-colors font-body"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setShowSugg(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── WhatsApp Input Component ────────────────────────────────── */
function WhatsAppInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showError, setShowError] = useState(false);

  const handleChange = (raw: string) => {
    // Only allow digits, max 10
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    onChange(digits);
    setShowError(false);
  };

  const handleBlur = () => {
    if (value.length > 0 && value.length < 10) {
      setShowError(true);
    } else if (value.length === 10 && !isValidIndianMobile(value)) {
      setShowError(true);
    } else {
      setShowError(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex">
        <div className="flex items-center h-11 px-3 rounded-l-md border border-r-0 border-white/20 bg-white/[0.12] text-white/70 text-sm font-heading select-none">
          +91
        </div>
        <Input
          type="tel"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="98765 43210"
          maxLength={10}
          className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11 rounded-l-none"
        />
      </div>
      {showError && value.length > 0 && value.length < 10 && (
        <p className="text-red-400 text-xs font-body flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> Mobile number must be exactly 10 digits
        </p>
      )}
      {showError && value.length === 10 && !isValidIndianMobile(value) && (
        <p className="text-red-400 text-xs font-body flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> Invalid Indian mobile number (must start with 6, 7, 8, or 9)
        </p>
      )}
      {value.length === 10 && isValidIndianMobile(value) && (
        <p className="text-green-400 text-xs font-body flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Valid mobile number
        </p>
      )}
    </div>
  );
}

/* ─── Date of Birth Picker ────────────────────────────────────── */
function DobPicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [textVal, setTextVal] = useState(value ? format(value, "dd/MM/yyyy") : "");
  const [textError, setTextError] = useState("");
  const currentYear = new Date().getFullYear();

  // Keep text in sync when calendar picks a date
  const handleCalendarSelect = (d: Date | undefined) => {
    onChange(d);
    setTextVal(d ? format(d, "dd/MM/yyyy") : "");
    setTextError("");
    if (d) setOpen(false);
  };

  // Parse manual input on blur
  const handleTextBlur = () => {
    const raw = textVal.trim();
    if (!raw) { onChange(undefined); setTextError(""); return; }
    // Accept dd/mm/yyyy or dd-mm-yyyy
    const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!match) { setTextError("Use dd/mm/yyyy format"); return; }
    const [, d, m, y] = match;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      isNaN(parsed.getTime()) ||
      parsed.getDate() !== Number(d) ||
      parsed.getMonth() !== Number(m) - 1
    ) {
      setTextError("Invalid date"); return;
    }
    if (parsed > new Date()) { setTextError("Date cannot be in the future"); return; }
    if (parsed < new Date("1950-01-01")) { setTextError("Year must be 1950 or later"); return; }
    onChange(parsed);
    setTextVal(format(parsed, "dd/MM/yyyy"));
    setTextError("");
  };

  return (
    <div className="space-y-2">
      {/* Manual text input */}
      <div className="relative">
        <Input
          value={textVal}
          onChange={(e) => { setTextVal(e.target.value); setTextError(""); }}
          onBlur={handleTextBlur}
          placeholder="dd/mm/yyyy"
          maxLength={10}
          className={cn(
            "bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11 pr-10",
            textError && "border-red-400/60"
          )}
        />
        {/* Calendar toggle */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-saffron/70 hover:text-saffron transition-colors"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 border-white/20"
            style={{ backgroundColor: "hsl(150 47% 12%)" }}
            align="start"
          >
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              captionLayout="dropdown-buttons"
              fromYear={1950}
              toYear={currentYear}
              defaultMonth={value ?? new Date(2000, 0)}
              disabled={(date) => date > new Date() || date < new Date("1950-01-01")}
              className="p-3 pointer-events-auto text-white"
              classNames={{
                caption: "flex justify-center items-center gap-1 pt-1",
                caption_label: "hidden",
                caption_dropdowns: "flex gap-1",
                dropdown:
                  "bg-[hsl(150_47%_14%)] border border-white/20 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-saffron cursor-pointer",
                nav_button:
                  "h-7 w-7 bg-transparent border border-white/20 text-white rounded hover:bg-white/10 flex items-center justify-center",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                head_cell: "text-white/40 rounded-md w-9 font-normal text-[0.8rem]",
                day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-saffron/20 text-white aria-selected:opacity-100 transition-colors",
                day_selected: "bg-saffron text-white hover:bg-saffron",
                day_today: "border border-saffron/40 text-saffron",
                day_outside: "text-white/20 opacity-50",
                day_disabled: "text-white/20 opacity-30 cursor-not-allowed",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {textError && (
        <p className="text-red-400 text-xs font-body flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> {textError}
        </p>
      )}
      {value && !textError && (
        <p className="text-green-400 text-xs font-body flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> {format(value, "dd MMMM yyyy")}
        </p>
      )}
    </div>
  );
}
function LocationFields({
  pincode, setPincode,
  selectedState, setSelectedState,
  district, setDistrict,
}: {
  pincode: string; setPincode: (v: string) => void;
  selectedState: string; setSelectedState: (v: string) => void;
  district: string; setDistrict: (v: string) => void;
}) {
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [pincodePostOffice, setPincodePostOffice] = useState("");

  const handlePincodeChange = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setPincode(digits);
    setPincodeError("");
    setPincodePostOffice("");

    if (digits.length === 6) {
      setPincodeLoading(true);
      const result = await lookupPincode(digits);
      setPincodeLoading(false);
      if (result) {
        setSelectedState(result.state);
        setDistrict(result.district);
        setPincodePostOffice(result.postOffice);
      } else {
        setPincodeError("Invalid pincode — please check and retry");
      }
    }
  }, [setPincode, setSelectedState, setDistrict]);

  const handleStateChange = (s: string) => {
    setSelectedState(s);
    setDistrict("");
    setPincode("");
    setPincodePostOffice("");
    setPincodeError("");
  };

  const handleDistrictChange = (d: string) => {
    setDistrict(d);
    setPincode("");
    setPincodePostOffice("");
    setPincodeError("");
  };

  const districts = selectedState ? (STATES_AND_DISTRICTS[selectedState] ?? []) : [];

  return (
    <div className="space-y-3">
      {/* Pincode shortcut */}
      <div>
        <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
          Pincode
          <span className="ml-2 text-white/35 font-body font-normal text-xs">(auto-fills state & district)</span>
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron/60" />
          <Input
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder="e.g. 380015"
            maxLength={6}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11 pl-9"
          />
          {pincodeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-saffron" />}
        </div>
        {pincodeError && <p className="text-red-400 text-xs font-body mt-1">{pincodeError}</p>}
        {pincodePostOffice && <p className="text-green-400 text-xs font-body mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {pincodePostOffice}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs font-heading tracking-widest uppercase">or select manually</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* State */}
        <div>
          <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">State</Label>
          <select
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full h-11 rounded-md border border-white/20 bg-white/[0.08] text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron focus:border-saffron/60 transition-all appearance-none"
            style={{ backgroundColor: 'hsl(150 60% 8% / 0.4)' }}
          >
            <option value="" style={{ backgroundColor: 'hsl(150 47% 14%)' }}>Select state</option>
            {ALL_STATES.map((s) => (
              <option key={s} value={s} style={{ backgroundColor: 'hsl(150 47% 14%)' }}>{s}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">District</Label>
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedState}
            className={cn(
              "w-full h-11 rounded-md border border-white/20 bg-white/[0.08] text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron focus:border-saffron/60 transition-all appearance-none",
              !selectedState && "opacity-50 cursor-not-allowed"
            )}
            style={{ backgroundColor: 'hsl(150 60% 8% / 0.4)' }}
          >
            <option value="" style={{ backgroundColor: 'hsl(150 47% 14%)' }}>{selectedState ? "Select district" : "Select state first"}</option>
            {districts.map((d) => (
              <option key={d} value={d} style={{ backgroundColor: 'hsl(150 47% 14%)' }}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Show pincode if manually selected */}
      {selectedState && district && !pincode && (
        <p className="text-white/40 text-xs font-body">Enter pincode above for exact locality match, or leave blank.</p>
      )}
    </div>
  );
}

/* ─── Path choice card ───────────────────────────────────────── */
function PathCard({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
      <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 sm:p-6 rounded-xl border-2 transition-all duration-300 group",
        selected
          ? "border-saffron bg-saffron/10 shadow-saffron"
          : "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10"
      )}
    >
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all", selected ? "bg-saffron" : "bg-white/10 group-hover:bg-white/20")}>
        {icon}
      </div>
      <div className="font-display text-xl text-white font-bold mb-1">{title}</div>
      <div className="text-white/60 text-sm font-body leading-relaxed">{desc}</div>
      {selected && (
        <div className="mt-3 flex items-center gap-1.5 text-saffron text-xs font-heading font-semibold tracking-wide">
          <CheckCircle2 className="w-4 h-4" /> Selected
        </div>
      )}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [district, setDistrict] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [serveRole, setServeRole] = useState<ServeRole>(null);
  const [volunteerScope, setVolunteerScope] = useState<VolunteerScope>(null);
  // Serve-role area fields (separate from step-1 location)
  const [servePincode, setServePincode] = useState("");
  const [serveState, setServeState] = useState("");
  const [serveDistrict, setServeDistrict] = useState("");
  const [college, setCollege] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [aboutSelf, setAboutSelf] = useState("");
  const [problemDesc, setProblemDesc] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [dob, setDob] = useState<Date | undefined>();
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 2 validation — volunteer path
  const isServeValid = (() => {
    if (serveRole === "regional_head") return serveState.length > 0 && serveDistrict.length > 0;
    if (serveRole === "campus_coordinator") return college.trim().length > 2;
    if (serveRole === "volunteer_sub") {
      if (volunteerScope === "campus") return college.trim().length > 2;
      if (volunteerScope === "region") return serveState.length > 0 && serveDistrict.length > 0;
      return false;
    }
    return false;
  })();

  // Validation helpers
  const stepValid = [
    name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isValidIndianMobile(whatsapp),
    role !== null && (role === "victim" ? problemDesc.trim().length > 10 : (serveRole !== null && isServeValid)),
    dob !== undefined,
    consent,
  ];

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const isVictim = role === "victim";
      const payload = {
        type: isVictim ? "victim_report" : "volunteer_application",
        status: "New",
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: whatsapp ? `+91${whatsapp}` : null,
        pincode: pincode || null,
        state: selectedState || null,
        district: district || null,
        region: district && selectedState ? `${district}, ${selectedState}` : selectedState || null,
        // Volunteer-specific
        serve_role: !isVictim ? serveRole : null,
        volunteer_scope: !isVictim && serveRole === "volunteer_sub" ? volunteerScope : null,
        serve_area_state: !isVictim ? serveState || null : null,
        serve_area_district: !isVictim ? serveDistrict || null : null,
        serve_area_pincode: !isVictim ? servePincode || null : null,
        college: !isVictim ? college || null : null,
        university: !isVictim ? college || null : null,
        skills: !isVictim && skills.length ? skills.join(", ") : null,
        about_self: !isVictim ? aboutSelf.trim() || null : null,
        motivation: !isVictim ? aboutSelf.trim() || null : null,
        // Victim-specific
        incident_description: isVictim ? problemDesc.trim() : null,
        // Meta
        recommended_by: recommendedBy.trim() || null,
        dob: dob ? dob.toISOString().split("T")[0] : null,
        consent: consent,
      };

      const { error } = await supabase.from("submissions").insert(payload);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("Submission error:", err);
      alert("Something went wrong submitting your form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────── Thank You Screen ────── */
  if (submitted) {
    return (
      <div className="min-h-screen gradient-dark-green flex items-center justify-center p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />
        <div className="max-w-lg w-full text-center">
          {/* Animated roar icon */}
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-8">
            <div className="absolute inset-0 bg-saffron/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-saffron rounded-full flex items-center justify-center shadow-saffron">
              <Volume2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
            Your Voice Has Been <span className="text-saffron italic">Heard.</span>
          </h1>
          <p className="text-white/75 text-lg font-body leading-relaxed mb-3">
            A Regional Head will reach out via <span className="text-saffron font-semibold">WhatsApp</span> shortly.
          </p>
          <p className="text-white/50 text-sm font-body mb-10">
            Welcome to the movement, <span className="text-white font-semibold">{name.split(" ")[0]}</span>. Together, we roar.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-sm px-8 py-3 rounded-sm tracking-wide transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark-green flex flex-col">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />

      {/* Navbar minimal */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 bg-primary/80 backdrop-blur-sm sticky top-0 z-40">
        <a href="/" className="flex items-center gap-2">
          <img src={logoSvg} alt="Aawaaj Movement" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl font-black text-white">Aawaaj<span className="text-saffron">.</span></span>
        </a>
        <StepDots current={step} total={4} />
        <div className="hidden sm:flex items-center gap-1.5 text-white/50 text-xs font-body">
          <Shield className="w-3.5 h-3.5 text-saffron" />
          100% Confidential
        </div>
      </header>

      {/* Hero hook */}
      {step === 0 && (
        <div className="text-center px-4 sm:px-6 pt-10 sm:pt-14 pb-6">
          <div className="inline-flex items-center gap-2 bg-saffron/15 border border-saffron/30 text-saffron px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-widest uppercase mb-5">
            <Mic className="w-3.5 h-3.5" /> Aawaaj Movement
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-black text-white leading-tight mb-3">
            Turn Your Whisper Into a<br />
            <span className="text-saffron italic">Nationwide Roar.</span>
          </h1>
          <p className="text-white/65 font-body text-lg">
            Of the Youth &nbsp;·&nbsp; By the Youth &nbsp;·&nbsp; For the Youth
          </p>
        </div>
      )}

      {/* Form card */}
      <main className="flex-1 flex items-start justify-center px-3 sm:px-4 pb-12 sm:pb-16 pt-6 sm:pt-8">
        <div className="w-full max-w-xl">
          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Step label bar */}
            <div className="px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-xs font-heading tracking-widest uppercase">
                  Step {step + 1} of 4
                </span>
                <span className="text-saffron text-xs font-heading tracking-widest uppercase font-semibold">
                  {STEPS[step]}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-white/10 rounded-full mt-3">
                <div
                  className="h-full bg-saffron rounded-full transition-all duration-700"
                  style={{ width: `${((step + 1) / 4) * 100}%` }}
                />
              </div>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6">
              {/* ── STEP 0: Identity ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Tell us who you are.</h2>
                    <p className="text-white/50 text-sm font-body">Your basic details — safe, private, secure.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">Full Name *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Arjun Sharma"
                        className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">Email Address *</Label>
                      <EmailInput value={email} onChange={setEmail} />
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        WhatsApp Number *
                      </Label>
                      <WhatsAppInput value={whatsapp} onChange={setWhatsapp} />
                      <p className="text-white/40 text-xs font-body mt-1.5">We'll add you to the official Aawaaj coordination group</p>
                    </div>

                    <LocationFields
                      pincode={pincode} setPincode={setPincode}
                      selectedState={selectedState} setSelectedState={setSelectedState}
                      district={district} setDistrict={setDistrict}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 1: Path (branching) ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">How do you want to join Aawaaj?</h2>
                    <p className="text-white/50 text-sm font-body">Choose your path — every voice matters.</p>
                  </div>

                  <div className={cn("grid gap-4", role === "volunteer" ? "" : "")}>
                    <PathCard
                      selected={role === "volunteer"}
                      onClick={() => {
                        if (role === "volunteer") {
                          setRole(null);
                          setServeRole(null);
                          setVolunteerScope(null);
                          setCollege("");
                          setServePincode("");
                          setServeState("");
                          setServeDistrict("");
                          setSkills([]);
                          setAboutSelf("");
                        } else {
                          setRole("volunteer");
                        }
                      }}
                      icon={<ChevronRight className="w-6 h-6 text-white" />}
                      title="I want to Serve and Lead"
                      desc="Lead change on the ground. Represent your district, campus, or community."
                    />
                    {role !== "volunteer" && (
                      <PathCard
                        selected={role === "victim"}
                        onClick={() => {
                          if (role === "victim") {
                            setRole(null);
                            setProblemDesc("");
                          } else {
                            setRole("victim");
                            setServeRole(null);
                            setVolunteerScope(null);
                          }
                        }}
                        icon={<Mic className="w-6 h-6 text-white" />}
                        title="I am a Victim & Need Help"
                        desc="Share your story. We'll verify, amplify, and fight for your rights."
                      />
                    )}
                  </div>

                  {/* ── Serve & Lead sub-flow ── */}
                  {role === "volunteer" && (
                    <div className="space-y-4 pt-3 border-t border-white/10">
                      <div>
                        <Label className="text-white/70 text-xs font-heading tracking-widest uppercase mb-2.5 block">
                          Choose your role
                        </Label>
                        <div className="space-y-2">
                          <ServeRoleOption
                            selected={serveRole === "regional_head"}
                            onClick={() => { setServeRole("regional_head"); setVolunteerScope(null); setCollege(""); }}
                            emoji="🗺️"
                            title="Regional Head"
                            desc="Manage your District-level problems"
                          />
                          <ServeRoleOption
                            selected={serveRole === "campus_coordinator"}
                            onClick={() => { setServeRole("campus_coordinator"); setVolunteerScope(null); setServePincode(""); setServeState(""); setServeDistrict(""); }}
                            emoji="🎓"
                            title="Campus Coordinator"
                            desc="Manage your Campus-level problems"
                          />
                          <ServeRoleOption
                            selected={serveRole === "volunteer_sub"}
                            onClick={() => { setServeRole("volunteer_sub"); setCollege(""); setServePincode(""); setServeState(""); setServeDistrict(""); }}
                            emoji="✊"
                            title="Volunteer"
                            desc="Be the backbone and make real impact"
                          />
                        </div>
                      </div>

                      {/* Regional Head → location fields */}
                      {serveRole === "regional_head" && (
                        <div className="space-y-3 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                          <Label className="text-white/70 text-xs font-heading tracking-widest uppercase block">
                            Area you want to lead
                          </Label>
                          <LocationFields
                            pincode={servePincode} setPincode={setServePincode}
                            selectedState={serveState} setSelectedState={setServeState}
                            district={serveDistrict} setDistrict={setServeDistrict}
                          />
                        </div>
                      )}

                      {/* Campus Coordinator → college search */}
                      {serveRole === "campus_coordinator" && (
                        <div className="space-y-2 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                          <Label className="text-white/70 text-xs font-heading tracking-widest uppercase block">
                            Your College / University
                          </Label>
                          <CollegeSearch value={college} onChange={setCollege} />
                          <p className="text-white/35 text-xs font-body">Start typing to search across all Indian colleges</p>
                        </div>
                      )}

                      {/* Volunteer → scope choice */}
                      {serveRole === "volunteer_sub" && (
                        <div className="space-y-3 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                          <Label className="text-white/70 text-xs font-heading tracking-widest uppercase block">
                            Where do you want to volunteer?
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => { setVolunteerScope("campus"); setServePincode(""); setServeState(""); setServeDistrict(""); }}
                              className={cn(
                                "px-4 py-3 rounded-lg border text-sm font-heading font-semibold tracking-wide transition-all",
                                volunteerScope === "campus"
                                  ? "border-saffron bg-saffron/10 text-saffron"
                                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
                              )}
                            >
                              🎓 In Campus
                            </button>
                            <button
                              type="button"
                              onClick={() => { setVolunteerScope("region"); setCollege(""); }}
                              className={cn(
                                "px-4 py-3 rounded-lg border text-sm font-heading font-semibold tracking-wide transition-all",
                                volunteerScope === "region"
                                  ? "border-saffron bg-saffron/10 text-saffron"
                                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
                              )}
                            >
                              🗺️ In Region
                            </button>
                          </div>

                          {volunteerScope === "campus" && (
                            <div className="space-y-2 pt-2">
                              <Label className="text-white/60 text-xs font-heading tracking-wide block">Your College / University</Label>
                              <CollegeSearch value={college} onChange={setCollege} />
                            </div>
                          )}

                          {volunteerScope === "region" && (
                            <div className="pt-2">
                              <LocationFields
                                pincode={servePincode} setPincode={setServePincode}
                                selectedState={serveState} setSelectedState={setServeState}
                                district={serveDistrict} setDistrict={setServeDistrict}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills multi-select dropdown */}
                      {serveRole && (
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm font-heading tracking-wide block">
                            Your Skills
                            <span className="ml-2 text-white/35 font-body font-normal text-xs">(select all that apply)</span>
                          </Label>
                          <MultiSelectSkills selected={skills} onChange={setSkills} />
                        </div>
                      )}

                      {/* About yourself (optional) */}
                      {serveRole && (
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm font-heading tracking-wide block">
                            About Yourself
                            <span className="ml-2 text-white/35 font-body font-normal text-xs">(optional — education, achievements, etc.)</span>
                          </Label>
                          <Textarea
                            value={aboutSelf}
                            onChange={(e) => setAboutSelf(e.target.value)}
                            placeholder="E.g. B.Tech final year from IIT Delhi, NSS volunteer, led campus anti-ragging campaign, passionate about RTI activism…"
                            rows={4}
                            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 resize-none text-sm leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conditional victim fields */}
                  {role === "victim" && (
                    <div className="pt-2 border-t border-white/10">
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Describe your situation *
                        <span className="ml-2 text-white/35 font-body font-normal text-xs">(all details are fully confidential)</span>
                      </Label>
                      <Textarea
                        value={problemDesc}
                        onChange={(e) => setProblemDesc(e.target.value)}
                        placeholder="Tell us what happened. Include any relevant dates, names of institutions, and what outcome you need. Your story will be verified before any action is taken."
                        rows={6}
                        className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 resize-none text-sm leading-relaxed"
                      />
                      <p className="text-white/35 text-xs font-body mt-2 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-saffron shrink-0" />
                        Your response is encrypted and only accessible to verified Aawaaj legal heads.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Recognition ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Recognition & Verification</h2>
                    <p className="text-white/50 text-sm font-body">Help us know you better and reward great work.</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Recommended by
                        <span className="ml-2 text-white/35 font-body font-normal text-xs">(name of existing Aawaaj member)</span>
                      </Label>
                      <Input
                        value={recommendedBy}
                        onChange={(e) => setRecommendedBy(e.target.value)}
                        placeholder="e.g. Hardik Gajraj or leave blank"
                        className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                      <p className="text-saffron/70 text-xs font-body mt-1.5 flex items-center gap-1.5">
                        ★ Used for the Best Volunteers Award — referrals are tracked.
                      </p>
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Date of Birth *
                      </Label>
                      <DobPicker value={dob} onChange={setDob} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review & Submit ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Ready to Roar?</h2>
                    <p className="text-white/50 text-sm font-body">Review your details before joining the movement.</p>
                  </div>

                  {/* Summary cards */}
                  <div className="space-y-3">
                    {[
                      { label: "Name", value: name },
                      { label: "Email", value: email },
                      { label: "WhatsApp", value: whatsapp ? `+91 ${whatsapp}` : "—" },
                      { label: "Location", value: [district, selectedState, pincode].filter(Boolean).join(", ") || "—" },
                      { label: "Path", value: role === "volunteer" ? "I want to Serve and Lead" : role === "victim" ? "Seeking Help" : "—" },
                      ...(role === "volunteer" && serveRole ? [{
                        label: "Role",
                        value: serveRole === "regional_head" ? "Regional Head" : serveRole === "campus_coordinator" ? "Campus Coordinator" : "Volunteer"
                      }] : []),
                      ...(role === "volunteer" && serveRole === "regional_head" && serveDistrict ? [{ label: "Serve Area", value: [serveDistrict, serveState].filter(Boolean).join(", ") }] : []),
                      ...(role === "volunteer" && (serveRole === "campus_coordinator" || (serveRole === "volunteer_sub" && volunteerScope === "campus")) && college ? [{ label: "College", value: college }] : []),
                      ...(role === "volunteer" && serveRole === "volunteer_sub" && volunteerScope === "region" && serveDistrict ? [{ label: "Volunteer Area", value: [serveDistrict, serveState].filter(Boolean).join(", ") }] : []),
                      ...(role === "volunteer" && skills.length > 0 ? [{ label: "Skills", value: skills.join(", ") }] : []),
                      ...(role === "volunteer" && aboutSelf.trim() ? [{ label: "About", value: aboutSelf.trim().slice(0, 120) + (aboutSelf.trim().length > 120 ? "…" : "") }] : []),
                      { label: "Recommended By", value: recommendedBy || "—" },
                      { label: "Date of Birth", value: dob ? format(dob, "PPP") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-white/8 last:border-0">
                        <span className="text-white/45 text-xs font-heading tracking-wide uppercase">{label}</span>
                        <span className="text-white text-sm font-body text-right max-w-[60%] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pledge */}
                  <div className="bg-primary/60 border border-white/10 rounded-xl p-5 text-center">
                    <div className="text-saffron text-3xl mb-2">✊</div>
                    <p className="text-white/70 text-sm font-body italic leading-relaxed">
                      "I pledge to uphold truth, amplify unheard voices, and serve the movement with integrity."
                    </p>
                  </div>

                  {/* Consent Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => setConsent(!consent)}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200",
                        consent
                          ? "bg-saffron border-saffron"
                          : "border-white/30 bg-transparent group-hover:border-white/50"
                      )}
                    >
                      {consent && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-white/70 text-sm font-body leading-relaxed">
                      I confirm that the information provided is accurate and I consent to receive messages on my given contact details (WhatsApp, Email) for coordination and updates related to Aawaaj Movement. *
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Navigation footer */}
            <div className="px-4 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 text-white/50 hover:text-white font-heading text-sm tracking-wide transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  disabled={!stepValid[step]}
                  onClick={() => setStep((s) => s + 1)}
                  className={cn(
                    "flex items-center gap-2 font-heading font-bold text-sm px-7 py-3 rounded-sm tracking-wide transition-all duration-200",
                    stepValid[step]
                      ? "bg-saffron hover:bg-saffron-dark text-white shadow-saffron hover:-translate-y-0.5"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !consent}
                  className={cn(
                    "flex items-center gap-2 font-heading font-bold text-sm px-8 py-3 rounded-sm tracking-wide transition-all duration-200",
                    consent && !submitting
                      ? "bg-saffron hover:bg-saffron-dark text-white shadow-saffron hover:-translate-y-0.5"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    <><Volume2 className="w-4 h-4" /> Join the Roar</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5 text-white/35 text-xs font-body">
            <Shield className="w-3.5 h-3.5 text-saffron/60" />
            Your data is 100% confidential and never sold to third parties.
          </div>
        </div>
      </main>
      
      {/* Universal Footer */}
      <FooterSection />
    </div>
  );
}
