// ─────────────────────────────────────────────────────────────────────────────
// Forced trade-off items for the pathway diagnostic.
//
// THE PROBLEM THESE FIX
// The diagnostic was built almost entirely out of preference questions — "which
// sounds more like you", "what would you rather do on a Saturday". Preference
// questions have a ceiling, and the ceiling is low: literally everyone says yes
// to helping people, everyone likes the idea of being trusted, and nobody
// picks the option that sounds worse. Answers cluster, the axes barely separate,
// and the result ends up driven by a handful of scenario votes.
//
// A trade-off item has no free option. Every choice costs something the student
// would rather keep, which is the only question format that actually
// discriminates — and it happens to discriminate along exactly the dimensions
// that separate MD from PA from RN from PT in real life:
//
//   • TRAINING LENGTH AND DEBT.  Finish at 26 with less debt and a narrower
//     scope, or at 32 with much more debt and full diagnostic authority? Most
//     fifteen-year-olds have never been asked to price that, and most have
//     never been told the numbers exist. Asking it here is half diagnostic and
//     half the first honest thing anyone has told them about this career.
//   • AUTHORITY VS. PRESENCE.  Be the person who decides, or the person who is
//     with the patient for the hour? This is the single cleanest split between
//     the physician track and the nursing/therapy tracks, and it is invisible in
//     any question phrased as "do you want to help people".
//   • BREADTH VS. DEPTH, PACE, AND CERTAINTY.  The rest below.
//
// Each choice carries:
//   pathways  direct bonus votes, same shape as the existing scenario items
//   axes      partial work-style vector, same 5 axes as the axis items
//   theme     the trade-off this choice represents. `theme` is what makes the
//             result explainable — see diagnosticEngine.explainMatch, which
//             quotes these back rather than reporting a score.
//   costs     the thing this choice gives up, shown in the result so the
//             student sees the trade they made rather than only what they got.
// ─────────────────────────────────────────────────────────────────────────────

