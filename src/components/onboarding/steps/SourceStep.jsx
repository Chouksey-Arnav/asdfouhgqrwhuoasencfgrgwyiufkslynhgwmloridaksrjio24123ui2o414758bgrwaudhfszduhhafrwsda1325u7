import React from 'react';
import { StepHeader, ContinueButton, IconOptionRow } from '../primitives';
import { AppStoreMark, TikTokMark, YouTubeMark, TVMark, XMark, InstagramMark, GoogleMark, FriendsMark } from '../brand';

// Each source now shows its actual brand mark (drawn inline in brand.jsx) on a
// brand-correct tile, instead of the old generic lucide placeholders.
const SOURCES = [
  { value: 'app_store', label: 'App Store', icon: <AppStoreMark />, bg: 'linear-gradient(135deg,#1d6ff2,#19c8fa)' },
  { value: 'tiktok', label: 'TikTok', icon: <TikTokMark />, bg: '#010101' },
  { value: 'youtube', label: 'YouTube', icon: <YouTubeMark />, bg: '#202020' },
  { value: 'tv', label: 'TV', icon: <TVMark />, bg: 'linear-gradient(135deg,#475569,#334155)' },
  { value: 'x', label: 'X', icon: <XMark />, bg: '#0b0b0f' },
  { value: 'instagram', label: 'Instagram', icon: <InstagramMark />, bg: 'linear-gradient(45deg,#f9ce34 0%,#ee2a7b 48%,#6228d7 100%)' },
  { value: 'google', label: 'Google', icon: <GoogleMark />, bg: '#ffffff' },
  { value: 'friend', label: 'Friend or family', icon: <FriendsMark />, bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
];

export function SourceStep({ value, onChange, onNext }) {
  return (
    <>
      <StepHeader title="Where did you hear about us?" subtitle="This helps us understand how students find MedSchoolPrep." />
      <div style={{ flex: 1 }}>
        {SOURCES.map(s => (
          <IconOptionRow key={s.value} selected={value === s.value} onClick={() => onChange(s.value)} iconBg={s.bg} icon={s.icon} label={s.label} />
        ))}
      </div>
      <ContinueButton disabled={!value} onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
