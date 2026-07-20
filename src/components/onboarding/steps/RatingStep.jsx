import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { StepHeader, ContinueButton, C, glass } from '../primitives';
import { play } from '../../../lib/sounds';

const TESTIMONIALS = [
  { quote: "Finally felt like I had an actual plan instead of just guessing what to study.", name: 'Priya, Junior' },
  { quote: "My SAT score went up 140 points in two months of using this.", name: 'Marcus, Senior' },
  { quote: "The pathway diagnostic actually helped me figure out PA school was right for me.", name: 'Jordan, Sophomore' },
];

export function RatingStep({ value, onChange, onNext }) {
  const [hover, setHover] = useState(0);
  return (
    <>
      <StepHeader title="Give us a rating" subtitle="MedSchoolPrep was made for students like you." />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => { onChange(i); play('select'); }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Star size={30} fill={(hover || value) >= i ? '#f59e0b' : 'none'} color={(hover || value) >= i ? '#f59e0b' : C.t4} />
            </motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={glass({ padding: 14, backdropFilter: 'none' })}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />)}</div>
              <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.5, margin: '0 0 6px', fontStyle: 'italic' }}>"{t.quote}"</p>
              <div style={{ fontSize: 11, color: C.t4, fontWeight: 600 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
      <ContinueButton disabled={!value} onClick={onNext}>Continue</ContinueButton>
    </>
  );
}