export const TRADEOFF_QS = [
  {
    id: 't1', type: 'tradeoff',
    q: 'Both of these are real. Which would you actually pick?',
    note: 'There is no free answer here — each one costs you the other.',
    ch: [
      {
        text: 'Finish training around 26, carry less debt, and practice with a supervising or collaborating physician',
        theme: 'a shorter path with less debt, accepting a narrower scope',
        costs: 'final say on the hardest calls',
        pathways: { physicianAssistant: 4, nursing: 2, physicalOccupTherapy: 1 },
        axes: { autonomy: -0.5, directCare: 0.5, peopleFacing: 0.4 },
      },
      {
        text: 'Finish training around 32, carry substantially more debt, and hold full diagnostic and treatment authority',
        theme: 'a long, expensive path in exchange for full authority',
        costs: 'six more years and a much larger loan balance',
        pathways: { physician: 4, dentistry: 1 },
        axes: { autonomy: 0.8, acuity: 0.3, directCare: 0.4 },
      },
    ],
  },
  {
    id: 't2', type: 'tradeoff',
    q: 'On the hardest day of the week, which role do you want to be in?',
    ch: [
      {
        text: 'The person who decides — you make the call, and it is yours',
        theme: 'being the one who decides',
        costs: 'the time at the bedside; deciding happens fast and then you move on',
        pathways: { physician: 3, physicianAssistant: 1 },
        axes: { autonomy: 0.9, peopleFacing: -0.1, handsOn: -0.2 },
      },
      {
        text: 'The person who is with the patient for the hour — you are there for the whole of it',
        theme: 'being present with the patient rather than deciding for them',
        costs: 'authority; you carry out a plan you did not set',
        pathways: { nursing: 4, physicalOccupTherapy: 2 },
        axes: { peopleFacing: 0.9, directCare: 0.9, autonomy: -0.6 },
      },
    ],
  },
  {
    id: 't3', type: 'tradeoff',
    q: 'Which kind of win would mean more to you?',
    ch: [
      {
        text: 'One patient walks again after six months of work with you',
        theme: 'slow, visible progress with one person',
        costs: 'scale — this is one person at a time, over months',
        pathways: { physicalOccupTherapy: 4, nursing: 2 },
        axes: { acuity: -0.7, directCare: 0.9, peopleFacing: 0.7, handsOn: 0.5 },
      },
      {
        text: 'A policy you worked on cuts infections across a whole hospital system',
        theme: 'impact at scale over impact you can watch happen',
        costs: 'ever meeting the people you helped',
        pathways: { publicHealth: 4, healthAdmin: 3 },
        axes: { directCare: -0.9, peopleFacing: -0.5, acuity: -0.6, autonomy: 0.4 },
      },
    ],
  },
  {
    id: 't4', type: 'tradeoff',
    q: 'Pick the schedule you would actually live with for a decade.',
    note: 'Both are normal in medicine. Neither is the wrong answer.',
    ch: [
      {
        text: 'Predictable hours, most weekends off, no overnight call — and a narrower range of what you handle',
        theme: 'predictable hours over range',
        costs: 'the highest-acuity work happens without you',
        pathways: { pharmacy: 3, physicalOccupTherapy: 3, dentistry: 2, healthAdmin: 2 },
        axes: { acuity: -0.8, autonomy: 0.1 },
      },
      {
        text: 'Nights, weekends, and being called in — in exchange for being the one there when it actually matters',
        theme: 'accepting a hard schedule to be present for the highest-stakes moments',
        costs: 'evenings, weekends, and a predictable life for years at a stretch',
        pathways: { physician: 3, nursing: 3 },
        axes: { acuity: 0.9, directCare: 0.6, peopleFacing: 0.3 },
      },
    ],
  },
  {
    id: 't5', type: 'tradeoff',
    q: 'Which would you rather be, ten years in?',
    ch: [
      {
        text: 'The person who knows one thing better than almost anyone',
        theme: 'depth in one area over breadth across many',
        costs: 'flexibility — changing direction later gets expensive',
        pathways: { pharmacy: 2, dentistry: 2, biomedResearch: 3 },
        axes: { autonomy: 0.5, handsOn: 0.2, peopleFacing: -0.3 },
      },
      {
        text: 'The person who can handle whatever walks through the door',
        theme: 'breadth across many problems over depth in one',
        costs: 'ever being the definitive expert on any single one of them',
        pathways: { physician: 2, physicianAssistant: 3, nursing: 2 },
        axes: { acuity: 0.5, directCare: 0.5, autonomy: 0.2 },
      },
    ],
  },
  {
    id: 't6', type: 'tradeoff',
    q: 'You have to give one of these up. Which goes?',
    ch: [
      {
        text: 'Give up working with your hands — your day is thinking, reading, and deciding',
        theme: 'cognitive work over procedural work',
        costs: 'the physical craft of the job',
        pathways: { physician: 2, publicHealth: 2, biomedResearch: 3, healthAdmin: 2, pharmacy: 2 },
        axes: { handsOn: -0.9, autonomy: 0.4 },
      },
      {
        text: 'Give up the big-picture problem — your day is doing the procedure, precisely, over and over',
        theme: 'procedural craft over big-picture problem-solving',
        costs: 'the analytical side; someone else sets the direction',
        pathways: { dentistry: 4, physicalOccupTherapy: 2, nursing: 2 },
        axes: { handsOn: 0.9, autonomy: -0.2, directCare: 0.5 },
      },
    ],
  },
];

/**
 * Where the trade-offs are inserted into the question list. Not at the front:
 * a diagnostic that opens by asking a fifteen-year-old to price six years of
 * their life against a loan balance is a diagnostic they abandon on question
 * one. They land after the warm-up preference items, once the student is
 * invested and the questions have earned some trust.
 */
export const TRADEOFF_INSERT_AFTER = 6;

/** Merge trade-offs into a question list at the documented position. */
export function withTradeoffs(questions, tradeoffs = TRADEOFF_QS, at = TRADEOFF_INSERT_AFTER) {
  const base = questions || [];
  const idx = Math.min(Math.max(0, at), base.length);
  return [...base.slice(0, idx), ...tradeoffs, ...base.slice(idx)];
}
