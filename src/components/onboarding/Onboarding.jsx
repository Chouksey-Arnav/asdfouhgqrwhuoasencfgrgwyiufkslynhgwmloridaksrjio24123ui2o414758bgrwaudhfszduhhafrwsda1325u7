// ── Version one asks nothing about the SAT ───────────────────────────────────
// The flow used to collect a test track, a current score, a target score and a
// test date, then spend three screens forecasting a score jump. All four fed
// the SAT pillar, which is sealed for v1 (src/lib/betaFlags.js) — so a promise
// about a score is a promise this product currently has no way to help anyone
// keep. Those questions and those screens are gone; what remains asks about
// grades, science coursework, real-world experience and time, which is what the
// plan is actually built from.
//
// The full MedSchoolPrep onboarding flow — a Cal AI-style funnel (splash →
// warm-up → personalization → animated proof moments → plan-generation reveal
// → save-progress) rebuilt around medicine rather than generic test prep.
//
// Structure of the journey, deliberately shaped as an emotional arc and named
// in chapters the student can see (see chapters.js):
//   1. YOUR CLASS YEAR — birthdate and the graduation year it implies, on one
//      screen, confirmed rather than assumed. This is step two on purpose: it
//      decides which of the three flows below the student gets, so every screen
//      after it is built for someone we have actually met.
//   2. YOUR WHY — why medicine, who they want to become, how sure they are (one
//      screen), then an identity moment that names the future.
//   3. WHERE THEY ARE — GPA + sciences, hands-on experience, then an insight
//      beat that normalizes a blank slate or celebrates a head start.
//   4. THEIR RHYTHM — hours, tools and prior apps together, then what the
//      product actually is.
//   5. WHERE THEY'RE GOING — the goal they're chasing, then a daily time
//      commitment in minutes.
//   6. THEIR PLAN — obstacles and ambitions together, empathy, potential, plan
//      preferences, then THE BAND-SPECIFIC TAIL, a personal pledge, and the
//      name/source screen.
//
// ── The tail branches by grade band ──────────────────────────────────────────
// A ninth grader and a twelfth grader are functionally two different products,
// so the last few questions — and, more importantly, the screen the app opens
// on afterwards — differ by band. Explore (9–10) is asked what science class
// they are in and what their own weekly goal is, and lands on the lesson track.
// Build (11) is asked when they are taking the SAT/ACT and lands on a
// pre-populated junior-year portfolio timeline. Apply (12) is offered a skip on
// the diagnostic, triaged on early and combined-degree deadlines, and lands on
// the portfolio with real deadlines on it — because a senior dropped at the top
// of a foundations-upward lesson track will bounce. The three flows live in
// src/lib/onboardingFlow.js.
//
// ── Why the screens are grouped the way they are ─────────────────────────────
// The flow used to ask the same ~20 things across ~20 screens, one question per
// screen, and a reviewer's honest reaction was "when is this going to end".
// Nothing has been dropped — every answer the app consumed before is still
// collected — but related questions now share a screen and reveal in immediate
// sequence (see steps/grouped.jsx), which takes the interactive screen count
// from twenty to ten. Two screens whose only interaction was a Continue button
// (the standalone thank-you, the second of the two settings toggles) folded
// into their neighbors. The student's progress through those ten is stated in
// words on every screen: "3 more to go".
//
// Screens with no real product behind them (fake calendar connect, a
// notifications ask that didn't wire anywhere, fake paywall/testimonials from
// the original funnel) are deliberately absent — every remaining screen feeds
// data the app actually uses (see completeOnboarding in App.jsx,
// studentProfile.js, and planGenerator.js).
import React, { useMemo, useState } from 'react';
import OnboardingShell from './OnboardingShell';
import { SplashStep, WelcomeStep } from './steps/Intro';
import { ChecklistStep, ProofGraphStep, PlanPreferencesStep } from './steps/generic';
import { GroupedStep } from './steps/grouped';
import { MONTHS as DOB_MONTHS, DAYS as DOB_DAYS, YEARS as DOB_YEARS } from './steps/BirthdateStep';
import AgeBlockedStep from './steps/AgeBlockedStep';
import { GoalStep } from './steps/GoalStep';
import { SpeedStep } from './steps/SpeedStep';
import { FeatureShowcaseStep } from './steps/FeatureShowcaseStep';
import { IdentityStep, ExperienceInsightStep, ObstacleEmpathyStep, CommitmentStep } from './steps/emotional';
import { GeneratingStep } from './steps/GeneratingStep';
import { PlanReadyStep } from './steps/PlanReadyStep';
import { PlanSummaryStep } from './steps/PlanSummaryStep';
import { SaveProgressStep } from './steps/SaveProgressStep';
import { FamilyStep } from './steps/FamilyStep';
import { obstacleEmpathy } from './personalize';
import { C } from './primitives';
import { chapterHue } from './design';
import { CHAPTERS, STEP_CHAPTER } from './chapters';
import { isUnderMinAge, isAgeBlocked, recordAgeBlocked } from '../../lib/ageGate';
import { GraduationYearStep } from './steps/GraduationYearStep';
import { DiagnosticOfferStep } from './steps/DiagnosticOfferStep';
import { bandOfGrade, gradeStageFromGraduationYear } from '../../lib/gradeBand';
import { bandStepKeys, focusCopyFor } from '../../lib/onboardingFlow';
import {
  STUDY_HOURS_OPTIONS, GOAL_OPTIONS, STUDY_METHOD_OPTIONS, OBSTACLE_OPTIONS, ACCOMPLISH_OPTIONS,
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS, SCIENCE_OPTIONS,
  EXPERIENCE_OPTIONS, SCIENCE_CLASS_OPTIONS, WEEKLY_GOAL_OPTIONS, TESTING_PLAN_OPTIONS,
  EARLY_APPLICATION_OPTIONS, COMBINED_PROGRAM_OPTIONS,
} from './options';

