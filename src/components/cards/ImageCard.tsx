import React from 'react';
import { SmartImage } from '@/components/ui/SmartImage';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface ImageCardProps {
    imageUrl?: string;
    caption?: string;
    subtitle?: string;
}

export const ImageCard: React.FC<ImageCardProps> = ({ imageUrl, caption, subtitle }) => (
    <div className="relative h-full overflow-hidden w-full">
        {imageUrl ? (
            <SmartImage assetId={imageUrl} alt={caption || ''} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${getColor(3)}` }}>
                <span className="font-data text-base uppercase" style={{ color: `${getColor(25)}` }}>Image</span>
            </div>
        )}
        {(caption || subtitle) && (
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <span className="font-data text-base md:text-base font-bold text-white">{caption}</span>
                {subtitle && <p className="font-voice text-base md:text-base text-white/70 leading-tight">{subtitle}</p>}
            </div>
        )}
    </div>
);

export default ImageCard;

