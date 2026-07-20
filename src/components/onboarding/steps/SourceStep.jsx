import React from 'react';
import { Music2, PlaySquare, Tv, AtSign, Camera, Search, Users } from 'lucide-react';
import { StepHeader, ContinueButton, IconOptionRow } from '../primitives';

const SOURCES = [
  { value: 'app_store', label: 'App Store', icon: <Search size={16} color="#fff" />, bg: '#2d7fff' },
  { value: 'tiktok', label: 'TikTok', icon: <Music2 size={16} color="#fff" />, bg: '#000000' },
  { value: 'youtube', label: 'YouTube', icon: <PlaySquare size={16} color="#fff" />, bg: '#e11d2e' },
  { value: 'tv', label: 'TV', icon: <Tv size={16} color="#fff" />, bg: '#475569' },
  { value: 'x', label: 'X', icon: <AtSign size={16} color="#fff" />, bg: '#0b0b0f' },
  { value: 'instagram', label: 'Instagram', icon: <Camera size={16} color="#fff" />, bg: '#c2185b' },
  { value: 'google', label: 'Google', icon: <Search size={16} color="#fff" />, bg: '#10b981' },
  { value: 'friend', label: 'Friend or family', icon: <Users size={16} color="#fff" />, bg: '#8b5cf6' },
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
