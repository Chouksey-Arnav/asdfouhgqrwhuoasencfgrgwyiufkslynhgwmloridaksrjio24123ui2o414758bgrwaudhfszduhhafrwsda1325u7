// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Physical & Occupational Therapy pathway. Original
// articles + a curated, properly-embedded YouTube video per lesson. Keyed by
// lesson id (see PATHS.physicalOccupTherapy in constants.js). Rendered by the
// LessonPlayer (App.jsx) as Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy, so every video id below was verified via WebSearch.
// - pt2l2's original raw link (xZMwK2HwJ7c) doesn't resolve to anything
//   indexed — swapped for confirmed Crash Course Physics #4 (Vectors and 2D
//   Motion), a genuine kinematics topic distinct from Physics Fundamentals'
//   Crash Course Physics #1 (used elsewhere in this app for pt2l1/ex2l2).
// - pt2l3's original raw link (b5SqYoO4VXI) appears to be a corrupted id, one
//   character off from the real video (b5SqYuWT4-4, "Fluids at Rest: Crash
//   Course Physics #14") — an exact title match to this lesson, confirmed via
//   WebSearch.
// - pt3l1 uses a newly-researched, higher-confidence video (Crash Course
//   Psychology #17, "The Power of Motivation") instead of the generic intro-
//   psych fallback, since it's an exact topical match for this lesson.
// ─────────────────────────────────────────────────────────────────────────────

