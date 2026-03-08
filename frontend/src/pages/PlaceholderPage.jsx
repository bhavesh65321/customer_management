import React from "react";
import BackButton from "../components/ui/BackButton";

export default function PlaceholderPage({ title = "Coming soon" }) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <BackButton to="/home" label="Back to Home" />
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">This section is not implemented yet.</p>
        </div>
      </div>
    </div>
  );
}
