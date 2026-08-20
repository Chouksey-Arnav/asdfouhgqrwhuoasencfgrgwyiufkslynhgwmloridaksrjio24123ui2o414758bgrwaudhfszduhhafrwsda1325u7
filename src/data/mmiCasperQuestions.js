// Compatibility surface for the MMI/CASPer content.
//
// The content used to live here as two flat arrays — twenty-four one-line MMI prompts and
// fourteen CASPer scenarios. It now lives in two purpose-built files:
//
//   src/data/mmiStations.js  — the station library: door card, format, archetype, actor brief,
//                              collaborative task, reading clock, station clock, competencies,
//                              what the rater is looking for, and the way candidates usually fail.
//   src/data/casperTest.js   — CASPer as a test: sections, probes, one clock per section, and two
//                              honest test lengths.
//
// This module re-exports the flat views those files derive, so anything still importing the old
// names keeps working. Nothing should be added here — add stations to the library.
export {
  MMI_STATIONS, MMI_STATION_LIBRARY, getMmiStation, getStationById, stationsForFormat,
  STATION_FORMATS, ARCHETYPES, READING_SECONDS,
} from './mmiStations.js';

export {
  CASPER_SCENARIOS, CASPER_SECTIONS, CASPER_TEST_LENGTHS, SECTION_SECONDS,
  getCasperScenario, getCasperSection,
} from './casperTest.js';
