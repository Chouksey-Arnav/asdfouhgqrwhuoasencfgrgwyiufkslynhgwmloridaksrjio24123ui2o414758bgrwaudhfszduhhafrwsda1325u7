// Information and Ideas — 26% of Reading & Writing.
// Skills: central_ideas, command_evidence_text, command_evidence_quant, inferences.
//
// Quantitative-evidence items carry a `figure` object rendered as a real table
// by the question player, never as an image — it keeps the bank diffable,
// searchable, and accessible to screen readers.
export const RW_INFO_IDEAS_QUESTIONS = [
  // ── Central Ideas and Details ─────────────────────────────────────────────
  {
    id: 'sat-rw-cid-0001', section: 'rw', domain: 'info_ideas', skill: 'central_ideas',
    difficulty: 'E', format: 'mcq', trap: 'too_extreme', targetSeconds: 70,
    stimulus: 'The vaquita, a porpoise found only in the northern Gulf of California, is now thought to number fewer than a dozen individuals. Its decline is almost entirely a by-product: the animals drown in gillnets set for totoaba, a fish whose swim bladder commands high prices abroad. Conservation efforts that target the vaquita directly have achieved little, because the pressure driving its decline is not aimed at it.',
    q: 'Which choice best states the main idea of the text?',
    ch: [
      'The vaquita has declined mainly because it has been deliberately hunted for its meat.',
      'The vaquita is threatened by fishing aimed at another species, blunting vaquita-focused efforts.',
      'Totoaba fishing should be banned throughout the whole of the Gulf of California.',
      'Fewer than a dozen vaquitas are now thought to remain anywhere in the wild.',
    ],
    ans: 1,
    exp: 'The passage makes two linked points: the threat is incidental (gillnets set for totoaba) and that is precisely why vaquita-focused efforts underperform. Only one choice contains both.',
    distractorExp: [
      'The text says the opposite — the decline is "almost entirely a by-product", not deliberate.',
      'Correct. Captures both the incidental cause and its consequence for conservation.',
      'The text never makes a policy recommendation.',
      'True, but it is a supporting detail, not the main idea.',
    ],
  },
  {
    id: 'sat-rw-cid-0002', section: 'rw', domain: 'info_ideas', skill: 'central_ideas',
    difficulty: 'M', format: 'mcq', trap: 'out_of_scope', targetSeconds: 70,
    stimulus: 'Standard economic models long treated household labor as outside the economy, on the grounds that it is unpaid and therefore unmeasured. Waring’s 1988 critique did not dispute the measurement problem; she argued that the choice of what to measure was itself a political act, and that a national accounting system which registers an oil spill as growth while registering a raised child as nothing is not neutral but merely conventional.',
    q: 'Which choice best states the main idea of the text?',
    ch: [
      'Waring showed that household labor can be measured accurately using existing methods.',
      'Waring argued that what a country counts is a political choice.',
      'Waring believed oil spills should be excluded from measures of economic growth.',
      'Standard economic models were mathematically flawed in ways Waring corrected.',
    ],
    ans: 1,
    exp: 'The passage explicitly says Waring "did not dispute the measurement problem" — her claim was about the politics of what gets counted.',
    distractorExp: [
      'The text says she did not dispute the measurement problem, so this misses her actual argument.',
      'Correct. "Not neutral but merely conventional" is the thesis.',
      'The oil spill is an illustration of the accounting logic, not a policy proposal.',
      'Her critique was about what is counted, not about mathematical error.',
    ],
  },
  {
    id: 'sat-rw-cid-0003', section: 'rw', domain: 'info_ideas', skill: 'central_ideas',
    difficulty: 'M', format: 'mcq', trap: 'half_right', targetSeconds: 70,
    stimulus: 'Sourdough starters are often described as containing a stable community of yeasts and bacteria. A 2021 survey of five hundred home starters found that while the same few species recurred worldwide, the *proportions* varied enormously between kitchens and shifted within a single starter over months — and that these proportions, not the species list, predicted the flavor of the resulting bread.',
    q: 'Which choice best states the main idea of the text?',
    ch: [
      'Sourdough starters around the world turn out to contain entirely different microbial species.',
      'A starter’s flavor tracks the relative abundance of its microbes, not which species it holds.',
      'Home sourdough starters are considerably less stable over time than commercial ones are.',
      'The 2021 survey showed that sourdough microbiology is simply too variable to study usefully.',
    ],
    ans: 1,
    exp: 'The final clause is the payoff: proportions, "not the species list", predicted flavor.',
    distractorExp: [
      'The text says the same few species recurred worldwide.',
      'Correct. Abundance over identity is the finding.',
      'No commercial comparison appears in the text.',
      'The survey produced a clear predictive result, so "too variable to study" contradicts it.',
    ],
  },

  // ── Command of Evidence (Textual) ─────────────────────────────────────────
  {
    id: 'sat-rw-cet-0001', section: 'rw', domain: 'info_ideas', skill: 'command_evidence_text',
    difficulty: 'M', format: 'mcq', trap: 'out_of_scope', targetSeconds: 80,
    stimulus: 'A researcher claims that the ruins at Great Zimbabwe were built by local Shona communities rather than by foreign traders, as nineteenth-century European accounts insisted.',
    q: 'Which finding, if true, would most directly support the researcher’s claim?',
    ch: [
      'Imported glass beads and Chinese porcelain were recovered from several rooms across the site.',
      'The stonework matches that of smaller settlements built by Shona communities nearby.',
      'The site appears to have been occupied continuously for roughly three hundred years.',
      'Nineteenth-century European visitors produced unusually detailed drawings of the enclosures.',
    ],
    ans: 1,
    exp: 'The claim is about *who built it*. Construction technique shared with known local settlements speaks directly to builders.',
    distractorExp: [
      'Imported goods show trade contact, which if anything is what the foreign-builder account leaned on. It does not establish who built the walls.',
      'Correct. Shared construction technique with known Shona sites is direct evidence of local builders.',
      'Duration of occupation says nothing about who did the building.',
      'The existence of European drawings is irrelevant to the identity of the builders.',
    ],
  },
  {
    id: 'sat-rw-cet-0002', section: 'rw', domain: 'info_ideas', skill: 'command_evidence_text',
    difficulty: 'H', format: 'mcq', trap: 'half_right', targetSeconds: 85,
    stimulus: 'In a study of urban foxes, Nakamura hypothesised that boldness around humans is learned within a fox’s lifetime rather than inherited.',
    q: 'Which finding would most weaken Nakamura’s hypothesis?',
    ch: [
      'Foxes born in city centers approach humans far more readily than foxes born in the outer suburbs.',
      'Cubs cross-fostered from bold urban parents to shy rural ones grow up as bold as their birth parents.',
      'Adult foxes relocated from rural areas into the city grow noticeably bolder over eighteen months.',
      'Bold foxes manage to obtain considerably more food from human sources than shy foxes do.',
    ],
    ans: 1,
    exp: 'Cross-fostering separates upbringing from ancestry. If cubs raised by shy parents still turn out bold like their biological parents, boldness is tracking inheritance, not learning.',
    distractorExp: [
      'Consistent with learning — city cubs get more human exposure. This supports Nakamura rather than weakening her.',
      'Correct. Cross-fostering isolates the variable, and the result points to inheritance.',
      'Relocated adults becoming bolder is direct evidence *for* learning.',
      'This explains why boldness might be advantageous but says nothing about how it arises.',
    ],
  },
  {
    id: 'sat-rw-cet-0003', section: 'rw', domain: 'info_ideas', skill: 'command_evidence_text',
    difficulty: 'M', format: 'mcq', trap: 'too_extreme', targetSeconds: 80,
    stimulus: 'In the novel, the narrator repeatedly describes her childhood home in terms of what has been removed from it — the piano sold, the orchard cleared, the third floor closed off. A critic argues that these descriptions establish the narrator’s sense of her own life as defined by absence.',
    q: 'Which quotation from the novel would best support the critic’s argument?',
    ch: [
      '“The house was older than anyone in the village could account for.”',
      '“I gave directions by what was gone: turn where the elm stood.”',
      '“In the summers the light came through the west windows until nearly ten.”',
      '“My mother had grown up in the same rooms, and her mother before her.”',
    ],
    ans: 1,
    exp: 'The critic’s point is that the narrator understands her world through absences. Navigating by a tree that no longer exists is exactly that habit of mind.',
    distractorExp: [
      'Age of the house is not absence.',
      'Correct. She orients herself by what is missing — absence as her organizing frame.',
      'A present, positive sensory detail; it works against the argument.',
      'Continuity across generations is the opposite of loss.',
    ],
  },

  // ── Command of Evidence (Quantitative) ────────────────────────────────────
  {
    id: 'sat-rw-ceq-0001', section: 'rw', domain: 'info_ideas', skill: 'command_evidence_quant',
    difficulty: 'M', format: 'mcq', trap: 'percent_of_what', targetSeconds: 85,
    figure: {
      type: 'table',
      title: 'Germination rate of stored seeds after five years, by storage method',
      columns: ['Species', 'Room temperature (%)', 'Refrigerated (%)', 'Frozen (%)'],
      rows: [
        ['Wild rye', '12', '54', '81'],
        ['Prairie clover', '31', '49', '52'],
        ['Purple coneflower', '8', '61', '88'],
        ['Little bluestem', '44', '58', '60'],
      ],
    },
    stimulus: 'A seed bank tested whether storage temperature affects long-term viability across four prairie species. Researchers concluded that freezing offers the largest benefit for species that store poorly at room temperature, while species that already tolerate room-temperature storage gain comparatively little from it.',
    q: 'Which choice best describes data from the table that support the researchers’ conclusion?',
    ch: [
      'Wild rye and coneflower rise from 12% and 8% to 81% and 88%, but bluestem only 44% to 60%.',
      'All four of the species tested show higher germination when frozen than when kept at room temperature.',
      'Prairie clover germinates at 31% at room temperature and at 52% once it has been frozen.',
      'Purple coneflower records the single highest frozen germination rate of the four species tested.',
    ],
    ans: 0,
    exp: 'The conclusion is a contrast between poor room-temperature storers (large freezing benefit) and good ones (small benefit). Only the first choice supplies both sides of that contrast.',
    distractorExp: [
      'Correct. Gives the big gains for the two poor storers and the small gain for the good storer.',
      'True but insufficient — it establishes that freezing helps, not that it helps *unevenly*, which is the actual claim.',
      'A single species cannot demonstrate a contrast between two groups.',
      'Highest absolute rate is not the same as largest benefit, and one data point cannot support a comparative claim.',
    ],
  },
  {
    id: 'sat-rw-ceq-0002', section: 'rw', domain: 'info_ideas', skill: 'command_evidence_quant',
    difficulty: 'H', format: 'mcq', trap: 'out_of_scope', targetSeconds: 90,
    figure: {
      type: 'table',
      title: 'Mean daily foraging distance (km) of tagged bumblebees, by landscape type',
      columns: ['Landscape', '2018', '2019', '2020'],
      rows: [
        ['Continuous meadow', '0.9', '1.0', '0.9'],
        ['Fragmented meadow', '2.4', '2.6', '2.9'],
        ['Suburban gardens', '1.3', '1.2', '1.4'],
        ['Intensive cropland', '3.1', '3.4', '3.6'],
      ],
    },
    stimulus: 'Ostrowski argues that habitat fragmentation, rather than the total area of forage available, is what forces bumblebees into energetically costly long-distance foraging. She notes that suburban gardens, though small and scattered in absolute terms, are densely distributed.',
    q: 'Which choice most effectively uses data from the table to support Ostrowski’s argument?',
    ch: [
      'Foraging distances in intensive cropland rose each year, from 3.1 km in 2018 to 3.6 km in 2020.',
      'Suburban bees foraged 1.2–1.4 km — nearer continuous meadow than fragmented.',
      'Continuous meadow produced the shortest foraging distances in every year measured.',
      'Fragmented meadow and intensive cropland both showed increases between 2018 and 2020.',
    ],
    ans: 1,
    exp: 'Her argument needs a case where forage area is small but *distribution is dense*, and foraging stays short. Suburban gardens are exactly that test case, and the comparison to both meadow types makes the point.',
    distractorExp: [
      'Shows a trend in one landscape but does not isolate fragmentation from total area.',
      'Correct. Small-but-dense gardens behave like continuous habitat, which is precisely her claim.',
      'Unsurprising and consistent with either explanation — continuous meadow has both large area and low fragmentation.',
      'A shared trend in two fragmented landscapes does not separate the two competing explanations.',
    ],
  },

  // ── Inferences ────────────────────────────────────────────────────────────
  {
    id: 'sat-rw-inf-0001', section: 'rw', domain: 'info_ideas', skill: 'inferences',
    difficulty: 'M', format: 'mcq', trap: 'too_extreme', targetSeconds: 75,
    stimulus: 'Desert-dwelling Namib beetles harvest drinking water from fog by tilting their bodies into the wind; droplets condense on their shells and run down to the mouth. Engineers have replicated the shell’s alternating water-attracting and water-repelling patches in synthetic films, achieving comparable collection rates in laboratory fog chambers. Field deployments, however, have so far collected far less than the chambers predicted, and the gap widens as wind speed becomes more variable. This suggests that ______',
    q: 'Which choice most logically completes the text?',
    ch: [
      'the synthetic films fail to reproduce the beetle’s surface chemistry with any accuracy.',
      'the beetle’s posture control, not surface chemistry alone, drives its collection efficiency.',
      'fog is a far less reliable source of drinking water in deserts than was previously believed.',
      'laboratory fog chambers systematically overestimate collection rates for all known materials.',
    ],
    ans: 1,
    exp: 'The films match the beetle in still, controlled fog but fall behind in variable wind — and the beetle actively *tilts into the wind*. The missing ingredient is behavior, not chemistry.',
    distractorExp: [
      'The chamber results show the chemistry is reproduced well; the gap only appears with variable wind.',
      'Correct. The gap tracks wind variability, and posture is what the film lacks.',
      'The passage is about collection technology, not about how much fog deserts get.',
      '"All materials" overgeneralises well beyond the single case described.',
    ],
  },
  {
    id: 'sat-rw-inf-0002', section: 'rw', domain: 'info_ideas', skill: 'inferences',
    difficulty: 'H', format: 'mcq', trap: 'half_right', targetSeconds: 80,
    stimulus: 'Linguists once assumed that a language’s color vocabulary expands in a fixed order, with terms for blue arriving late. Analysis of the Berinmo language of Papua New Guinea complicated this: Berinmo has no single term covering the English range of "blue", but it does draw a boundary English lacks, between two shades English speakers group together as "green". Speakers were faster than English speakers at discriminating across that boundary and slower across the blue-green boundary English marks. It follows that ______',
    q: 'Which choice most logically completes the text?',
    ch: [
      'Berinmo speakers perceive fewer colors than English speakers do.',
      'color discrimination is shaped in part by the boundaries a speaker’s language draws.',
      'the fixed-order theory of color vocabulary has been confirmed by the Berinmo data.',
      'Berinmo lacks the vocabulary needed to describe natural landscapes.',
    ],
    ans: 1,
    exp: 'Each group was faster across the boundary its own language marks and slower across the other. The performance difference tracks the vocabulary difference.',
    distractorExp: [
      'They did not perceive *fewer* colors — they were faster on a boundary English speakers were slower on.',
      'Correct. Discrimination speed follows the language’s own category boundaries.',
      'The data complicate the fixed-order theory; the passage says so explicitly.',
      'Nothing in the passage concerns describing landscapes.',
    ],
  },
  {
    id: 'sat-rw-inf-0003', section: 'rw', domain: 'info_ideas', skill: 'inferences',
    difficulty: 'M', format: 'mcq', trap: 'out_of_scope', targetSeconds: 75,
    stimulus: 'Restorers cleaning a seventeenth-century panel found that the varnish they removed had yellowed enough to shift the apparent color of the sky from gray-green to warm brown. Contemporary written descriptions of the painting consistently praise its "cold northern light" — a description that matches the cleaned surface but not the state of the painting as it appeared for most of the intervening centuries. This implies that ______',
    q: 'Which choice most logically completes the text?',
    ch: [
      'the written descriptions were composed before the varnish yellowed much.',
      'the restorers removed original paint along with the varnish.',
      'seventeenth-century viewers preferred cooler color palettes than later viewers did.',
      'the painting was repainted at some point after the seventeenth century.',
    ],
    ans: 0,
    exp: 'The descriptions match the cleaned (original) appearance, not the yellowed one. The simplest reading is that they were written while the varnish was still clear.',
    distractorExp: [
      'Correct. The descriptions match the un-yellowed state, so they predate the yellowing.',
      'Nothing suggests damage; the cleaned surface matches the historical descriptions, implying success.',
      'The passage is about the physical state of the varnish, not about taste.',
      'Yellowing varnish already explains the change; repainting is an unsupported extra assumption.',
    ],
  },
];
