import React from 'react';
import { ItemImage } from '../types/models';
import { getPrimaryImage, getCategoryPlaceholder } from '../lib/imageUtils';

interface ItemImageDisplayProps {
  images: ItemImage[];
  primaryImageId?: string;
  category: string;
  itemName: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

export function ItemImageDisplay({
  images,
  primaryImageId,
  category,
  itemName,
  size = 'medium',
  className = '',
  onClick,
}: ItemImageDisplayProps) {
  const primaryImage = getPrimaryImage(images, primaryImageId);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  if (primaryImage) {
    return (
      <img
        src={primaryImage.dataUrl}
        alt={itemName}
        className={`item-image ${sizeClasses[size]} ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        title={itemName}
      />
    );
  }

  // Show category placeholder if no images
  const placeholder = getCategoryPlaceholder(category);

  return (
    <div
      className={`item-image-placeholder ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={`${itemName} (No image)`}
    >
      {placeholder}
    </div>
  );
}

interface ItemThumbnailProps {
  images: ItemImage[];
  primaryImageId?: string;
  category: string;
  itemName: string;
  onClick?: () => void;
}

export function ItemThumbnail({
  images,
  primaryImageId,
  category,
  itemName,
  onClick,
}: ItemThumbnailProps) {
  return (
    <ItemImageDisplay
      images={images}
      primaryImageId={primaryImageId}
      category={category}
      itemName={itemName}
      size="small"
      onClick={onClick}
    />
  );
}

interface ItemCardImageProps {
  images: ItemImage[];
  primaryImageId?: string;
  category: string;
  itemName: string;
  onClick?: () => void;
}

export function ItemCardImage({
  images,
  primaryImageId,
  category,
  itemName,
  onClick,
}: ItemCardImageProps) {
  return (
    <ItemImageDisplay
      images={images}
      primaryImageId={primaryImageId}
      category={category}
      itemName={itemName}
      size="large"
      className="card-image"
      onClick={onClick}
    />
  );
}
