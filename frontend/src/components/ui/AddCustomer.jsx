import React, { useState, useEffect } from "react";
import InlineError from "./InlineError";
import { useLanguage } from "../../context/LanguageContext";

export default function AddCustomerDrawer({ isOpen, onClose, onAdd, initialData, error, onClearError }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    fatherName: "",
    phonePrimary: "",
    phoneSecondary: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    gender: "Male",
    country: "India",
  });

  // Update formData when initialData changes (i.e., when editing an existing customer)
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || "",
        fatherName: initialData.father_name || "",
        phonePrimary: initialData.primary_phone || "",
        phoneSecondary: initialData.secondary_phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        city: initialData.city || "",
        pincode: initialData.pincode || "",
        gender: initialData.gender || "Male",
        country: initialData.country || "India",
      });
    } else if (!isOpen) {
      setFormData({
        name: "",
        fatherName: "",
        phonePrimary: "",
        phoneSecondary: "",
        email: "",
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
    if (onClearError) onClearError();
  };

  const handleSubmit = () => {
    const result = onAdd(formData);
    if (result && typeof result.then === "function") {
      result.then(() => onClose()).catch(() => {});
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white shadow-lg z-50 border-l border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {initialData ? t("customer.editCustomer") : t("customer.addNew")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <InlineError message={error} onDismiss={onClearError} />
        )}

        {/* Form */}
        <div className="space-y-4 text-sm text-gray-700">
          {/* ... all your input fields unchanged, using formData and handleChange ... */}
          {/* (Keep the input fields as you already have) */}
          {/* Example: */}
          <div>
            <label className="block mb-1 font-medium">{t("form.name")}</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterName")}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.fatherName")}</label>
            <input
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterFatherName")}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.primaryPhone")}</label>
            <input
              name="phonePrimary"
              value={formData.phonePrimary}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterPhone")}
              type="tel"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.secondaryPhone")}</label>
            <input
              name="phoneSecondary"
              value={formData.phoneSecondary}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterAlternatePhone")}
              type="tel"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.email")}</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterEmail")}
              type="email"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.fullAddress")}</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterAddress")}
            ></textarea>
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.city")}</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterCity")}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.pincode")}</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("form.enterPincode")}
              type="number"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.gender")}</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Male">{t("form.male")}</option>
              <option value="Female">{t("form.female")}</option>
              <option value="Other">{t("form.other")}</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">{t("form.country")}</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="India">{t("form.india")}</option>
              <option value="USA">{t("form.usa")}</option>
              <option value="UK">{t("form.uk")}</option>
              <option value="Canada">{t("form.canada")}</option>
              <option value="Other">{t("form.other")}</option>
            </select>
          </div>
          {/* Repeat for other fields */}
          {/* ... */}
        </div>

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors"
          >
            {initialData ? t("customer.updateCustomer") : t("customer.addCustomer")}
          </button>
        </div>
      </div>
    </div>
  );
}
