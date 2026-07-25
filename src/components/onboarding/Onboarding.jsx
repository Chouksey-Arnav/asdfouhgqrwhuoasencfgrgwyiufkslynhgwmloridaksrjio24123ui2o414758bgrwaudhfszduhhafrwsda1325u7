// The full MedSchoolPrep onboarding flow — a Cal AI-style funnel (splash →
// warm-up → personalization → animated proof moments → plan-generation reveal
// → save-progress) rebuilt around medicine rather than generic test prep.
//
// Structure of the journey, deliberately shaped as an emotional arc:
//   1. WHY — why medicine, who they want to become, how sure they are, then an
//      identity moment that names the future ("Future Physician").
//   2. WHERE THEY ARE — grade/score, GPA, science courses, hands-on health
//      experience, then an insight screen that normalizes a blank slate or
//      celebrates a head start.
//   3. WHERE THEY'RE GOING — goal, then ONE compact academics beat (target
//      score + test timeline on a single screen), an HONEST timeline-aware
//      trajectory verdict (a 1590→1600 student hears "your score is basically
//      done"; a 600→1600-in-3-months ask gets a blunt reality check with the
//      achievable number instead), a daily time commitment (minutes, not
//      "points per week"), and a whole-journey projection.
//   4. WHAT'S IN THE WAY — obstacles mirrored back with empathy, ambitions,
//      potential.
//   5. COMMITMENT & PAYOFF — a personal pledge, then real plan generation.
//
// Screens with no real product behind them (fake calendar connect, a
// notifications ask that didn't wire anywhere, fake paywall/testimonials from
// the original funnel) are deliberately absent — every remaining screen feeds
// data the app actually uses (see completeOnboarding in App.jsx,
// studentProfile.js, and planGenerator.js).
import React, { useMemo, useState } from 'react';
import { ThumbsDown, ThumbsUp, PlusCircle, Repeat } from 'lucide-react';
import OnboardingShell from './OnboardingShell';
import { SplashStep, WelcomeStep } from './steps/Intro';
import { SourceStep } from './steps/SourceStep';
import { SingleChoiceStep, ChecklistStep, ToggleQuestionStep, ProofGraphStep } from './steps/generic';
import { GradeScoreStep } from './steps/GradeScoreStep';
import { BirthdateStep } from './steps/BirthdateStep';
import { TargetScoreStep } from './steps/TargetScoreStep';
import { RealisticTargetStep, PaceForecastStep } from './steps/RealisticTargetStep';
import { SpeedStep } from './steps/SpeedStep';
import { FeatureShowcaseStep } from './steps/FeatureShowcaseStep';
import { ThankYouStep } from './steps/ThankYouStep';
import { IdentityStep, ExperienceInsightStep, ObstacleEmpathyStep, CommitmentStep } from './steps/emotional';
import { GeneratingStep } from './steps/GeneratingStep';
import { PlanReadyStep } from './steps/PlanReadyStep';
import { PlanSummaryStep } from './steps/PlanSummaryStep';
import { SaveProgressStep } from './steps/SaveProgressStep';
import { obstacleEmpathy } from './personalize';
import { C } from './primitives';
import {
  STUDY_HOURS_OPTIONS, GOAL_OPTIONS, STUDY_METHOD_OPTIONS, OBSTACLE_OPTIONS, ACCOMPLISH_OPTIONS,
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS, SCIENCE_OPTIONS,
  EXPERIENCE_OPTIONS, TEST_TIMELINE_OPTIONS,
} from './options';

// Option lists live in ./options (dependency-free, shared with the steps and
// personalization logic); re-exported here so App.jsx, studentProfile.js,
// planGenerator.js and masterPlanGenerator.js keep their existing imports.
export {
  STUDY_HOURS_OPTIONS, GOAL_OPTIONS, STUDY_METHOD_OPTIONS, OBSTACLE_OPTIONS, ACCOMPLISH_OPTIONS,
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS, SCIENCE_OPTIONS,
  EXPERIENCE_OPTIONS, TEST_TIMELINE_OPTIONS,
};

