# Running a minor's voice through a third-party API

**Status:** reviewed, disclosure corrected, consent gate shipped.
**Scope:** the Live Voice Interview and any other feature that opens the microphone.
**Owner of the claim:** `src/legal/privacy.js` §4 and §6, `src/legal/legalConfig.js` (`SUBPROCESSORS`).

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
4. **The policy now says what actually happens.** §4's "what we do not collect" bullet was rewritten,
   and §6 gained a "Voice answers in the interview simulator" subsection covering the split between
   synthesis and recognition, what we receive, and what the browser does.
5. **The sub-processor table names it.** `SUBPROCESSORS` in `src/legal/legalConfig.js` now carries an
   entry for the browser's speech-recognition service, its role, the data, and the location. The
   policy calls that list complete, so an undisclosed recipient made the list itself a false
   statement.

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
requires all four of: the consent gate, the §4 bullet, the §6 subsection, and a `SUBPROCESSORS`
entry. `npm run verify:legal` guards the pairing between the code and the document; it cannot guard
a claim nobody wrote down.
