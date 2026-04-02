import React from 'react';
import type { LayoutProps } from './types';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) =>
    `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

/**
 * HeroLayout — Full-page hero section with optional detail cards below.
 *
 * DSL usage:
 *   LAYOUT|layout:hero
 *   stat|Main Headline|$4.2M|↑12%|green|Subtitle text|+$450K
 *   info-card|chart|Section Title|Description body text|Learn More
 *   info-card|shield|Another Section|More details here|Get Started
 *
 * The FIRST card becomes the hero (large, centered).
 * Remaining cards render as a horizontal row of feature tiles below.
 */
export const HeroLayout: React.FC<LayoutProps> = ({ cards, badge }) => {
    if (!cards || cards.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-white/40 font-data">
                No content for hero layout
            </div>
        );
    }

    const heroCard = cards[0];
    const featureCards = cards.slice(1);

    return (
        <div className="flex flex-col h-full gap-8">
            {/* Hero section */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center text-center py-12 px-8">
                {badge && (
                    <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-data font-medium tracking-wider uppercase mb-6"
                        style={{ background: getColor(15), color: getColor(90) }}
                    >
                        {badge}
                    </span>
                )}
                {(heroCard.label || heroCard.title || heroCard.name) && (
                    <h1 className="text-4xl md:text-5xl font-hero font-bold mb-4" style={{ color: 'white' }}>
                        {heroCard.label || heroCard.title || heroCard.name}
                    </h1>
                )}
                {(heroCard.value || heroCard.body) && (
                    <p className="text-5xl md:text-6xl font-hero font-black mb-4" style={{ color: C }}>
                        {heroCard.value || heroCard.body}
                    </p>
                )}
                {(heroCard.subtitle || heroCard.detail || heroCard.summary) && (
                    <p className="text-lg font-voice max-w-2xl" style={{ color: getColor(60) }}>
                        {heroCard.subtitle || heroCard.detail || heroCard.summary}
                    </p>
                )}
                {heroCard.trend && (
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm font-data" style={{
                            color: heroCard.trend.startsWith('↑') ? '#4ade80' : heroCard.trend.startsWith('↓') ? '#f87171' : getColor(50)
                        }}>
                            {heroCard.trend}
                        </span>
                        {heroCard.change && (
                            <span className="text-sm font-data" style={{ color: getColor(50) }}>
                                {heroCard.change}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Feature tiles */}
            {featureCards.length > 0 && (
                <div className="flex-1 min-h-0 overflow-auto">
                    <div
                        className="grid gap-4 px-2"
                        style={{
                            gridTemplateColumns: `repeat(${Math.min(featureCards.length, 4)}, 1fr)`,
                        }}
                    >
                        {featureCards.map((card, i) => (
                            <div
                                key={i}
                                className="p-5 rounded-xl"
                                style={{
                                    background: 'var(--theme-card-bg)',
                                    border: '1px solid var(--theme-card-border)',
                                    backdropFilter: 'blur(var(--theme-card-blur))',
                                    animation: 'card-enter 0.5s ease both',
                                    animationDelay: `${(i + 1) * 100}ms`,
                                }}
                            >
                                {(card.title || card.label || card.name) && (
                                    <h3 className="font-data text-base font-bold mb-2" style={{ color: getColor(90) }}>
                                        {card.title || card.label || card.name}
                                    </h3>
                                )}
                                {(card.body || card.detail || card.value || card.summary) && (
                                    <p className="font-voice text-sm leading-relaxed" style={{ color: getColor(60) }}>
                                        {card.body || card.detail || card.value || card.summary}
                                    </p>
                                )}
                                {card.cta && (
                                    <p className="mt-3 text-xs font-data font-semibold" style={{ color: C }}>
                                        {card.cta} →
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroLayout;
