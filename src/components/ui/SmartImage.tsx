import React from 'react';

/**
 * Minimal SmartImage for the starter template.
 * The Small Lift version integrates with Mobeus AI for image generation.
 * This version is a simple <img> wrapper — images are expected to be URLs.
 */
interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetId?: string;
  showPromptOnMissing?: boolean;
  onRegenerate?: () => void;
  fallbackAssetId?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  assetId,
  showPromptOnMissing,
  onRegenerate,
  fallbackAssetId,
  alt,
  ...imgProps
}) => {
  const src = assetId?.startsWith('http') || assetId?.startsWith('/') ? assetId : undefined;

  if (!src) {
    return (
      <div
        className="flex items-center justify-center h-full w-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <span className="text-sm uppercase opacity-25">{alt || 'Image'}</span>
      </div>
    );
  }

  return <img src={src} alt={alt || ''} {...imgProps} />;
};

export default SmartImage;