// Option lists live in ./options (dependency-free, shared with the steps and
// personalization logic); re-exported here so App.jsx, studentProfile.js,
// planGenerator.js and masterPlanGenerator.js keep their existing imports.
export {
  STUDY_HOURS_OPTIONS, GOAL_OPTIONS, STUDY_METHOD_OPTIONS, OBSTACLE_OPTIONS, ACCOMPLISH_OPTIONS,
  WHY_MEDICINE_OPTIONS, DREAM_ROLE_OPTIONS, CERTAINTY_OPTIONS, GPA_OPTIONS, SCIENCE_OPTIONS,
  EXPERIENCE_OPTIONS,
};

// The step list is computed per-render from the answers so far, so the journey
// itself can branch per student (e.g. the obstacle-empathy beat only exists
// when there's an obstacle to answer). Rehydration is keyed by step KEY, not
// index, so a draft survives the list changing shape.
/** The band this student's answers put them in, from the graduation year they
 *  confirmed on step two. Null until they have confirmed it, which is why every
 *  band-branching call below defaults to the explore flow. */
export function bandOfAnswers(answers) {
  return bandOfGrade(gradeStageFromGraduationYear(answers?.graduationYear));
}

// The flow branches. The head is the same for every student — those answers are
// worth having at any age — and the tail is chosen by grade band, because the
// questions that are worth asking a ninth grader and the questions that are
// worth asking a senior six weeks from an early-decision deadline have almost
// nothing in common. See src/lib/onboardingFlow.js for the three flows and for
// why the branch exists at all.
function buildSteps(answers) {
  const band = bandOfAnswers(answers);
  const steps = [
    'splash', 'welcome',
    // Step two, immediately after the account. Graduation year decides which
    // flow the student gets from here on, so it cannot be asked any later than
    // this without the screens in between having been built for a student we
    // had not met yet. See steps/GraduationYearStep.jsx.
    'classYear',
    'why', 'identity',
    'academics', 'experience', 'expInsight',
    'rhythm', 'showcase',
    'goal', 'speed',
    'challenges',
  ];
  if (obstacleEmpathy(answers.obstacles)) steps.push('obstacleEmpathy');
  steps.push('potential', 'prefs');
  // Seniors are offered the diagnostic rather than marched through it: six
  // minutes of career quiz is a strange toll to charge someone whose real
  // problem is a November 1 deadline. Skipping asks them for their pathway
  // directly instead, so nothing downstream is left undecided.
  if (band === 'apply') steps.push('diagnosticOffer');
  steps.push(...bandStepKeys(band));
  // 'family' sits after the plan preferences and before the pledge: late enough that the student
  // has seen what the product is and can decide whether they want a parent watching it, and early
  // enough that it is not the last thing between them and the app (a share prompt in the final
  // slot reads as a toll gate). See steps/FamilyStep.jsx.
  steps.push('family', 'commitment', 'saveProgress');
  return steps;
}
const NO_CHROME = new Set(['splash', 'welcome', 'generating', 'planReady']);

