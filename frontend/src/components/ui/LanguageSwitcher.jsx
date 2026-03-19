import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { LanguageIcon } from "@heroicons/react/24/outline";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (lang) => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch language"
      >
        <LanguageIcon className="h-5 w-5 text-gray-500" />
        <span>{language === "hi" ? "हिंदी" : "English"}</span>
      </button>
      {open && (
        <ul
          className="absolute right-0 mt-1 py-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50"
          role="listbox"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={language === "en"}
              onClick={() => toggle("en")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === "en" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
            >
              English
            </button>
          </li>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={language === "hi"}
              onClick={() => toggle("hi")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === "hi" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
            >
              हिंदी
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