// The step list is computed per-render from the answers so far, so the journey
// itself can branch per student (e.g. the obstacle-empathy beat only exists
// when there's an obstacle to answer). Rehydration is keyed by step KEY, not
// index, so a draft survives the list changing shape.
function buildSteps(answers) {
  const steps = [
    'splash', 'welcome',
    'whyMedicine', 'dreamRole', 'certainty', 'identity',
    'gradeScore', 'birthdate', 'gpa', 'sciences', 'experience', 'expInsight',
    'studyHours', 'studyMethod', 'triedApps', 'showcase', 'source',
    'goal', 'targetScore', 'realistic', 'speed', 'paceForecast',
    'obstacles',
  ];
  if (obstacleEmpathy(answers.obstacles)) steps.push('obstacleEmpathy');
  steps.push('accomplish', 'potential', 'thankYou', 'toggleAddBack', 'toggleRollover', 'commitment',
    'generating', 'planReady', 'planSummary', 'saveProgress');
  return steps;
}
const NO_CHROME = new Set(['splash', 'welcome', 'generating', 'planReady']);

const DEFAULT_ANSWERS = {
  // Warm-up / identity
  whyMedicine: null, dreamRole: null, certainty: null,
  // Situation
  gradeIdx: 2, testTrack: 'SAT', currentScore: 1000,
  monthIdx: 0, dayIdx: 0, yearIdx: 4,
  gpa: null, sciences: [], experience: [],
  studyHours: null, studyMethod: null, triedApps: null, source: null,
  // Direction
  goal: null, targetScore: 1200, testTimeline: null, speedLevel: 1,
  obstacles: [], accomplish: [],
  // Preferences & output
  addBack: true, rollover: true, name: '', generatedPlan: null,
};

