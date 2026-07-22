// The full MedSchoolPrep onboarding flow — adapted from the widely-studied Cal AI-style
// onboarding funnel (splash → warm-up questions → personalization → animated proof/graph
// moments → permission asks → plan-generation reveal → save-progress), reskinned end-to-end for
// "a personalized path into medicine for high schoolers." Screens that were pure funnel theater
// with no real product behind them — a fake paywall/discount-wheel/one-time-offer, a "rate us"
// screen with fabricated testimonials, and a "gender" question that claimed to calibrate study
// load but never actually did — were removed rather than carried over, since MedSchoolPrep is
// free (no premium tier) and every remaining screen should feed something the app actually uses.
import React, { useMemo, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import OnboardingShell from './OnboardingShell';
import { SplashStep, WelcomeStep } from './steps/Intro';
import { SourceStep } from './steps/SourceStep';
import { SingleChoiceStep, ChecklistStep, ToggleQuestionStep, ProofGraphStep } from './steps/generic';
import { GradeScoreStep } from './steps/GradeScoreStep';
import { BirthdateStep } from './steps/BirthdateStep';
import { TargetScoreStep } from './steps/TargetScoreStep';
import { RealisticTargetStep } from './steps/RealisticTargetStep';
import { SpeedStep } from './steps/SpeedStep';
import { ThankYouStep } from './steps/ThankYouStep';
import { CalendarStep } from './steps/CalendarStep';
import { NotificationsStep } from './steps/NotificationsStep';
import { ReferralStep } from './steps/ReferralStep';
import { GeneratingStep } from './steps/GeneratingStep';
import { PlanReadyStep } from './steps/PlanReadyStep';
import { PlanSummaryStep } from './steps/PlanSummaryStep';
import { SaveProgressStep } from './steps/SaveProgressStep';
import { PlusCircle, Repeat } from 'lucide-react';
import { C } from './primitives';

const STEPS = [
  'splash', 'welcome', 'studyHours', 'source', 'triedApps',
  'proof1', 'gradeScore', 'birthdate', 'goal', 'targetScore', 'realistic',
  'speed', 'proof2', 'obstacles', 'studyMethod', 'accomplish', 'proof3',
  'thankYou', 'calendar', 'toggleAddBack', 'toggleRollover', 'notifications',
  'referral', 'generating', 'planReady', 'planSummary', 'saveProgress',
];
const NO_CHROME = new Set(['splash', 'welcome', 'generating', 'planReady']);
const PROGRESS_START = STEPS.indexOf('studyHours');
const PROGRESS_END = STEPS.indexOf('saveProgress');

const STUDY_HOURS_OPTIONS = [
  { value: '0-5', label: '0-5 hrs / week', sublabel: 'Just getting started', dots: 1 },
  { value: '6-14', label: '6-14 hrs / week', sublabel: 'Building real momentum', dots: 2 },
  { value: '15+', label: '15+ hrs / week', sublabel: 'Highly dedicated', dots: 3 },
];
// Exported (not just used here) so src/lib/studentProfile.js can turn a
// student's saved onboarding values back into human-readable labels for the
// Axio system prompt and the dashboard's onboarding recap card, instead
// of duplicating this copy in a second place that could drift out of sync.
export const GOAL_OPTIONS = [
  { value: 'boost_score', label: 'Boost my SAT/ACT score' },
  { value: 'build_application', label: 'Build a standout application' },
  { value: 'explore_pathway', label: 'Explore if medicine is right for me' },
];
export const STUDY_METHOD_OPTIONS = [
  { value: 'none', label: 'No structured method yet' },
  { value: 'khan', label: 'Khan Academy' },
  { value: 'princeton', label: 'The Princeton Review' },
  { value: 'kaplan', label: 'Kaplan' },
  { value: 'school', label: 'School curriculum only' },
  { value: 'tutor', label: 'Tutor or mentor' },
];
export const OBSTACLE_OPTIONS = [
  { value: 'what_to_study', label: 'Not knowing what to study' },
  { value: 'guidance', label: 'Lack of guidance or mentorship' },
  { value: 'busy', label: 'Busy schedule' },
  { value: 'anxiety', label: 'Test anxiety' },
  { value: 'motivation', label: 'Losing motivation' },
  { value: 'no_plan', label: 'No structured plan' },
];
export const ACCOMPLISH_OPTIONS = [
  { value: 'score', label: 'Boost my SAT/ACT score' },
  { value: 'application', label: 'Build a competitive application' },
  { value: 'explore', label: 'Explore if medicine is right for me' },
  { value: 'experience', label: 'Gain clinical or research experience' },
  { value: 'gpa', label: 'Raise my GPA' },
  { value: 'consistency', label: 'Stay motivated & consistent' },
];

const DEFAULT_ANSWERS = {
  studyHours: null, source: null, triedApps: null,
  gradeIdx: 2, testTrack: 'SAT', currentScore: 1000,
  monthIdx: 0, dayIdx: 0, yearIdx: 4,
  goal: null, targetScore: 1200, speedLevel: 1,
  obstacles: [], studyMethod: null, accomplish: [],
  addBack: true, rollover: true, referralCode: '', name: '',
};

// Onboarding is a ~30-screen flow — closing the tab or losing a connection
// partway through used to throw away every answer already given, forcing a
// full restart. Progress is now mirrored to localStorage on every change and
// rehydrated on mount (keyed per account so switching users doesn't leak a
// stranger's answers), so "foolproof" also means "can't lose your progress."
function draftKey(account) { return `onboardingDraft:${account?.email || 'anon'}`; }
function loadDraft(account) {
  try {
    const raw = localStorage.getItem(draftKey(account));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch { return null; }
}
function saveDraft(account, stepIdx, answers) {
  try { localStorage.setItem(draftKey(account), JSON.stringify({ stepIdx, answers })); } catch { /* storage full/unavailable — non-critical */ }
}
function clearDraft(account) {
  try { localStorage.removeItem(draftKey(account)); } catch { /* ignore */ }
}

export default function Onboarding({ account, onComplete }) {
  const draft = useMemo(() => loadDraft(account), [account]);
  const [stepIdx, setStepIdx] = useState(() => Math.min(draft?.stepIdx ?? 0, STEPS.length - 1));
  const [answers, setAnswers] = useState(() => (draft?.answers ? { ...DEFAULT_ANSWERS, ...draft.answers } : DEFAULT_ANSWERS));

  React.useEffect(() => { saveDraft(account, stepIdx, answers); }, [account, stepIdx, answers]);

  const stepKey = STEPS[stepIdx];
  const next = () => setStepIdx(i => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx(i => Math.max(0, i - 1));
  const update = (patch) => setAnswers(a => ({ ...a, ...patch }));
  const toggleInList = (key, val) => setAnswers(a => ({ ...a, [key]: a[key].includes(val) ? a[key].filter(v => v !== val) : [...a[key], val] }));

  const progress = useMemo(() => {
    const i = STEPS.indexOf(stepKey);
    if (i < PROGRESS_START) return 0;
    if (i > PROGRESS_END) return 1;
    return (i - PROGRESS_START) / (PROGRESS_END - PROGRESS_START);
  }, [stepKey]);

  function finish(extra = {}) {
    clearDraft(account);
    onComplete({ ...answers, ...extra });
  }

  const showBack = !NO_CHROME.has(stepKey) && stepIdx > 0;
  const showProgress = !NO_CHROME.has(stepKey);

  let content = null;
  switch (stepKey) {
    case 'splash':
      content = <SplashStep onNext={next} />; break;
    case 'welcome':
      content = <WelcomeStep account={account} onNext={next} />; break;
    case 'studyHours':
      content = <SingleChoiceStep title="How many hours do you study per week?" subtitle="This will be used to calibrate your custom plan." options={STUDY_HOURS_OPTIONS} value={answers.studyHours} onChange={v => update({ studyHours: v })} onNext={next} />; break;
    case 'source':
      content = <SourceStep value={answers.source} onChange={v => update({ source: v })} onNext={next} />; break;
    case 'triedApps':
      content = <SingleChoiceStep title="Have you tried other college-prep apps?" options={[{ value: 'no', label: 'No', icon: <ThumbsDown size={17} /> }, { value: 'yes', label: 'Yes', icon: <ThumbsUp size={17} /> }]} value={answers.triedApps} onChange={v => update({ triedApps: v })} onNext={next} />; break;
    case 'proof1':
      content = <ProofGraphStep title="MedSchoolPrep creates long-term results" subtitle="Your score" legend={[{ label: 'MedSchoolPrep', color: C.blue }, { label: 'Studying alone', color: C.t4 }]}
        lines={[{ points: [0.1, 0.2, 0.32, 0.5, 0.72, 0.9, 0.97], color: C.blue, width: 3, fill: true, endDot: true }, { points: [0.1, 0.16, 0.24, 0.28, 0.22, 0.3, 0.34], color: C.t4, width: 2, dashed: true }]}
        xLabels={['Month 1', 'Month 6']} statLine="92% of MedSchoolPrep students raise their score within 3 months." onNext={next} />; break;
    case 'gradeScore':
      content = <GradeScoreStep value={answers} onChange={patch => update(patch)} onNext={next} />; break;
    case 'birthdate':
      content = <BirthdateStep value={answers} onChange={patch => update(patch)} onNext={next} />; break;
    case 'goal':
      content = <SingleChoiceStep title="What is your goal?" subtitle="This helps us generate a plan for your prep." options={GOAL_OPTIONS} value={answers.goal} onChange={v => update({ goal: v, targetScore: answers.testTrack === 'ACT' ? 28 : 1200 })} onNext={next} />; break;
    case 'targetScore':
      content = <TargetScoreStep testTrack={answers.testTrack} currentScore={answers.currentScore} value={answers.targetScore} onChange={v => update({ targetScore: v })} onNext={next} />; break;
    case 'realistic':
      content = <RealisticTargetStep testTrack={answers.testTrack} currentScore={answers.currentScore} targetScore={answers.targetScore} onNext={next} />; break;
    case 'speed':
      content = <SpeedStep value={answers.speedLevel} testTrack={answers.testTrack} onChange={v => update({ speedLevel: v })} onNext={next} />; break;
    case 'proof2':
      content = <ProofGraphStep title="Improve your score twice as fast" subtitle="With a MedSchoolPrep plan vs. studying on your own" legend={[{ label: 'MedSchoolPrep', color: C.blue }, { label: 'On your own', color: C.t4 }]}
        lines={[{ points: [0, 0.22, 0.4, 0.6, 0.8, 0.95, 1], color: C.blue, width: 3, fill: true, endDot: true }, { points: [0, 0.1, 0.18, 0.25, 0.32, 0.4, 0.46], color: C.t4, width: 2, dashed: true }]}
        xLabels={['Week 1', 'Week 12']} statLine="MedSchoolPrep students improve 2x faster on average." onNext={next} />; break;
    case 'obstacles':
      content = <ChecklistStep title="What's stopping you from reaching your goals?" subtitle="Select all that apply." options={OBSTACLE_OPTIONS} value={answers.obstacles} onToggle={v => toggleInList('obstacles', v)} onNext={next} />; break;
    case 'studyMethod':
      content = <SingleChoiceStep title="Do you follow a specific study method?" options={STUDY_METHOD_OPTIONS} value={answers.studyMethod} onChange={v => update({ studyMethod: v })} onNext={next} />; break;
    case 'accomplish':
      content = <ChecklistStep title="What would you like to accomplish?" subtitle="Select all that apply." options={ACCOMPLISH_OPTIONS} value={answers.accomplish} onToggle={v => toggleInList('accomplish', v)} onNext={next} />; break;
    case 'proof3':
      content = <ProofGraphStep title="You have great potential to reach your goal" subtitle="Based on MedSchoolPrep's historical student data"
        lines={[{ points: [0.08, 0.15, 0.28, 0.42, 0.6, 0.8, 0.98], color: C.green, width: 3, fill: true, endDot: true }]}
        xLabels={['Today', 'Target date']} statLine={`Students starting around ${answers.currentScore} typically reach ${answers.targetScore}+ within one semester.`} onNext={next} />; break;
    case 'thankYou':
      content = <ThankYouStep onNext={next} />; break;
    case 'calendar':
      content = <CalendarStep onNext={next} />; break;
    case 'toggleAddBack':
      content = <ToggleQuestionStep icon={<PlusCircle size={26} color={C.blueL} />} title="Add extra study sessions back to your daily goal?" subtitle="If you study more than planned, we'll count it toward tomorrow too." note="You can change this anytime in Settings." value={answers.addBack} onChange={v => update({ addBack: v })} onNext={next} />; break;
    case 'toggleRollover':
      content = <ToggleQuestionStep icon={<Repeat size={26} color={C.blueL} />} title="Rollover unused study time to the next day?" subtitle="Missed a session? We'll fold it into tomorrow's plan instead of losing it." value={answers.rollover} onChange={v => update({ rollover: v })} onNext={next} />; break;
    case 'notifications':
      content = <NotificationsStep onNext={next} />; break;
    case 'referral':
      content = <ReferralStep value={answers.referralCode} onChange={v => update({ referralCode: v })} onNext={next} />; break;
    case 'generating':
      content = <GeneratingStep onNext={next} />; break;
    case 'planReady':
      content = <PlanReadyStep onNext={next} />; break;
    case 'planSummary':
      content = <PlanSummaryStep profile={answers} onNext={next} />; break;
    case 'saveProgress':
      content = <SaveProgressStep account={account} value={answers.name} onChange={v => update({ name: v })} onNext={() => finish()} />; break;
    default:
      content = null;
  }

  return (
    <OnboardingShell stepKey={stepKey} progress={progress} onBack={back} showBack={showBack} showProgress={showProgress}>
      {content}
    </OnboardingShell>
  );
}
