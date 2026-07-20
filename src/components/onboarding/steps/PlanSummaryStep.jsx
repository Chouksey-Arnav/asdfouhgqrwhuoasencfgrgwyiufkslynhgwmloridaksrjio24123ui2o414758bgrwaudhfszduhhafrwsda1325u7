import React from 'react';
import { Clock, BookOpenCheck, Route } from 'lucide-react';
import { StepHeader, ContinueButton, RadialRing, C, glass } from '../primitives';

export function PlanSummaryStep({ profile, onNext }) {
  const dailyMins = profile.speedLevel >= 2 ? 60 : profile.speedLevel === 1 ? 40 : 25;
  const weeklyQs = profile.speedLevel >= 2 ? 120 : profile.speedLevel === 1 ? 80 : 50;
  return (
    <>
      <StepHeader title="Your daily recommendation" subtitle="You can always adjust this later in Settings." />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 22 }}>
          <RadialRing pct={0.7} color={C.blue} size={88}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{dailyMins}m</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>daily</div>
            </div>
          </RadialRing>
          <RadialRing pct={0.55} color={C.green} size={88}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{weeklyQs}</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>Qs/week</div>
            </div>
          </RadialRing>
          <RadialRing pct={0.85} color={C.violet} size={88}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>1</div>
              <div style={{ fontSize: 8.5, color: C.t3 }}>pathway</div>
            </div>
          </RadialRing>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row icon={<Clock size={16} color={C.blueL} />} label="Daily study time" value={`${dailyMins} minutes`} />
          <Row icon={<BookOpenCheck size={16} color={C.greenL} />} label="Practice volume" value={`${weeklyQs} questions/week`} />
          <Row icon={<Route size={16} color={C.violetL} />} label="Target score" value={`${profile.targetScore} ${profile.testTrack}`} />
        </div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </>
  );
}

function Row({ icon, label, value }) {
  return (
    <div style={{ ...glass({ padding: '13px 16px' }), display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'none' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: C.s2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: C.t2, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{value}</span>
    </div>
  );
}
