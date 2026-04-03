'use client';

import { useState } from 'react';
import { ArrowRight, Building2, Users, Sparkles, TrendingUp } from 'lucide-react';
import { EmployerDashboard } from '@/components/templates/EmployerDashboard';

export function WelcomeLanding() {
  const [entered, setEntered] = useState(false);

  if (entered) {
    return <EmployerDashboard onBack={() => setEntered(false)} />;
  }

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden grid grid-rows-[auto_1fr_auto] p-3 md:p-6 lg:p-8 relative" style={{ background: '#09090b' }}>
      {/* Left-centre glow — matches EmployerDashboard background (Figma 3509:46544) */}
      <div className="absolute pointer-events-none" style={{
        width: 712, height: 712,
        top: -37,
        left: 'calc(50% - 720px)',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center, rgba(0,130,75,0.72) 0%, rgba(0,85,50,0.38) 40%, transparent 70%)',
        filter: 'blur(206px)',
        zIndex: 0,
      }} />
      {/* Bottom-right glow */}
      <div className="absolute pointer-events-none" style={{
        width: 1182, height: 1182,
        top: 861,
        left: 'calc(50% + 608px)',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center, rgba(0,110,62,0.55) 0%, rgba(0,68,36,0.22) 45%, transparent 70%)',
        filter: 'blur(356px)',
        zIndex: 0,
      }} />
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1ed25e, #51a2ff)' }}>
            <Building2 size={16} className="text-white" />
          </div>
          <span className="text-white/80 font-semibold text-lg tracking-tight">PIF Employer</span>
        </div>
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-white/60 uppercase border border-white/10">
          AI POWERED
        </span>
      </header>

      {/* Content */}
      <main className="relative z-10 flex items-center">
        <div className="max-w-2xl space-y-8">
          {/* Badge */}
          <div className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-[#1ed25e] border" style={{ background: 'rgba(30,210,94,0.08)', borderColor: 'rgba(30,210,94,0.2)' }}>
              <Sparkles size={12} />
              Intelligent Hiring Platform
            </span>
          </div>

          {/* Title */}
          <h1 className="animate-slide-in-left text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight text-white font-bold" style={{ animationDelay: '0.2s' }}>
            Hire smarter{' '}
            <span style={{ color: '#1ed25e' }}>with AI</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-in-left text-base sm:text-lg text-white/50 max-w-lg leading-relaxed" style={{ animationDelay: '0.35s' }}>
            Post jobs, review applicants, and get hiring insights — all through a conversational AI assistant built for employers.
          </p>

          {/* Feature pills */}
          <div className="animate-slide-in-left flex flex-wrap gap-3" style={{ animationDelay: '0.45s' }}>
            {[
              { icon: Building2, label: 'Job Posting Wizard' },
              { icon: Users, label: 'Applicant Review' },
              { icon: TrendingUp, label: 'Hiring Intelligence' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white/50" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={12} className="text-white/40" />
                {label}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="animate-slide-in-left" style={{ animationDelay: '0.55s' }}>
            <button
              onClick={() => setEntered(true)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#1ed25e' }}
            >
              ENTER EMPLOYER DASHBOARD
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between text-[10px] sm:text-xs text-white/30 uppercase tracking-widest">
        <span>POWERED BY MOBEUS</span>
        <span>PIF EMPLOYER FLOW</span>
      </footer>
    </div>
  );
}