const DEFAULT_ANSWERS = {
  // Warm-up / identity
  whyMedicine: null, dreamRole: null, certainty: null,
  // Situation. The class year is stored as a GRADUATION YEAR, not a grade:
  // a grade is true for ten months and a graduation year is true forever, so
  // this one self-advances every August instead of quietly going stale. See
  // src/lib/gradeBand.js. `graduationYearConfirmed` starts false and is what
  // the Continue button waits on — the year is pre-filled from the birthdate,
  // and a pre-filled value nobody looked at is not an answer.
  graduationYear: null, graduationYearConfirmed: false,
  // The birthdate wheels open on an age below the minimum on purpose; see
  // BirthdateWheels. `dobTouched` is what makes the student answer rather than
  // scroll past and get gated on a date they never picked.
  monthIdx: 0, dayIdx: 0, yearIdx: 4, dobTouched: false,
  gpa: null, sciences: [], experience: [],
  studyHours: null, studyMethod: null, triedApps: null, source: null,
  // Direction
  goal: null, speedLevel: 1,
  // Band-specific answers. Only the ones this student's flow actually asks for
  // are ever filled; the rest stay null and nothing downstream assumes them.
  scienceClass: null, weeklyGoal: null, testingPlan: null,
  earlyApplication: null, combinedProgram: null,
  // The senior's diagnostic decision, and the pathway they named if they
  // skipped it. `skipDiagnostic` rides through to the user record so the app
  // can re-offer the diagnostic later (see shouldReofferDiagnostic).
  skipDiagnostic: false, pathway: null,
  obstacles: [], accomplish: [],
  // Preferences & output
  addBack: true, rollover: true, name: '', generatedPlan: null,
  // The optional parent invitation. Held as an answer rather than sent from the screen: the
  // account does not exist yet, and an invitation from an account that was never created is a
  // dead link in somebody's inbox. completeOnboarding() sends it.
  parentInviteEmail: '', parentRelationship: '',
};

// Losing a connection partway through used to throw away every answer given.
// Progress is mirrored to localStorage on every change and rehydrated on mount
// (keyed per account so switching users doesn't leak a stranger's answers).
// `preview` (Settings' dev-only flag) gets its own key suffix so previewing on
// a signed-in account can't read or clobber that account's real draft. The
// version prefix retires drafts from earlier flow shapes, whose step keys no
// longer line up with this one (v4: questions grouped onto shared screens, so
// most step keys changed).
function draftKey(account, preview) { return `onboardingDraft:v5:${preview ? 'preview:' : ''}${account?.email || 'anon'}`; }
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

