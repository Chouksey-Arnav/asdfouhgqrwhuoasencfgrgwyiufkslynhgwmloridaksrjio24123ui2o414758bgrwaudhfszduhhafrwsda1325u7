import React from 'react';
import { Bell } from 'lucide-react';
import { StepHeader, ContinueButton, TextLink, C } from '../primitives';
import { play } from '../../../lib/sounds';

export function NotificationsStep({ onNext }) {
  async function allow() {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch { /* unsupported or blocked — fine, just continue */ }
    play('bell');
    onNext();
  }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 24 }}>
        <div style={{ width: 68, height: 68, borderRadius: 20, background: C.amberDim, border: `1px solid rgba(245,158,11,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={32} color={C.amberL} />
        </div>
      </div>
      <StepHeader title="Reach your goals with reminders" subtitle="We'll nudge you for study sessions, streaks, and upcoming deadlines — never spam." />
      <div style={{ flex: 1 }} />
      <div>
        <ContinueButton onClick={allow}>Allow Notifications</ContinueButton>
        <TextLink onClick={onNext}>Not now</TextLink>
      </div>
    </>
  );
}
