import React, { useState, useEffect } from "react";

export default function AddCustomerDrawer({ isOpen, onClose, onAdd, initialData }) {
  const [formData, setFormData] = useState({
    name: "",
    father_name: "",
    phonePrimary: "",
    phoneSecondary: "",
    address: "",
    city: "",
    pincode: "",
    gender: "Male",
    country: "India",
  });

  // Update formData when initialData changes (i.e., when editing an existing customer)
  useEffect(() => {
    if (isOpen && initialData) {
      debugger;
      setFormData({
        name: initialData.name || "",
        fatherName: initialData.father_name || "",
        phonePrimary: initialData.primary_phone || "",
        phoneSecondary: initialData.secondary_phone || "",
        address: initialData.address || "",
        city: initialData.city || "",
        pincode: initialData.pincode || "",
        gender: initialData.gender || "Male",
        country: initialData.country || "India",
      });
    } else if (!isOpen) {
      // Reset when drawer closes
      setFormData({
        name: "",
        father_name: "",
        phone_primary: "",
        phone_secondary: "",
        address: "",
        city: "",
        pincode: "",
        gender: "Male",
        country: "India",
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onAdd(formData); // Send form data to parent (either for add or update)
    onClose();
    // formData reset handled by useEffect when drawer closes
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white shadow-lg z-50 border-l border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {initialData ? "Edit Customer" : "Add New Customer"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 text-sm text-gray-700">
          {/* ... all your input fields unchanged, using formData and handleChange ... */}
          {/* (Keep the input fields as you already have) */}
          {/* Example: */}
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Father's Name</label>
            <input
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter father's name"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Primary Phone</label>
            <input
              name="phonePrimary"
              value={formData.phonePrimary}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
              type="tel"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Secondary Phone</label>
            <input
              name="phoneSecondary"
              value={formData.phoneSecondary}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter alternate phone"
              type="tel"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Full Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full address"
            ></textarea>
          </div>
          <div>
            <label className="block mb-1 font-medium">City</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Pincode</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter pincode"
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Country</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>India</option>
              <option>USA</option>
              <option>UK</option>
              <option>Canada</option>
              <option>Other</option>
            </select>
          </div>
          {/* Repeat for other fields */}
          {/* ... */}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors"
          >
            {initialData ? "Update Customer" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