// Losing a connection partway through used to throw away every answer given.
// Progress is mirrored to localStorage on every change and rehydrated on mount
// (keyed per account so switching users doesn't leak a stranger's answers).
// `preview` (Settings' dev-only flag) gets its own key suffix so previewing on
// a signed-in account can't read or clobber that account's real draft. The v2
// prefix retires drafts from earlier flow shapes, whose step keys no longer
// line up with this one (v3: testTimeline folded into targetScore, proofPlan
// replaced by the feature showcase).
function draftKey(account, preview) { return `onboardingDraft:v3:${preview ? 'preview:' : ''}${account?.email || 'anon'}`; }
function loadDraft(account, preview) {
  try {
    const raw = localStorage.getItem(draftKey(account, preview));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch { return null; }
}
function saveDraft(account, preview, stepKey, answers) {
  try { localStorage.setItem(draftKey(account, preview), JSON.stringify({ stepKey, answers })); } catch { /* storage full/unavailable — non-critical */ }
}
function clearDraft(account, preview) {
  try { localStorage.removeItem(draftKey(account, preview)); } catch { /* ignore */ }
}

export default function Onboarding({ account, onComplete, preview = false }) {
  const draft = useMemo(() => loadDraft(account, preview), [account, preview]);
  const [answers, setAnswers] = useState(() => (draft?.answers ? { ...DEFAULT_ANSWERS, ...draft.answers } : DEFAULT_ANSWERS));
  const steps = useMemo(() => buildSteps(answers), [answers]);
  const [stepIdx, setStepIdx] = useState(() => {
    const i = draft?.stepKey ? buildSteps({ ...DEFAULT_ANSWERS, ...(draft.answers || {}) }).indexOf(draft.stepKey) : 0;
    return Math.max(0, i);
  });

  const stepKey = steps[Math.min(stepIdx, steps.length - 1)];
  React.useEffect(() => { saveDraft(account, preview, stepKey, answers); }, [account, preview, stepKey, answers]);

  const next = () => setStepIdx(i => Math.min(steps.length - 1, i + 1));
  const back = () => setStepIdx(i => Math.max(0, i - 1));
  const update = (patch) => setAnswers(a => ({ ...a, ...patch }));
  const toggleInList = (key, val) => setAnswers(a => ({ ...a, [key]: a[key].includes(val) ? a[key].filter(v => v !== val) : [...a[key], val] }));

  const progress = useMemo(() => {
    const start = steps.indexOf('whyMedicine');
    const end = steps.indexOf('saveProgress');
    const i = steps.indexOf(stepKey);
    if (i < start) return 0;
    if (i > end) return 1;
    return (i - start) / (end - start);
  }, [steps, stepKey]);

  function finish(extra = {}) {
    clearDraft(account, preview);
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

    // ── Act 1: why medicine ──────────────────────────────────────────────
    case 'whyMedicine':
      content = <SingleChoiceStep eyebrow="Your why" title="What draws you to medicine?" subtitle="There's no wrong answer — your reason shapes your plan." options={WHY_MEDICINE_OPTIONS} value={answers.whyMedicine} onChange={v => update({ whyMedicine: v })} onNext={next} />; break;
    case 'dreamRole':
      content = <SingleChoiceStep eyebrow="Your future" title="Ten years from now — where do you see yourself?" subtitle="Picture the version of you that made it. We'll aim there together." options={DREAM_ROLE_OPTIONS} value={answers.dreamRole} onChange={v => update({ dreamRole: v })} onNext={next} />; break;
    case 'certainty':
      content = <SingleChoiceStep eyebrow="Honesty check" title="How sure are you about medicine?" subtitle="Both answers are great — your plan just leans differently." options={CERTAINTY_OPTIONS} value={answers.certainty} onChange={v => update({ certainty: v })} onNext={next} />; break;
    case 'identity':
      content = <IdentityStep answers={answers} onNext={next} />; break;

    // ── Act 2: where they are now ────────────────────────────────────────
    case 'gradeScore':
      content = <GradeScoreStep value={answers} onChange={patch => update(patch)} onNext={next} />; break;
    case 'birthdate':
      content = <BirthdateStep value={answers} onChange={patch => update(patch)} onNext={next} />; break;
    case 'gpa':
      content = <SingleChoiceStep eyebrow="Your baseline" title="How are your grades right now?" subtitle="GPA matters for pre-health admissions — we'll factor it into your plan honestly." options={GPA_OPTIONS} value={answers.gpa} onChange={v => update({ gpa: v })} onNext={next} />; break;
    case 'sciences':
      content = <ChecklistStep eyebrow="Your foundation" title="Which science courses have you taken?" subtitle="Include what you're taking right now. Select all that apply." options={SCIENCE_OPTIONS} value={answers.sciences} onToggle={v => toggleInList('sciences', v)} onNext={next} />; break;
    case 'experience':
      content = <ChecklistStep eyebrow="Real-world exposure" title="Any hands-on health experience yet?" subtitle="Be honest — 'nothing yet' is where most future doctors start." options={EXPERIENCE_OPTIONS} value={answers.experience} onToggle={v => toggleInList('experience', v)} onNext={next} />; break;
    case 'expInsight':
      content = <ExperienceInsightStep answers={answers} onNext={next} />; break;
    case 'studyHours':
      content = <SingleChoiceStep eyebrow="Your rhythm" title="How much time do you already put into your future each week?" subtitle="Studying, clubs, volunteering — it all counts. We'll build from your real life, not an ideal one." options={STUDY_HOURS_OPTIONS} value={answers.studyHours} onChange={v => update({ studyHours: v })} onNext={next} />; break;
    case 'studyMethod':
      content = <SingleChoiceStep eyebrow="Your toolkit" title="Are you using anything to prepare right now?" subtitle="Whatever you're using, your plan will fit around it — not fight it." options={STUDY_METHOD_OPTIONS} value={answers.studyMethod} onChange={v => update({ studyMethod: v })} onNext={next} />; break;
    case 'triedApps':
      content = <SingleChoiceStep eyebrow="Been here before?" title="Have you tried other prep apps?" subtitle="Most of them stop at test questions. Medicine asks for more — and so do we." options={[{ value: 'no', label: 'No', icon: <ThumbsDown size={17} /> }, { value: 'yes', label: 'Yes', icon: <ThumbsUp size={17} /> }]} value={answers.triedApps} onChange={v => update({ triedApps: v })} onNext={next} />; break;
    case 'showcase':
      content = <FeatureShowcaseStep onNext={next} />; break;
    case 'source':
      content = <SourceStep value={answers.source} onChange={v => update({ source: v })} onNext={next} />; break;

    // ── Act 3: where they're going ───────────────────────────────────────
    case 'goal':
      // Seed a sensible target relative to where they actually are — never a
      // flat 1200 that can sit *below* a strong student's current score.
      content = <SingleChoiceStep eyebrow="Your mission" title="What matters most to you right now?" subtitle="Your plan leads with this — everything else supports it." options={GOAL_OPTIONS} value={answers.goal}
        onChange={v => update({
          goal: v,
          targetScore: answers.testTrack === 'ACT'
            ? Math.min(36, answers.currentScore + 4)
            : Math.min(1600, Math.round((answers.currentScore + 150) / 10) * 10),
        })} onNext={next} />; break;
    case 'targetScore':
      content = <TargetScoreStep testTrack={answers.testTrack} currentScore={answers.currentScore} value={answers.targetScore} timeline={answers.testTimeline}
        onChange={v => update({ targetScore: v })} onTimeline={v => update({ testTimeline: v })} onNext={next} />; break;
    case 'realistic':
      content = <RealisticTargetStep answers={answers} onNext={next} />; break;
    case 'speed':
      content = <SpeedStep value={answers.speedLevel} answers={answers} onChange={v => update({ speedLevel: v })} onNext={next} />; break;
    case 'paceForecast':
      content = <PaceForecastStep answers={answers} onNext={next} />; break;

    // ── Act 4: what's in the way ─────────────────────────────────────────
    case 'obstacles':
      content = <ChecklistStep eyebrow="The real talk" title="What's standing between you and medicine?" subtitle="Naming it is how we plan around it. Select all that apply." options={OBSTACLE_OPTIONS} value={answers.obstacles} onToggle={v => toggleInList('obstacles', v)} onNext={next} />; break;
    case 'obstacleEmpathy':
      content = <ObstacleEmpathyStep answers={answers} onNext={next} />; break;
    case 'accomplish':
      content = <ChecklistStep eyebrow="Your wins" title="What do you want to walk away with?" subtitle="Select all that apply — your plan will carry each one." options={ACCOMPLISH_OPTIONS} value={answers.accomplish} onToggle={v => toggleInList('accomplish', v)} onNext={next} />; break;
    case 'potential':
      content = <ProofGraphStep eyebrow="The road ahead" title="Your road to the white coat starts exactly here."
        subtitle="Every physician's path runs through the same early ground you're standing on — foundation, experiences, application. Yours now has a map."
        lines={[{ points: [0.08, 0.15, 0.28, 0.42, 0.6, 0.8, 0.98], color: C.green, width: 3, fill: true, endDot: true }]}
        xLabels={['Today', 'Application day']}
        milestones={[{ f: 0.32, label: 'Foundation' }, { f: 0.66, label: 'Experiences' }]}
        statLine="Students who follow a structured pre-med plan through high school apply with stronger scores, real clinical exposure, and a story that stands out — the three things admissions actually weighs." onNext={next} />; break;

    // ── Act 5: commitment & payoff ───────────────────────────────────────
    case 'thankYou':
      content = <ThankYouStep onNext={next} />; break;
    case 'toggleAddBack':
      content = <ToggleQuestionStep icon={<PlusCircle size={26} color={C.blueL} />} title="Add extra study sessions back to your daily goal?" subtitle="If you study more than planned, we'll count it toward tomorrow too." note="You can change this anytime in Settings." value={answers.addBack} onChange={v => update({ addBack: v })} onNext={next} />; break;
    case 'toggleRollover':
      content = <ToggleQuestionStep icon={<Repeat size={26} color={C.blueL} />} title="Rollover unused study time to the next day?" subtitle="Missed a session? We'll fold it into tomorrow's plan instead of losing it." value={answers.rollover} onChange={v => update({ rollover: v })} onNext={next} />; break;
    case 'commitment':
      content = <CommitmentStep answers={answers} onNext={next} />; break;
    case 'generating':
      content = <GeneratingStep profile={answers} onPlan={plan => update({ generatedPlan: plan })} onNext={next} />; break;
    case 'planReady':
      content = <PlanReadyStep onNext={next} />; break;
    case 'planSummary':
      content = <PlanSummaryStep profile={answers} plan={answers.generatedPlan} onNext={next} />; break;
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
