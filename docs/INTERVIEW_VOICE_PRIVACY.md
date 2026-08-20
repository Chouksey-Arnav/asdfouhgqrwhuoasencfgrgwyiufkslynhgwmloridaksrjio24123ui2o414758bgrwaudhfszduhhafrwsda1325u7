# Running a minor's voice through a third-party API

**Status:** reviewed, disclosure corrected in both legal documents, consent gate shipped, document
versions bumped (Terms and Privacy Policy both to 1.1.0, effective 2026-08-20).
**Scope:** the Live Voice Interview and any other feature that opens the microphone.
**Owner of the claim:** `src/legal/privacy.js` §4, §6, and §12; `src/legal/terms.js` §5;
`src/legal/legalConfig.js` (`SUBPROCESSORS`, `termsVersion`/`privacyVersion`).

## What we found

Before this change, the Privacy Policy said, under "What we do not collect":

> We do not access your camera, microphone, contacts, or files, except that the interview simulator
> uses your browser's speech features **locally on your device** when you start it, and **we do not
> record or transmit that audio**.

The second half of that sentence was false for most of our users.

The interview simulator uses two different browser APIs, and they have opposite privacy profiles:

| | API | Where the data goes |
|---|---|---|
| Interviewer's voice | `speechSynthesis` | Entirely on-device on every platform we support. Nothing leaves the machine. |
| Student's answer | `SpeechRecognition` / `webkitSpeechRecognition` | **On Chrome, Edge, and other Chromium browsers, the browser streams the microphone audio to the vendor's cloud speech service (Google's, in practice) and returns a transcript.** Recent Safari transcribes on-device. |

So the claim held for the half of the feature that talks, and not for the half that listens. It is
also the half that matters: the audio in question is a 14–18-year-old's voice, and the recipient is a
third party we never named in the sub-processor list that the policy promises is complete.

By this repo's own standard — see the header of `scripts/verifyLegal.mjs` — a promise the product
does not keep is an FTC Act §5 deceptive practice on its own terms, independent of COPPA or the
CCPA, and it is the easiest thing in the world for anyone to prove, because the evidence is the
source tree.

## What is and is not true, precisely

- **We never receive the audio.** There is no upload to our servers, no recording, no storage, no
  retention period to disclose, because no audio artifact is ever created on our side. What our code
  receives from the browser is a text transcript, in memory, in the student's own tab.
- **We never send the transcript anywhere until the student sends their answer.** Interim results
  drive the on-screen text and the endpointing logic (`src/lib/turnTaking.js`) and nothing else.
- **The audio still leaves the device on Chromium.** That is the browser's own behaviour, under the
  browser vendor's privacy policy, not ours — but "it's the browser doing it" is an explanation, not
  a defence. The student is a minor and the practical outcome is the same, so it must be disclosed
  and consented to before the microphone opens.
- **We cannot reliably detect which behaviour a given browser uses.** There is no feature-detection
  for "does this recogniser run on-device." `recognitionSendsAudioOffDevice()` in `src/lib/speech.js`
  therefore assumes the worse case for everything that is not clearly Safari, and the UI tells the
  student the worse case. Guessing in our own favour is how a privacy claim becomes false.

## What shipped

1. **Consent before the microphone, not after.** `src/components/VoiceConsentGate.jsx` asks in plain
   language, and it is shown *before* the browser's own permission prompt — a padlock icon in the
   URL bar is not informed consent for a sixteen-year-old. The answer is stored in `localStorage`
   (`msp_voice_input_consent`) and can be withdrawn from the same screen at any time, which is
   surfaced as a visible "Turn voice answers off" control while consent is granted.
2. **Declining costs nothing.** Every part of the simulator — the panel, the follow-ups, the
   debrief, the scoring — works identically by typing. The consent screen presents "I'll type
   instead" as an equal choice rather than a downgrade, because consent that gates a feature the
   student wants is not freely given. Nothing is locked behind speaking aloud.
3. **The suggestion to involve a parent.** Where the audio does leave the device, the gate says so
   and says it is worth showing an adult first. We do not attempt to verify that; over-13 teenage
   users are outside COPPA's verifiable-parental-consent regime and the honest thing is a clear
   prompt rather than a checkbox that pretends to be verification.
4. **The Privacy Policy now says what actually happens.** §4's "what we do not collect" bullet was
   rewritten to stop claiming audio is never transmitted, and §6 gained a "Voice answers in the
   interview simulator" subsection covering the split between synthesis and recognition, what we
   receive, and what the browser does — with the consent commitment itself pulled into an emphasis
   block rather than left as one sentence in a bullet list, since it is the part a parent needs to
   actually see. §12 ("Your rights and choices") now names the in-app toggle explicitly, since
   withdrawing this particular consent doesn't need an email to us the way most rights do.
5. **The Terms of Service say it too, not just the Privacy Policy.** §5 ("The AI coach and other AI
   features") gained a matching "Voice answers in the interview simulator" subsection: what the two
   halves of the feature are, which one involves the browser vendor, and a plain-language line aimed
   at a parent of a user under 18. A promise this specific belongs in both documents, not filed only
   under the one a student is statistically less likely to open.
6. **The sub-processor table names it.** `SUBPROCESSORS` in `src/legal/legalConfig.js` now carries an
   entry for the browser's built-in speech-recognition service — role, what it receives, and where,
   split by browser (Chrome/Edge send to Google in the United States; recent Safari sends nothing).
   The policy calls that list complete, so an undisclosed recipient made the list itself a false
   statement.
7. **The document versions were bumped.** Adding a new disclosed recipient is exactly what Privacy
   Policy §15 defines as material, and §15 promises notice before it takes effect. `privacyVersion`
   and `termsVersion` moved from 1.0.0 to 1.1.0 and `effectiveDate`/`lastUpdated` moved to
   2026-08-20 — the first time either changed since the documents were established at 1.0.0 for
   2026-08-08. Because this bump corrects an inaccurate description of behaviour the feature already
   had, rather than expanding what the feature does, it takes effect immediately instead of after the
   Terms' 30-day delay for changes that alter the deal (Terms §22) — that delay is for changes that
   move the goalposts, not for a document catching up to what was already true.

## What we deliberately did not do

- **We did not switch to a hosted STT vendor.** It would give us better transcripts and a contract we
  control, but it would also mean *we* become the party uploading a minor's voice, with retention,
  a DPA, a breach surface, and a much harder consent story. The browser-native path keeps us out of
  the audio chain entirely. If this is ever revisited, it needs a data-processing agreement, a stated
  retention period (ideally zero-retention), a sub-processor entry, and re-consent — not a config
  change.
- **We did not add a "recording" indicator implying we hold a recording.** We don't. Suggesting
  otherwise would be its own inaccuracy.

## If you change any of this

Anything that opens the microphone, changes which service transcribes it, or adds audio upload
requires all of: the consent gate, the Privacy Policy §4 bullet, the Privacy Policy §6 subsection,
the matching Terms §5 subsection, a `SUBPROCESSORS` entry, and — because a new or changed recipient
is a material change under Privacy Policy §15 — a version bump on `termsVersion`/`privacyVersion`
and an updated `effectiveDate`/`lastUpdated`. `npm run verify:legal` guards the pairing between the
code and the document; it cannot guard a claim nobody wrote down, and it does not know when a change
is material enough to need a new version number — that judgment call is on whoever makes the change.