/** The chapter's hue pair, resolved live so it follows a theme switch. */
const hueFor = (stepKey) => chapterHue(STEP_CHAPTER[stepKey]);

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

  // ── Age gate ──────────────────────────────────────────────────────────────
  // Onboarding is where we first learn how old the student is, which makes it
  // where COPPA is first decided. `blocked` is initialized from storage so a
  // failed screen survives a reload — a gate you get past by pressing refresh
  // is not a gate. See src/lib/ageGate.js for why the block lives there.
  // `preview` is the dev-only "Replay Onboarding" tool (see App.jsx), which
  // reruns this flow for an account that is already signed in and already
  // real — it exists to look at screens again, not to re-decide whether the
  // account is old enough to exist. It must never re-trigger the age gate:
  // doing so would (a) show an already-13-or-older user a false block because
  // a *previous, unrelated* failed age check left `msp_ageBlocked` set on
  // this device and was never cleared (deletion can fail and leave the flag
  // stuck — see AgeBlockedStep), and (b) worse, would run the real account
  // deletion in AgeBlockedStep against a live, signed-in account just because
  // someone scrolled a wheel while previewing.
  const [blocked, setBlocked] = useState(() => !preview && isAgeBlocked());

  /** The three wheel indices, as a real date. MONTHS/DAYS/YEARS are the exact
   *  arrays the wheels render, so this stays correct if their ranges change. */
  const birthdateFrom = (a) => ({
    year: DOB_YEARS[a.yearIdx],
    month: a.monthIdx + 1,          // DOB_MONTHS is Jan-first, so index+1 is the month number
    day: DOB_DAYS[a.dayIdx],
  });

  // Runs when the student leaves the screen holding the birthdate wheels, not
  // while they are still spinning them — otherwise every pass through a young
  // year on the way to an older one would trip the gate mid-scroll.
  function advanceFromClassYear() {
    // See the `blocked` init above: preview replays onboarding for an
    // account that already exists, so there is no age decision left to make
    // here — and no real account should ever be deleted just because someone
    // was previewing screens.
    if (!preview && isUnderMinAge(birthdateFrom(answers))) {
      recordAgeBlocked();
      setBlocked(true);
      return;
    }
    next();
  }

  const next = () => setStepIdx(i => Math.min(steps.length - 1, i + 1));
  const back = () => setStepIdx(i => Math.max(0, i - 1));
  const update = (patch) => setAnswers(a => ({ ...a, ...patch }));
  const toggleInList = (key, val) => setAnswers(a => ({ ...a, [key]: a[key].includes(val) ? a[key].filter(v => v !== val) : [...a[key], val] }));

  function finish(extra = {}) {
    clearDraft(account, preview);
    onComplete({ ...answers, ...extra });
  }

  const showBack = !NO_CHROME.has(stepKey) && stepIdx > 0;
  const showProgress = !NO_CHROME.has(stepKey);
  const h = hueFor(stepKey);

  let content = null;
  switch (stepKey) {
    case 'splash':
      content = <SplashStep onNext={next} />; break;
    case 'welcome':
      content = <WelcomeStep account={account} onNext={next} />; break;

    // ── Step two: the class year everything else is sequenced from ────────
    case 'classYear':
      content = (
        <GraduationYearStep value={answers} onChange={patch => update(patch)}
          onNext={advanceFromClassYear} h={h} YEARS={DOB_YEARS} DAYS={DOB_DAYS} />
      ); break;

    // ── Chapter 1: why medicine ──────────────────────────────────────────
    // Three questions about the same thing — the reason, the picture, the
    // conviction — on one screen instead of three.
    case 'why':
      content = (
        <GroupedStep
          eyebrow="Your why" icon="pulse-heart" h={h}
          title="Let's start with the part that isn't on any transcript."
          subtitle="Three quick questions, right here on this screen. There are no wrong answers — your reasons shape the plan we build."
          questions={[
            {
              key: 'whyMedicine', prompt: 'What draws you to medicine?', type: 'single',
              options: WHY_MEDICINE_OPTIONS, value: answers.whyMedicine, onChange: v => update({ whyMedicine: v }),
            },
            {
              key: 'dreamRole', prompt: 'Ten years from now — where do you see yourself?',
              hint: "Picture the version of you that made it. We'll aim there together.", type: 'single',
              options: DREAM_ROLE_OPTIONS, value: answers.dreamRole, onChange: v => update({ dreamRole: v }),
            },
            {
              key: 'certainty', prompt: 'How sure are you about medicine?',
              hint: 'Both answers are great — your plan just leans differently.', type: 'single',
              options: CERTAINTY_OPTIONS, value: answers.certainty, onChange: v => update({ certainty: v }),
            },
          ]}
          onNext={next} ctaLabel="That's me" />
      ); break;
    case 'identity':
      content = <IdentityStep answers={answers} onNext={next} />; break;

    case 'academics':
      content = (
        <GroupedStep
          eyebrow="Your foundation" icon="books" h={h}
          title="Now the school side of it."
          subtitle="GPA and science coursework are the two things pre-health admissions look at first. We'll factor both in honestly — no judgment attached to either."
          questions={[
            {
              key: 'gpa', prompt: 'How are your grades right now?', type: 'single',
              options: GPA_OPTIONS, value: answers.gpa, onChange: v => update({ gpa: v }),
            },
            {
              key: 'sciences', prompt: 'Which science courses have you taken?',
              hint: "Include what you're taking right now. Select all that apply.", type: 'multi',
              options: SCIENCE_OPTIONS, value: answers.sciences, onChange: v => toggleInList('sciences', v),
            },
          ]}
          onNext={next} />
      ); break;
    case 'experience':
      content = <ChecklistStep eyebrow="Real-world exposure" icon="hospital" h={h} title="Any hands-on health experience yet?" subtitle="Be honest — 'nothing yet' is where most future doctors start, and it's the easiest thing on this list to change." options={EXPERIENCE_OPTIONS} value={answers.experience} onToggle={v => toggleInList('experience', v)} onNext={next} />; break;
    case 'expInsight':
      content = <ExperienceInsightStep answers={answers} onNext={next} />; break;

    // ── Chapter 3: how they actually work ────────────────────────────────
    case 'rhythm':
      content = (
        <GroupedStep
          eyebrow="Your rhythm" icon="clock" h={h}
          title="How does your week actually look?"
          subtitle="We build from your real life, not an ideal one. Three fast ones and this chapter's done."
          questions={[
            {
              key: 'studyHours', prompt: 'How much time do you already put into your future each week?',
              hint: "Studying, clubs, volunteering — it all counts.", type: 'single',
              options: STUDY_HOURS_OPTIONS, value: answers.studyHours, onChange: v => update({ studyHours: v }),
            },
            {
              key: 'studyMethod', prompt: 'Are you using anything to prepare right now?',
              hint: "Whatever you're using, your plan will fit around it — not fight it.", type: 'single',
              options: STUDY_METHOD_OPTIONS, value: answers.studyMethod, onChange: v => update({ studyMethod: v }),
            },
            {
              key: 'triedApps', prompt: 'Have you tried other prep apps?',
              hint: 'Most of them stop at test questions. Medicine asks for more — and so do we.', type: 'single',
              options: [
                { value: 'no', label: 'No, this is my first', icon: 'spark-new' },
                { value: 'yes', label: "Yes, I've tried others", icon: 'repeat' },
              ],
              columns: 2,
              value: answers.triedApps, onChange: v => update({ triedApps: v }),
            },
          ]}
          onNext={next} />
      ); break;
    case 'showcase':
      content = <FeatureShowcaseStep onNext={next} />; break;

    // ── Chapter 4: where they're going ───────────────────────────────────
    case 'goal':
      content = <GoalStep value={answers.goal} onChange={v => update({ goal: v })} onNext={next} h={h} />; break;
    case 'speed':
      content = <SpeedStep value={answers.speedLevel} answers={answers} onChange={v => update({ speedLevel: v })} onNext={next} h={h} />; break;

    // ── Chapter 5: what's in the way, and the plan ───────────────────────
    case 'challenges':
      content = (
        <GroupedStep
          eyebrow="The real talk" icon="puzzle" h={h}
          title="What's in the way — and what you want out of this."
          subtitle="Naming an obstacle is how we plan around it. Then tell us what a win looks like, and your plan will carry every one you pick."
          questions={[
            {
              key: 'obstacles', prompt: "What's standing between you and medicine?",
              hint: 'Select all that apply.', type: 'multi',
              options: OBSTACLE_OPTIONS, value: answers.obstacles, onChange: v => toggleInList('obstacles', v),
            },
            {
              key: 'accomplish', prompt: 'What do you want to walk away with?',
              hint: 'Select all that apply.', type: 'multi',
              options: ACCOMPLISH_OPTIONS, value: answers.accomplish, onChange: v => toggleInList('accomplish', v),
            },
          ]}
          onNext={next} />
      ); break;
    case 'obstacleEmpathy':
      content = <ObstacleEmpathyStep answers={answers} onNext={next} />; break;
    case 'potential':
      content = <ProofGraphStep eyebrow="The road ahead" icon="white-coat" h={h} title="Your road to the white coat starts exactly here."
        subtitle="Every physician's path runs through the same early ground you're standing on — foundation, experiences, application. Yours now has a map."
        lines={[{ points: [0.08, 0.15, 0.28, 0.42, 0.6, 0.8, 0.98], color: h.base, width: 3, fill: true, endDot: true }]}
        xLabels={['Today', 'Application day']}
        milestones={[{ f: 0.32, label: 'Foundation' }, { f: 0.66, label: 'Experiences' }]}
        statLine="Students who follow a structured pre-med plan through high school apply with stronger scores, real clinical exposure, and a story that stands out — the three things admissions actually weighs." onNext={next} />; break;
    case 'prefs':
      content = <PlanPreferencesStep prefs={answers} onChange={patch => update(patch)} onNext={next} h={h} />; break;

    // ── The band-specific tail ────────────────────────────────────────────
    // Which of these a student sees is decided entirely by the graduation year
    // they confirmed on step two; see buildSteps() and src/lib/onboardingFlow.js.

    // EXPLORE (9th–10th): what science are you in this year. The one fact that
    // decides which units land — recommending a chemistry-heavy unit to a
    // student who has not taken chemistry is how a lesson track loses someone.
    case 'scienceClass':
      content = (
        <GroupedStep
          eyebrow="This year at school" icon="flask" h={h}
          title="What science are you taking right now?"
          subtitle="Your lessons get sequenced around it, so what you learn here lands on top of what you're already doing in class instead of running beside it."
          questions={[{
            key: 'scienceClass', prompt: 'Your science class this year', type: 'single',
            options: SCIENCE_CLASS_OPTIONS, value: answers.scienceClass, onChange: v => update({ scienceClass: v }),
          }]}
          showCounter={false} onNext={next} />
      ); break;

    // EXPLORE + BUILD: the student's OWN weekly goal. A number they picked is
    // worth more than a better number we picked for them, because the streak,
    // the plan and the nudges are all measured against it.
    case 'weeklyGoal':
      content = (
        <GroupedStep
          eyebrow="Your pace" icon="flame" h={h}
          title="How often do you want to show up?"
          subtitle="You set this, not us — and you can change it any week. Everything we ask of you gets sized to fit the answer."
          questions={[{
            key: 'weeklyGoal', prompt: 'Your weekly goal', type: 'single',
            options: WEEKLY_GOAL_OPTIONS, value: answers.weeklyGoal, onChange: v => update({ weeklyGoal: v }),
          }]}
          showCounter={false} onNext={next} />
      ); break;

    // BUILD (11th): when the test happens is the spine of a junior-year plan.
    case 'testingPlan':
      content = (
        <GroupedStep
          eyebrow="Your testing plan" icon="target" h={h}
          title="When are you taking the SAT or ACT?"
          subtitle="Junior year is when this gets decided, and the date changes the order of everything else. A rough answer is fine — we'll firm it up with you later."
          questions={[{
            key: 'testingPlan', prompt: 'Your first sitting', type: 'single',
            options: TESTING_PLAN_OPTIONS, value: answers.testingPlan, onChange: v => update({ testingPlan: v }),
          }]}
          showCounter={false} onNext={next} />
      ); break;

    // APPLY (12th): deadline triage. These two answers decide whether this
    // student's real deadline is eleven weeks away or five months away, which
    // is the difference between the right home screen and the wrong one.
    case 'deadlineTriage':
      content = (
        <GroupedStep
          eyebrow="Deadline triage" icon="calendar-busy" h={h}
          title="Let's find out what's actually due."
          subtitle="Two questions, and then your portfolio opens with your real deadlines on it. This is the part of senior year that punishes surprises, so we'd rather ask now."
          questions={[
            {
              key: 'earlyApplication', prompt: 'Are you applying anywhere early?',
              hint: 'Early deadlines land in the first half of November — six to ten weeks before everything else.',
              type: 'single',
              options: EARLY_APPLICATION_OPTIONS, value: answers.earlyApplication, onChange: v => update({ earlyApplication: v }),
            },
            {
              key: 'combinedProgram', prompt: 'Any combined-degree or direct-admit programs?',
              hint: 'BS/MD, BS/DO, direct-admit nursing or PA. Their deadlines run earliest of all, and they ask for extra essays.',
              type: 'single',
              options: COMBINED_PROGRAM_OPTIONS, value: answers.combinedProgram, onChange: v => update({ combinedProgram: v }),
            },
          ]}
          onNext={next} />
      ); break;

    case 'diagnosticOffer':
      content = (
        <DiagnosticOfferStep value={answers} onChange={patch => update(patch)} onNext={next} h={h} />
      ); break;

    case 'family':
      content = <FamilyStep value={answers} onChange={patch => update(patch)} onNext={next} h={h} />; break;
    case 'commitment':
      content = <CommitmentStep answers={answers} onNext={next} />; break;
    case 'generating':
      content = <GeneratingStep profile={answers} onPlan={plan => update({ generatedPlan: plan })} onNext={next} />; break;
    case 'planReady':
      content = <PlanReadyStep onNext={next} />; break;
    case 'planSummary':
      content = <PlanSummaryStep profile={answers} plan={answers.generatedPlan} onNext={next} />; break;
    case 'saveProgress':
      content = (
        <SaveProgressStep account={account} value={answers.name} onChange={v => update({ name: v })}
          source={answers.source} onSource={v => update({ source: v })} h={h} onNext={() => finish()}
          focusNote={focusCopyFor(bandOfAnswers(answers)).body} />
      ); break;
    default:
      content = null;
  }

  // Checked ahead of everything else, and rendered with no back button and no
  // progress bar: once the age screen has been failed there is no step to
  // return to and nothing left to make progress through. Offering either would
  // be inviting the "guess a different birthday" retry that the gate exists to
  // prevent.
  if (blocked && !preview) {
    return (
      <OnboardingShell stepKey="ageBlocked" steps={[]} showBack={false} showProgress={false}>
        <AgeBlockedStep account={account} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell stepKey={stepKey} steps={steps} answers={answers} onBack={back} showBack={showBack} showProgress={showProgress}>
      {content}
    </OnboardingShell>
  );
}