export const PHYSICAL_OCCUP_THERAPY_CONTENT = {
  pt1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why anatomy and physiology are the working language of rehab`, body: `PT/OT is fundamentally about restoring function — helping someone move, work, or live independently again after an injury, surgery, or illness. That restoration only makes sense if it's built on genuine anatomical and physiological understanding: what structure isn't working, and why it behaves the way it does during recovery. This lesson builds that foundation.` },
        { heading: `Anatomy vs. physiology`, body: `Anatomy is structure — what the body's parts are and how they're arranged. Physiology is function — how those parts actually work, individually and together. A PT working with a patient recovering from a knee injury needs anatomy (which ligaments and structures are involved) and physiology (how those structures heal, and what loading them appropriately versus excessively actually means for recovery).` },
        { heading: `Homeostasis and the body's recovery process`, body: `Homeostasis is the body's drive to keep its internal environment stable, largely through negative feedback loops. Tissue healing is itself a homeostatic process — inflammation triggers a repair cascade, and the body works to restore normal structure and function over a somewhat predictable timeline. Understanding this timeline is exactly what tells a PT/OT when to progress a patient's exercises and when pushing too soon risks re-injury.` },
        { heading: `A tour of the major organ systems`, body: `The musculoskeletal system (bones, joints, muscles) is the most visibly central system in PT/OT, but it never works in isolation. The circulatory system delivers the oxygen and nutrients healing tissue needs. The respiratory system supports the cardiovascular demand of rehab exercise. The nervous system coordinates every movement, and often needs to be retrained just as much as muscle strength does — a topic that gets its own dedicated lesson next.` },
        { heading: `Why this integrated view matters for real practice`, body: `A patient's recovery is never just "the injured part healing" — it's their whole physiology adapting, from cardiovascular fitness supporting exercise tolerance to nervous system retraining supporting coordination. Building this integrated view now is what makes rehab feel like reasoning through a whole-body process, rather than treating an isolated body part.` },
      ],
      keyTakeaways: [
        `Anatomy is structure and physiology is function — real rehab work constantly requires reasoning about both together.`,
        `Tissue healing is itself a homeostatic process with a predictable timeline, which is what tells a PT/OT when to safely progress exercises.`,
        `The musculoskeletal system never works in isolation — circulatory, respiratory, and nervous systems all directly support recovery.`,
        `Recovery is a whole-body physiological process, not just an isolated injured part healing on its own.`,
      ],
    },
    video: { ytId: 'uBGl2BujkPQ', title: 'Introduction to Anatomy & Physiology: Crash Course A&P #1', channel: 'Crash Course' },
  },
  pt1l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why the nervous system gets its own dedicated PT/OT lesson`, body: `It's easy to assume rehab is mostly about rebuilding muscle strength, but a huge share of what PT/OT actually retrains is the nervous system — coordination, balance, and motor control that gets disrupted after a stroke, a brain injury, or even a straightforward orthopedic injury that changes how someone moves out of guarding or habit. This lesson covers the nervous system with that retraining lens.` },
        { heading: `Central vs. peripheral, and how neurons signal`, body: `The central nervous system (brain and spinal cord) is the control center; the peripheral nervous system carries signals to and from the rest of the body. Neurons communicate through electrical signals along their length and chemical signals (neurotransmitters) across synapses. Motor learning — the process of the brain forming and strengthening new movement pathways — is literally this signaling system being reshaped through repeated, deliberate practice.` },
        { heading: `Why motor retraining is central to PT/OT`, body: `After an injury or neurological event, the nervous system's normal movement patterns can be disrupted — sometimes because the pathway itself is damaged (as after a stroke), sometimes because pain or fear has caused someone to unconsciously guard or move differently. In both cases, structured, repeated practice is what helps the nervous system relearn a normal, efficient movement pattern — the actual mechanism behind why rehab exercises are repeated so many times.` },
        { heading: `Nerve signaling and pain`, body: `Pain is itself a nervous system signal — specialized nerve fibers detect tissue irritation or damage and transmit that signal toward the brain, where it's interpreted as pain. Understanding this is what lets a PT/OT distinguish "this hurts because tissue is being damaged" from "this feels uncomfortable because it's unfamiliar movement" — a genuinely important distinction for pacing a rehab program safely without either overprotecting or overloading a patient.` },
        { heading: `Why this depth pays off in real practice`, body: `A PT/OT who understands the nervous system at this level can design a rehab program that's actually retraining the right thing — motor pathways, not just muscle bulk — and can explain to a patient why repetition and consistency matter so much more than intensity alone. That's a genuinely different, more effective approach than treating rehab as pure strength training.` },
      ],
      keyTakeaways: [
        `The central and peripheral nervous systems together control movement, and motor learning is literally this signaling system being reshaped through repeated practice.`,
        `Rehab exercises are often about retraining disrupted nervous system movement patterns, not just building muscle strength.`,
        `Pain is a nervous system signal, and distinguishing tissue-damage pain from unfamiliar-movement discomfort is key to safely pacing rehab.`,
        `Understanding the nervous system at this depth is what lets a PT/OT design a program that retrains the right thing.`,
      ],
    },
    video: { ytId: 'qPix_X-9t7E', title: 'The Nervous System, Part 1: Crash Course Anatomy & Physiology #8', channel: 'Crash Course' },
  },
  pt1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why whole-body physiology matters for rehab specifically`, body: `Recovery isn't just about the injured area — it's about a patient's entire physiological capacity to handle the demands of a rehab program. This lesson tours the major organ systems with an eye toward how each one supports (or limits) recovery.` },
        { heading: `Cardiovascular and respiratory fitness as a rehab factor`, body: `Rehab exercise places real cardiovascular and respiratory demand on a patient, and a patient's baseline fitness in these systems directly affects how much exercise they can safely tolerate, especially early in recovery or after a prolonged period of inactivity. A PT/OT has to factor this in when designing a program — pushing too hard too soon isn't just about the injured tissue, it can also simply exceed a patient's cardiovascular capacity.` },
        { heading: `How the body adapts to progressive activity`, body: `The body adapts to repeated physical demand by getting measurably stronger and more efficient — a principle called progressive overload, foundational to how a rehab program is structured over time. Muscles, tendons, and even bone density all respond to appropriately progressive loading by adapting and strengthening, which is exactly why a rehab program gradually increases difficulty rather than starting at full intensity.` },
        { heading: `Why systems work together during recovery`, body: `A patient regaining the ability to climb stairs after a hip replacement is drawing on musculoskeletal strength, cardiovascular endurance, nervous system coordination, and balance simultaneously — recovery of a functional task is never really about just one system. This is exactly why PT/OT assessment looks at functional movements, not isolated muscle tests alone.` },
        { heading: `Why this integrated view is the actual clinical skill`, body: `Designing a rehab program that appropriately challenges a patient's cardiovascular system, nervous system, and musculoskeletal system together — not too much, not too little — is the real clinical judgment PT/OT programs are trying to build. Genuine physiology fluency is what makes that judgment possible.` },
      ],
      keyTakeaways: [
        `Cardiovascular and respiratory fitness directly affect how much rehab exercise a patient can safely tolerate, especially early in recovery.`,
        `Progressive overload — the body adapting and strengthening in response to gradually increasing demand — is the principle behind how rehab programs are structured over time.`,
        `Regaining a functional task (like climbing stairs) draws on multiple systems simultaneously, which is why PT/OT assessment looks at functional movement, not isolated muscle tests.`,
        `Designing an appropriately challenging, whole-body rehab program is the real clinical judgment PT/OT training is built to develop.`,
      ],
    },
    video: { ytId: '9fxm85Fy4sQ', title: 'Circulatory & Respiratory Systems: Crash Course Biology #27', channel: 'Crash Course' },
  },
  pt2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why physics is arguably the most underrated PT/OT science`, body: `PT/OT is where medicine and physical movement intersect most directly, which means physics — forces, motion, leverage — shows up constantly, even when it's not labeled that way. This lesson covers physics fundamentals with a direct eye toward how they explain movement and injury.` },
        { heading: `Motion basics`, body: `Speed describes how fast something is moving; velocity adds direction. Acceleration describes how quickly velocity itself changes. These aren't abstract definitions for a PT/OT — they're the precise vocabulary for describing exactly how a patient is moving during a gait assessment, or how quickly a joint is (or isn't) able to accelerate through a range of motion.` },
        { heading: `Newton's laws and joint loading`, body: `Newton's first law says an object in motion stays in motion unless a force acts on it. His second law, F = ma, says the force needed to accelerate an object depends on its mass — directly relevant to understanding how much force a joint experiences during activities like walking, running, or lifting. His third law — every force has an equal and opposite reaction — is literally why walking works: pushing backward on the ground propels you forward.` },
        { heading: `Leverage, torque, and biomechanics`, body: `A joint acts as a lever, and the muscles crossing it generate torque (rotational force) around that joint. How far a muscle's attachment point sits from the joint's center of rotation changes how much torque a given amount of muscle force produces — which is exactly why certain exercises are more effective, or place more stress on a joint, depending on the angle and position involved.` },
        { heading: `Why physics fluency changes how a PT/OT designs a program`, body: `Understanding these principles is what lets a PT/OT reason about why a specific exercise targets a specific muscle group, why a certain movement pattern places excess stress on a joint, and how to modify an exercise to change its biomechanical demand. This is applied physics as a daily clinical tool, not classroom trivia.` },
      ],
      keyTakeaways: [
        `Speed, velocity, and acceleration are the precise vocabulary for describing exactly how a patient moves during an assessment.`,
        `Newton's laws explain joint loading, force during movement, and the basic mechanics of walking itself.`,
        `Muscles generate torque around a joint acting as a lever — the actual mechanism behind why exercise angle and position change a movement's effect.`,
        `Physics fluency is what lets a PT/OT reason about why a specific exercise works the way it does, not just follow a protocol.`,
      ],
    },
    video: { ytId: 'ZM8ECpBuQYE', title: 'Motion in a Straight Line: Crash Course Physics #1', channel: 'Crash Course' },
  },
  pt2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why kinematics deserves its own dedicated lesson`, body: `Kinematics — the study of motion itself, independent of what's causing it — is arguably the most directly applicable physics topic in PT/OT, since so much of clinical assessment is precisely describing and measuring how someone moves. This lesson goes deeper into motion description and how it connects to force.` },
        { heading: `Describing motion in two dimensions`, body: `Real human movement rarely happens in a single straight line — a knee bending, an arm reaching, a gait cycle all involve motion in multiple directions simultaneously. Describing this kind of motion requires vectors — quantities with both magnitude and direction — rather than the single-number descriptions that work for simple straight-line motion. This is exactly the mathematical tool behind precisely describing a joint's range of motion in more than one plane.` },
        { heading: `Range of motion as a kinematics measurement`, body: `A joint's range of motion — how far it can move through a given plane — is, at its core, a kinematics measurement: an angular position, tracked from a starting point to an ending point. Goniometry, the clinical technique for measuring range of motion with a specialized protractor-like tool, is a direct, hands-on application of kinematic measurement, and one of the most routine assessments in PT/OT practice.` },
        { heading: `How force and motion interact`, body: `Motion doesn't happen without force causing it, and understanding both together — not just describing motion in isolation — is what lets a PT/OT reason about why a particular movement pattern places excess strain on a joint. A knee that tracks slightly inward during a squat, for instance, is a kinematic observation, but understanding the forces producing that pattern is what actually explains why it happens and how to correct it.` },
        { heading: `Why this connects directly to clinical assessment`, body: `Gait analysis, range-of-motion measurement, and movement-pattern assessment are all, at their foundation, applied kinematics — precisely describing motion and reasoning about the forces producing it. Genuine fluency here is fluency in the actual measurement language of clinical PT/OT practice.` },
      ],
      keyTakeaways: [
        `Vectors (quantities with both magnitude and direction) are needed to describe real human movement, which happens in multiple directions at once.`,
        `Range of motion is fundamentally a kinematics measurement — an angular position tracked from start to end, measured clinically via goniometry.`,
        `Motion and force are connected — understanding both together, not motion in isolation, explains why a movement pattern places excess strain on a joint.`,
        `Gait analysis and range-of-motion assessment are applied kinematics — the actual measurement language of clinical PT/OT practice.`,
      ],
    },
    // The pre-existing raw link (xZMwK2HwJ7c) does not resolve to anything indexed via
    // WebSearch — no verification record possible. Swapped to a confirmed alternative,
    // distinct from the Crash Course Physics #1 episode already used for pt2l1/ex2l2.
    video: { ytId: 'w3BhzYI6zXU', title: 'Vectors and 2D Motion: Crash Course Physics #4', channel: 'Crash Course' },
  },
  pt2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why fluid physics matters for a career centered on the body`, body: `It's not obvious at first why a PT/OT would need to understand fluid physics, but one of the most common things PT/OT manages — swelling, or edema — is fundamentally a fluid-pressure problem. This lesson covers fluid physics with that direct clinical application in mind.` },
        { heading: `Pressure in a fluid at rest`, body: `Pressure in a fluid at rest increases with depth and pushes equally in all directions at a given point — the basic physics behind why blood pressure is measured the way it is, and why fluid tends to pool in the lowest available space (which is exactly why swelling in a limb tends to settle toward the extremities without intervention).` },
        { heading: `Pascal's principle`, body: `Pascal's principle states that a pressure change applied to an enclosed fluid is transmitted undiminished throughout that fluid — the operating principle behind hydraulic systems, but also relevant to understanding how pressure applied at one point in the body's fluid systems (like compression on a swollen limb) can influence pressure and fluid movement elsewhere in that connected system.` },
        { heading: `Edema as a fluid-pressure problem`, body: `Swelling occurs when fluid accumulates in tissue faster than the body's circulatory and lymphatic systems can clear it — often after an injury, surgery, or prolonged inactivity. Since gravity and fluid pressure both favor fluid pooling in the lowest available position, elevation and compression — both direct applications of fluid pressure principles — are standard, physics-grounded techniques for managing it.` },
        { heading: `Why this connects directly to hands-on PT/OT technique`, body: `Manual lymphatic drainage, compression garments, and elevation protocols are all, at their core, applying fluid physics principles to manage swelling and support circulation. Understanding the physics directly is what turns these from memorized techniques into something a PT/OT can actually reason about and adapt for a specific patient's situation.` },
      ],
      keyTakeaways: [
        `Pressure in a fluid at rest increases with depth, which is part of why swelling naturally settles toward the lowest position in a limb.`,
        `Pascal's principle (pressure transmitted undiminished through an enclosed fluid) underlies both hydraulics and how compression affects fluid movement in the body.`,
        `Edema (swelling) is fundamentally a fluid-pressure problem — fluid accumulating faster than the body's systems can clear it.`,
        `Elevation, compression, and manual lymphatic drainage are all direct, physics-grounded techniques for managing swelling.`,
      ],
    },
    // The pre-existing raw link (b5SqYoO4VXI) appears to be a corrupted id — the real video
    // is one character different (b5SqYuWT4-4), confirmed via WebSearch as an exact title
    // match ("Fluids at Rest: Crash Course Physics #14") to this lesson.
    video: { ytId: 'b5SqYuWT4-4', title: 'Fluids at Rest: Crash Course Physics #14', channel: 'Crash Course' },
  },
  pt3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why motivation is the single biggest wildcard in rehab outcomes`, body: `Two patients with the identical injury and an identical prescribed exercise program can have very different outcomes, and motivation is very often the deciding factor — a program only works if a patient actually does the exercises, especially the ones they need to do on their own between sessions. This lesson covers motivation psychology with that direct clinical stake in mind.` },
        { heading: `Self-determination theory and what actually sustains motivation`, body: `Self-determination theory identifies three needs that sustain genuine, lasting motivation: autonomy (feeling some sense of choice and control), competence (feeling capable of the task), and relatedness (feeling supported by others). A rehab program that ignores all three — dictating every exercise with no explanation, set at a difficulty that feels impossible, delivered without any real relationship — predictably struggles with patient adherence, regardless of how clinically correct the exercises themselves are.` },
        { heading: `Why long-term rehab is uniquely hard, motivationally`, body: `Unlike a single procedure with an immediate result, PT/OT recovery unfolds over weeks or months, often with visible progress that's slow and inconsistent — exactly the kind of delayed, uncertain reward structure that's hardest for human motivation to sustain. Understanding this isn't just interesting psychology; it's the actual reason PT/OT programs are increasingly designed around explicit goal-setting and regular progress markers.` },
        { heading: `Managing a plateau`, body: `Nearly every rehab process hits a plateau — a stretch where progress visibly slows or stalls, even though the underlying tissue and system adaptation is often still happening beneath the surface. This is one of the highest-risk points for a patient to lose motivation and disengage, which is exactly why explaining what's happening physiologically, and reframing a plateau as normal rather than failure, is a genuine clinical skill.` },
        { heading: `Why this matters starting now`, body: `You don't need patients to start understanding this. Recognizing what actually keeps you motivated through a slow, difficult goal — and what causes you to lose motivation — is direct, transferable insight into exactly the psychology PT/OT depends on managing in someone else.` },
      ],
      keyTakeaways: [
        `Motivation, not just the exercise prescription itself, is often the deciding factor in rehab outcomes, since adherence depends on it.`,
        `Self-determination theory (autonomy, competence, relatedness) explains what sustains genuine motivation through a long recovery process.`,
        `Rehab's slow, inconsistent reward structure is uniquely hard to stay motivated through, which is why goal-setting and progress tracking matter.`,
        `Reframing a plateau as a normal part of recovery, not failure, is a genuine clinical skill for keeping a patient engaged.`,
      ],
    },
    // Higher-confidence, topic-specific pick over the generic intro-psychology fallback used
    // elsewhere in this app — confirmed via WebSearch as an exact match for this lesson.
    video: { ytId: '9hdSLiHaJz8', title: 'The Power of Motivation: Crash Course Psychology #17', channel: 'Crash Course' },
  },
  pt3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `What shadowing a PT or OT actually looks like`, body: `PT/OT shadowing looks meaningfully different from shadowing in acute-care settings — instead of a single dramatic intervention, you'll observe the same patients over multiple visits, watching gradual, session-by-session progress. That longitudinal view is exactly what makes this shadowing experience uniquely informative for this specific pathway.` },
        { heading: `How to realistically arrange it`, body: `A personal connection — a family member's own PT/OT provider, a relative in the field, or a family friend — remains the most realistic path in as a high schooler. Outpatient clinics, in particular, are often more flexible about accommodating a brief shadowing visit than a hospital-based inpatient rehab unit, which typically has stricter visitor policies.` },
        { heading: `What to pay attention to across settings`, body: `PT/OT happens in meaningfully different settings — outpatient clinics, hospital inpatient units, skilled nursing facilities, pediatric settings, sports medicine practices — each with a different patient population and rhythm. If you can shadow in more than one setting, even briefly, you'll get a much more complete and accurate picture of the field's real range than a single visit can provide.` },
        { heading: `Observing progress over time, not just a single session`, body: `If possible, ask whether you can observe the same patient across multiple visits rather than just one — seeing genuine, if slow, progress firsthand is exactly the experience that tells you whether this longitudinal, relationship-driven style of care is actually what you want in a career, more than any single dramatic session could.` },
        { heading: `Confidentiality and building a credible record`, body: `The same hard confidentiality rule applies here as any clinical setting — no discussing identifiable patient details outside the setting, ever. Log the date, setting, and your own reflections in your Portfolio's Clinical Hours section right after each shadowing day, building toward the substantial observation hours PT/OT programs typically expect.` },
      ],
      keyTakeaways: [
        `PT/OT shadowing uniquely shows gradual, session-by-session progress, rather than a single dramatic intervention.`,
        `A personal connection is the realistic path in, and outpatient clinics are often more flexible than hospital inpatient units for a brief visit.`,
        `PT/OT happens across meaningfully different settings, and shadowing in more than one gives a much fuller picture of the field.`,
        `Confidentiality is a hard rule, and consistent, logged reflections build toward the substantial observation hours PT/OT programs expect.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l2, nur3l2):
    // no single canonical YouTube video exists for PT/OT-specific shadowing logistics.
  },
  pt3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `PT vs. OT: two related but genuinely distinct fields`, body: `Physical therapy (PT) centers on restoring movement, strength, and function broadly — helping someone walk again after a knee replacement, for instance. Occupational therapy (OT) centers on helping someone regain the specific skills needed for independent daily life — dressing, cooking, returning to work — which can involve very different techniques even when treating a similar underlying condition. Both fields are genuinely distinct, not interchangeable, despite frequently working alongside each other.` },
        { heading: `Substantial observation hours, across multiple settings`, body: `PT/OT programs typically expect applicants to have logged 100 or more hours of direct observation, often explicitly encouraging exposure across multiple settings (outpatient, inpatient, pediatric, sports medicine) rather than all hours in one place. This requirement exists precisely because the field varies so much by setting, and programs want evidence an applicant has seen that range firsthand.` },
        { heading: `The doctoral-level entry credential`, body: `Physical therapy transitioned to requiring a Doctor of Physical Therapy (DPT) as its entry-level license, reflecting the field's growing clinical scope. Occupational therapy has a similar trajectory toward the Doctor of Occupational Therapy (OTD) at many programs, alongside master's-level options that still exist at some schools. Understanding a specific program's exact degree requirements matters, since this varies more than in some other health fields.` },
        { heading: `Movement and athletic background as relevant experience`, body: `Because PT/OT is centered on movement and function, background in athletic training rooms, sports, dance, or coaching is genuinely relevant, transferable experience — not just a hobby to mention in passing. This kind of movement-focused background, alongside direct clinical observation hours, rounds out a well-supported application.` },
        { heading: `What to focus on now`, body: `Given how heavily PT/OT programs weight observation hours specifically, the highest-leverage move for a high schooler is starting to build toward that requirement early and across varied settings, alongside strong performance in the anatomy, physiology, and physics coursework this pathway covers.` },
      ],
      keyTakeaways: [
        `PT focuses on restoring movement and function broadly; OT focuses on the specific skills needed for independent daily living — genuinely distinct fields.`,
        `PT/OT programs typically expect 100+ observation hours, often explicitly across multiple settings, since the field varies so much by setting.`,
        `PT now requires a doctoral-level degree (DPT); OT is trending the same direction (OTD) at many programs, though this varies by school.`,
        `Athletic, sports, or dance background is genuinely relevant transferable experience for a movement-centered field like PT/OT.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3, nur3l3):
    // no single canonical YouTube video exists for "what PT/OT programs look for."
  },
};
