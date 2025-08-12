import React, { useState, useRef } from 'react';
import { ItemImage } from '../types/models';
import { processImageFile, IMAGE_CONFIG } from '../lib/imageUtils';

interface ImageUploadProps {
  images: ItemImage[];
  onImagesChange: (_images: ItemImage[]) => void;
  primaryImageId?: string;
  onPrimaryImageChange: (_imageId: string) => void;
  maxImages?: number;
}

export function ImageUpload({
  images,
  onImagesChange,
  primaryImageId,
  onPrimaryImageChange,
  maxImages = IMAGE_CONFIG.maxImagesPerItem,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const newImages: ItemImage[] = [];

    for (const file of filesToProcess) {
      try {
        const processedImage = await processImageFile(file);
        newImages.push(processedImage);
      } catch (error) {
        alert(`Error processing ${file.name}: ${error}`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);

      // Set first uploaded image as primary if no primary exists
      if (!primaryImageId && newImages.length > 0) {
        onPrimaryImageChange(newImages[0].id);
      }
    }

    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);

    // If removing primary image, set new primary
    if (primaryImageId === imageId && updatedImages.length > 0) {
      onPrimaryImageChange(updatedImages[0].id);
    }
  };

  const setPrimaryImage = (imageId: string) => {
    onPrimaryImageChange(imageId);
  };

  return (
    <div className="image-upload-container">
      <label>Product Images</label>

      {/* Upload Area */}
      <div
        className={`image-dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={IMAGE_CONFIG.allowedTypes.join(',')}
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-spinner">
            <div className="spinner"></div>
            <p>Processing images...</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📸</div>
            <p>
              <strong>Click or drag images here</strong>
            </p>
            <p className="upload-hint">
              JPEG, PNG, WebP • Max {IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB each • Up to{' '}
              {maxImages} images
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map(image => (
            <div
              key={image.id}
              className={`image-preview ${primaryImageId === image.id ? 'primary' : ''}`}
            >
              <img src={image.dataUrl} alt={image.name} />

              <div className="image-overlay">
                <button
                  type="button"
                  className={`primary-btn ${primaryImageId === image.id ? 'active' : ''}`}
                  onClick={() => setPrimaryImage(image.id)}
                  title="Set as primary image"
                >
                  {primaryImageId === image.id ? '⭐' : '☆'}
                </button>

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeImage(image.id)}
                  title="Remove image"
                >
                  ✕
                </button>
              </div>

              <div className="image-info">
                <div className="image-name">{image.name}</div>
                {primaryImageId === image.id && <div className="primary-badge">Primary</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="upload-stats">
          {images.length} / {maxImages} images
        </div>
      )}
    </div>
  );
}
