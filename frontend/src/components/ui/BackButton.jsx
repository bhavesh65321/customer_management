import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function BackButton({ to, label = "Back", className = "" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to != null) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center text-gray-700 hover:text-gray-900 ${className}`}
      aria-label={label}
    >
      <ArrowLeftIcon className="h-5 w-5 mr-2 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
