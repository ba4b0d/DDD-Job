import { useState, useRef, useCallback } from 'react';
import { uploadProductImage } from '../lib/api';

export default function useProductImageUpload(initialImageUrl = null) {
  const [imagePreview, setImagePreview] = useState(initialImageUrl);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = useCallback((e) => {
    handleFileSelect(e.target.files?.[0]);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImageUpload = useCallback(async (productId) => {
    if (!imageFile || !productId) return;
    setUploading(true);
    try {
      await uploadProductImage(productId, imageFile);
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [imageFile]);

  return {
    imagePreview,
    imageFile,
    uploading,
    dragOver,
    fileInputRef,
    handleFileInput,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleRemoveImage,
    handleImageUpload,
    hasNewImage: !!imageFile,
  };
}
