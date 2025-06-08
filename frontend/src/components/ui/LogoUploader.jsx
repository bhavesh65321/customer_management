// File: src/components/ui/LogoUploader.jsx
import React, { useState, useEffect } from 'react';

export default function LogoUploader({ onChange }) {
  const [logo, setLogo] = useState(null);
  const [shopName, setShopName] = useState(() => localStorage.getItem('shopName') || '');

  useEffect(() => {
    const saved = localStorage.getItem('shopLogo');
    if (saved) setLogo(saved);
  }, []);

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      localStorage.setItem('shopLogo', reader.result);
      onChange({ logo: reader.result, shopName });
    };
    reader.readAsDataURL(file);
  };

  const handleNameChange = e => {
    setShopName(e.target.value);
    localStorage.setItem('shopName', e.target.value);
    onChange({ logo, shopName: e.target.value });
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-48 h-48 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        {logo ? (
          <img src={logo} alt="Shop Logo" className="object-contain w-full h-full" />
        ) : (
          <span className="text-gray-400">No Logo</span>
        )}
      </div>
      <button
        className="mt-2 text-sm text-blue-600 hover:underline"
        onClick={() => document.getElementById('logoInput').click()}
      >
        {logo ? 'Change Logo' : 'Upload Logo'}
      </button>
      <input
        id="logoInput"
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <input
        type="text"
        placeholder="Shop Name"
        value={shopName}
        onChange={handleNameChange}
        className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md text-center"
      />
    </div>
  );
}