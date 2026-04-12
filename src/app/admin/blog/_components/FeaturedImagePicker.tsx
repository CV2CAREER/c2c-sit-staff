"use client"
import React, { useState, useEffect } from 'react';
import { RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface FeaturedImagePickerProps {
  onImageChange: (base64: string | null) => void;
  initialImage?: string | null;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const FeaturedImagePicker: React.FC<FeaturedImagePickerProps> = ({ onImageChange, initialImage }) => {
  const [preview, setPreview] = useState<string | null>(initialImage || null);

  useEffect(() => {
    if (initialImage) {
      setPreview(initialImage);
    }
  }, [initialImage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }

    try {
      const base64 = await toBase64(file);
      setPreview(URL.createObjectURL(file));
      onImageChange(base64);
    } catch {
      toast.error("Failed to process image.");
    }
  };

  const clearImage = () => {
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div className="flex flex-col mt-4">
      <p className="text-sm font-medium text-gray-700 mb-2">Featured Image</p>
      
      {preview ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
          <Image 
            src={preview} 
            alt="Featured Preview" 
            fill 
            className="object-cover"
            unoptimized={preview.startsWith('blob:') || preview.startsWith('data:')}
          />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-10"
            title="Remove Image"
          >
            <RiCloseLine />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <RiImageAddLine className="text-3xl text-gray-400 mb-2" />
          <span className="text-xs text-gray-500">Click to upload featured image</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      )}
      <p className="text-[10px] text-gray-400 mt-1">Recommended: 1200x630 (1.91:1 aspect ratio)</p>
    </div>
  );
};

export default FeaturedImagePicker;
