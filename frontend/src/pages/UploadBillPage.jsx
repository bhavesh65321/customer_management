import React from "react";
import ShopLayout from "../components/layout/ShopLayout";

export default function UploadBillPage() {
  return (
    <ShopLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Upload Bill</h1>
        <p className="text-gray-600">Upload an existing bill photo or PDF and we will extract the data for you. This feature will be available soon.</p>
      </div>
    </ShopLayout>
  );
}
