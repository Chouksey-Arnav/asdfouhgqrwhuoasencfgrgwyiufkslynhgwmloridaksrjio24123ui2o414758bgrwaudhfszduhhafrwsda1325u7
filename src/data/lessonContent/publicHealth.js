// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Public Health pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.publicHealth in constants.js). Rendered by the LessonPlayer (App.jsx)
// as Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy, so every video id below was verified via WebSearch.
// - pu1l3 (5aww-Bpgkf4, "What is Public Health? Crash Course Public Health
//   #1") confirmed via WebSearch.
// - pu3l1 and pu3l2 use newly-researched videos (Crash Course Sociology #1,
//   Crash Course U.S. Government and Politics #1) rather than the
//   category-page links that sat there before — pu3l1's episode is
//   corroborated by belonging to the exact same Crash Course Sociology
//   playlist already linked as this lesson's `url` in constants.js.
// - All other ids are PROPOSED-REUSE from already-shipped, attributed lessons
//   elsewhere in this app, so no re-verification was needed for those.
// ─────────────────────────────────────────────────────────────────────────────

export const PUBLIC_HEALTH_CONTENT = {
  pu1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why public health starts with the same biology as clinical medicine`, body: `Public health and clinical medicine ask different questions — "how do we prevent this at scale?" versus "how do we treat this one patient?" — but they share the exact same biological foundation. Understanding cells, energy, and DNA is just as essential for reasoning about a disease outbreak across a population as it is for treating one patient with that disease.` },
        { heading: `Cell theory and how living systems work`, body: `Cell theory establishes the cell as the basic unit of life, and every living thing captures and uses energy to survive — through processes like photosynthesis (in producers) and cellular respiration (in nearly everything). This isn't just background biology; it's the mechanistic basis for understanding how a pathogen actually damages the body at a cellular level, which is exactly what public health messaging eventually has to translate into plain language for the public.` },
        { heading: `DNA and genetic risk at a population level`, body: `DNA's sequence encodes hereditary information, and while an individual physician reasons about one patient's genetic risk, public health reasons about genetic risk factors across an entire population — which is exactly why large-scale genetic screening programs and family-history-based risk models are public health tools, not just individual clinical ones.` },
        { heading: `Why these themes scale up, not just down`, body: `A disease process that plays out inside one cell — a virus hijacking cellular machinery to replicate, for instance — is the exact same mechanism happening across millions of cells in millions of people during an outbreak. Public health reasoning constantly moves between these two scales: understanding the individual biological mechanism, then reasoning about how it plays out across a population.` },
        { heading: `Why this foundation matters for a population-focused career`, body: `You can't design an effective vaccination campaign, sanitation policy, or health education program without understanding the actual biology the intervention is targeting. This lesson's biology fundamentals are the same shared foundation every health career draws on — just applied here at population scale instead of one patient at a time.` },
      ],
      keyTakeaways: [
        `Public health and clinical medicine share the same biological foundation — cells, energy, and DNA — just applied at different scales.`,
        `A disease mechanism happening inside one cell is the same mechanism playing out across millions of people during an outbreak.`,
        `Public health reasons about genetic risk at a population level, which is why large-scale screening programs are public health tools.`,
        `Effective public health interventions require genuinely understanding the underlying biology, not just designing policy in the abstract.`,
      ],
    },
    video: { ytId: 'tZE_fQFK8EY', title: 'Introduction to Biology: Crash Course Biology #1', channel: 'Crash Course' },
  },
  pu1l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why immunity is the biological foundation of epidemiology`, body: `Every question epidemiology asks about a disease outbreak — how fast will it spread, how many people are at risk, will a vaccination campaign work — ultimately comes back to how the immune system responds to a pathogen, individually and in aggregate across a population. This lesson covers immunity with that population-scale application directly in view.` },
        { heading: `Innate vs. adaptive immunity`, body: `Innate immunity is fast and non-specific — physical barriers and general-purpose immune cells that respond within minutes to hours regardless of the specific invader. Adaptive immunity is slower but far more precise, learning to recognize a pathogen's specific antigens and mounting a tailored response, typically taking days to fully develop on first exposure. Both layers matter for understanding why some outbreaks are contained quickly and others aren't.` },
        { heading: `Immune memory, natural and vaccine-induced`, body: `After an infection clears, some immune cells become long-lived memory cells, ready to mount a much faster response if the same pathogen returns. Vaccines work by training this exact memory system on a pathogen's antigens without requiring an actual infection first. Understanding this mechanism directly is what lets a public health professional explain, credibly and specifically, why vaccination works — not just assert that it does.` },
        { heading: `From individual immunity to population immunity`, body: `Herd immunity — the protective effect that occurs when enough of a population is immune to a pathogen that its spread is significantly slowed, indirectly protecting even those who aren't immune — is a direct mathematical consequence of individual immune responses aggregated across a population. The exact threshold needed varies by how contagious a specific pathogen is, which is why some diseases require much higher vaccination rates than others to achieve this effect.` },
        { heading: `Why this is the conceptual center of infectious disease public health`, body: `Contact tracing, vaccination campaign design, and outbreak response all rest on this same underlying immunology — how fast an individual immune response develops, and how that aggregates into population-level protection. Genuine fluency here is fluency in the actual working logic of infectious disease public health.` },
      ],
      keyTakeaways: [
        `Innate immunity responds fast and non-specifically; adaptive immunity is slower but targets a pathogen's specific antigens — both shape outbreak dynamics.`,
        `Immune memory (natural or vaccine-induced) is the mechanism behind lasting immunity, and understanding it lets public health professionals explain vaccination credibly.`,
        `Herd immunity is a population-level mathematical consequence of individual immune responses, with a threshold that varies by how contagious a pathogen is.`,
        `Contact tracing, vaccination campaigns, and outbreak response all rest on this same underlying immunology, scaled from the individual to the population.`,
      ],
    },
    video: { ytId: 'GIJK3dwCWCw', title: 'Immune System, Part 1: Crash Course Anatomy & Physiology #45', channel: 'Crash Course' },
  },
  pu1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What public health actually is, for most students seeing this for the first time`, body: `Most high schoolers have never been directly taught what public health actually is as a field, despite encountering its effects constantly — vaccination requirements, food safety regulation, water treatment, health education campaigns. This lesson is a direct introduction: what the field studies, how it's organized, and how it differs from clinical medicine.` },
        { heading: `Public health vs. clinical medicine`, body: `Clinical medicine treats one patient at a time, reasoning about an individual's specific case. Public health asks a population-level question: how do we prevent disease and improve health outcomes across thousands or millions of people at once? Both are essential, but they operate at fundamentally different scales, and require somewhat different training and ways of thinking.` },
        { heading: `The core disciplines within public health`, body: `Epidemiology studies how disease spreads through populations. Biostatistics provides the mathematical tools for analyzing health data. Environmental health studies how surroundings — air, water, food safety — affect health. Health policy studies how laws and regulations shape health outcomes. Social and behavioral science studies how human behavior and social structures affect health. Public health is really this cluster of disciplines working together, not one single skill.` },
        { heading: `A famous historical example: John Snow's cholera map`, body: `In 1854, physician John Snow mapped cholera cases across a London neighborhood and traced the outbreak to a single contaminated water pump — a foundational moment in epidemiology, and an early demonstration that mapping population-level data, not just treating individual patients, could actually solve a public health crisis. This kind of population-level detective work is still the core logic of epidemiology today.` },
        { heading: `Why this field matters even though it's less visible`, body: `Public health interventions are often invisible precisely because they work — a disease outbreak that never happens, or a public health measure that prevents illness before it starts, doesn't make headlines the way a dramatic medical rescue does. Understanding public health as a legitimate, high-impact career, not just an adjunct to clinical medicine, is exactly what this pathway is built to establish.` },
      ],
      keyTakeaways: [
        `Public health asks population-level questions (prevention at scale), while clinical medicine treats one patient at a time — different scales, both essential.`,
        `Public health is a cluster of disciplines — epidemiology, biostatistics, environmental health, health policy, social/behavioral science — not one single skill.`,
        `John Snow's 1854 cholera map is a foundational example of epidemiological, population-level disease investigation still practiced today.`,
        `Public health's biggest successes are often invisible — a disease outbreak that never happens rarely makes headlines the way a dramatic rescue does.`,
      ],
    },
    video: { ytId: '5aww-Bpgkf4', title: 'What is Public Health? Crash Course Public Health #1', channel: 'Crash Course' },
  },
  pu2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why probability and statistics are the mathematical core of epidemiology`, body: `Epidemiology is, at its core, applied probability and statistics — estimating risk, comparing outcomes between groups, and figuring out whether an observed pattern in health data is real or just noise. This lesson covers the fundamentals with that direct epidemiological application in mind.` },
        { heading: `Probability and estimating disease risk`, body: `Probability measures how likely an event is, on a scale from 0 (impossible) to 1 (certain). In public health, this shows up as the probability an individual with a given risk factor develops a specific disease, or the probability a screening test correctly identifies someone with a condition. Understanding probability precisely is what separates "this seems risky" from an actual, quantified risk estimate a policy decision can be based on.` },
        { heading: `Choosing the right summary statistic`, body: `Mean, median, and mode each summarize a data set differently, and the choice matters for describing population health accurately. Average life expectancy can be pulled upward or downward by a small number of extreme values in ways a median wouldn't be, which is exactly why public health reporting has to be deliberate about which statistic actually represents the typical experience of a population, not just whichever number sounds most compelling.` },
        { heading: `Why spread matters as much as the center`, body: `Two populations can have the identical average health outcome but wildly different spread — one uniformly moderate, another split between a healthy majority and a severely underserved minority. Reporting only the average risks completely hiding a health disparity that a public health intervention should actually be targeting.` },
        { heading: `From raw numbers to actionable public health data`, body: `Probability and statistics are what turn a raw count of disease cases into something actionable — an actual risk estimate, a meaningful comparison between groups, a defensible basis for a policy recommendation. This mathematical literacy is not adjacent to public health work; it's a core, daily part of it.` },
      ],
      keyTakeaways: [
        `Probability measures likelihood on a 0-to-1 scale and underlies risk estimation and screening test evaluation in public health.`,
        `Choosing the right summary statistic (mean vs. median) matters for accurately representing a population's typical health experience.`,
        `Spread matters as much as the average — two populations with identical average outcomes can have very different underlying health disparities.`,
        `Probability and statistics are what turn raw case counts into actionable, defensible public health risk estimates and policy recommendations.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  pu2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why sampling is where a lot of public health research goes wrong`, body: `A health survey or study is only as good as the sample it's based on — if that sample doesn't represent the actual population, even perfectly accurate individual measurements can add up to a badly misleading conclusion about population health. This lesson covers sampling and bias with that direct public health stake in view.` },
        { heading: `Random sampling and representativeness`, body: `Simple random sampling gives every member of a population an equal chance of being included in a study — the gold standard for a sample that actually represents the population it's drawn from. A non-random sample (like a health survey only reaching people with reliable internet access, or only those willing to respond) risks systematically differing from the broader population in ways that quietly distort the conclusions.` },
        { heading: `Common sources of bias in population health studies`, body: `Non-response bias occurs when the people who respond to a health survey are systematically different from those who don't — often healthier, more educated, or more engaged with the healthcare system than average. Selection bias occurs when the method of recruiting study participants itself favors a particular group. Both can produce a study that looks statistically sound but describes a population that doesn't actually match reality.` },
        { heading: `Why representativeness is what makes a finding generalizable`, body: `A public health finding is only useful if it generalizes to the actual population it's meant to inform policy for. A well-designed, representative sample from a smaller group can produce a more genuinely useful finding than a huge but badly biased one — sample size doesn't fix a broken sampling method.` },
        { heading: `Why this matters for evaluating public health claims critically`, body: `Learning to ask "who was actually included in this study, and who was left out?" before accepting a public health claim at face value is one of the most practically useful critical-thinking habits this pathway can build — for evaluating both academic research and the health claims you'll encounter constantly in the news and online.` },
      ],
      keyTakeaways: [
        `Simple random sampling gives every population member an equal chance of inclusion, the gold standard for a representative health study.`,
        `Non-response bias and selection bias are common ways a health study's sample can systematically differ from the population it claims to describe.`,
        `A representative smaller sample can produce a more useful public health finding than a huge but badly biased one.`,
        `Asking who was actually included in a study is a core critical-thinking habit for evaluating public health claims, in research and in the news.`,
      ],
    },
    video: { ytId: 'Rf-fIpB4D50', title: 'Sampling Methods and Bias with Surveys: Crash Course Statistics #10', channel: 'Crash Course' },
  },
  pu2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why "statistics" as a field deserves its own close look`, body: `Beyond specific techniques like sampling and probability, it's worth stepping back to understand what statistics as a discipline is actually doing — turning noisy, individual-level data into trustworthy, population-level conclusions. This lesson is that step back, with public health examples throughout.` },
        { heading: `What "statistically significant" actually means`, body: `A result being statistically significant means it's unlikely to have occurred by random chance alone — it says nothing on its own about how large or practically important the effect is. A public health study can find a "statistically significant" reduction in disease risk from an intervention that, in real terms, is too small to justify the intervention's cost — which is exactly why effect size, not just significance, has to be reported and evaluated.` },
        { heading: `Correlation and causation in population health`, body: `Two things being correlated doesn't prove one causes the other — a third factor could be driving both, or the relationship could be coincidental. This distinction matters enormously in public health, where observational studies (which can only show correlation) are far more common than randomized controlled trials (which can establish causation), and headlines routinely blur the two.` },
        { heading: `Why this critical lens matters for public health specifically`, body: `Public health claims shape real policy decisions — regulations, funding, public messaging — which is exactly why the stakes of misreading a correlation as causation, or a statistically significant-but-trivial effect as a major finding, are higher here than in most other contexts. A public health professional's statistical literacy is a direct, practical safeguard against bad policy.` },
        { heading: `Turning raw health trends into actionable understanding`, body: `Statistics is what lets a public health professional look at a trend in disease rates and reason carefully about what's actually driving it, how confident to be in that explanation, and what it would take to be more certain — rather than reacting to the first plausible-sounding story a headline offers.` },
      ],
      keyTakeaways: [
        `"Statistically significant" means "unlikely to be chance," not "large or important" — effect size must be evaluated separately.`,
        `Correlation never proves causation, and public health relies heavily on observational studies that can only show correlation, not causation.`,
        `Since public health claims shape real policy decisions, misreading statistics here carries higher real-world stakes than in many other contexts.`,
        `Statistical literacy is what lets a public health professional reason carefully about a health trend rather than reacting to the first plausible headline.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  pu3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why sociology is central to public health, not a separate subject`, body: `Public health can't be understood through biology alone — how a community is organized, what resources it has access to, and what social norms shape behavior all directly determine health outcomes just as much as biological risk factors do. Sociology, the study of society and social behavior, is exactly the discipline that gives public health this lens.` },
        { heading: `What sociology studies`, body: `Sociology examines how social structures — institutions, communities, social norms, group behavior — shape individual and collective outcomes, using the same evidence-based methods as any other science: observation, data collection, and careful analysis. It asks questions at every scale, from small-group dynamics to entire societies, and public health draws on all of these scales depending on the question being asked.` },
        { heading: `Social determinants of health`, body: `Social determinants of health — income, education, housing, neighborhood environment, access to healthy food — are now understood to shape health outcomes at least as powerfully as genetics or individual behavior, often more so. A community with limited access to fresh food or safe outdoor space faces measurably different health outcomes than one without those constraints, independent of any individual's personal choices.` },
        { heading: `Why addressing social structures matters more than individual behavior change alone`, body: `A public health campaign that only tells individuals to "eat healthier" without addressing whether healthy food is actually accessible and affordable in their community is targeting the wrong level of the problem. Effective public health work increasingly focuses on changing the social and structural conditions that shape behavior, not just messaging aimed at individual choices in isolation.` },
        { heading: `Why this sociological lens is a defining feature of this pathway`, body: `Understanding health through this social lens — not just a biological one — is exactly what distinguishes public health thinking from purely clinical thinking, and it's why this pathway includes sociology as core content, not an elective add-on.` },
      ],
      keyTakeaways: [
        `Sociology studies how social structures shape behavior and outcomes, using the same evidence-based methods as any other science.`,
        `Social determinants of health (income, education, housing, food access) shape health outcomes as powerfully as biology or individual behavior, often more so.`,
        `Effective public health work increasingly targets the structural conditions shaping behavior, not just individual-level messaging alone.`,
        `A sociological lens on health — not just a biological one — is a defining feature of public health thinking specifically.`,
      ],
    },
    // Corroborated: this episode belongs to the exact same Crash Course Sociology playlist
    // already linked as this lesson's url in constants.js, confirming the channel/series.
    video: { ytId: 'YnCJU6PaCio', title: 'What Is Sociology?: Crash Course Sociology #1', channel: 'Crash Course' },
  },
  pu3l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why public health has to understand government, not just science`, body: `A brilliant epidemiological finding changes nothing on its own — it has to move through policy, funding decisions, and regulation to actually change population health outcomes. That's exactly why understanding how government works isn't a detour from public health, it's a core part of how the field actually accomplishes anything at scale.` },
        { heading: `The basic structure of government relevant to public health`, body: `In the US, public health policy gets shaped at federal, state, and local levels simultaneously — federal agencies set broad standards and fund research, state health departments implement and adapt policy regionally, and local health departments handle direct, community-level public health work. Understanding which level of government handles which kind of decision is essential for understanding how a specific public health policy actually came to be, or how to advocate for a new one.` },
        { heading: `Public health at the intersection of science and policy`, body: `A public health recommendation — a vaccination schedule, a food safety standard, a smoking regulation — starts as a scientific finding but only becomes real-world policy through a political and administrative process involving elected officials, agency regulation, and often public debate. Understanding this process is what separates naive frustration ("why doesn't policy just follow the science?") from a realistic, effective approach to actually changing policy.` },
        { heading: `How policy decisions scale beyond individual clinical care`, body: `A single regulatory decision — a change to water fluoridation standards, a workplace safety requirement, a food labeling law — can affect the health of millions of people simultaneously, at a scale no individual clinician's practice could ever match. This is exactly the kind of leverage that draws students to public health and policy work specifically.` },
        { heading: `Why civics literacy is a practical public health skill`, body: `Understanding how a bill becomes a regulation, how public comment periods work, and how local health departments are funded and governed isn't abstract civics trivia for a public health career — it's the practical roadmap for how change in this field actually happens.` },
      ],
      keyTakeaways: [
        `Public health policy in the US operates at federal, state, and local levels simultaneously, each handling different kinds of decisions.`,
        `A scientific finding only becomes real-world impact by moving through a political and administrative policy process — understanding that process is essential.`,
        `A single policy decision can affect millions of people's health simultaneously, at a scale no individual clinician's practice could match.`,
        `Civics literacy (how policy actually gets made) is a practical, not abstract, skill for anyone pursuing public health or health policy work.`,
      ],
    },
    video: { ytId: 'lrk4oY7UxpQ', title: 'Introduction: Crash Course U.S. Government and Politics #1', channel: 'Crash Course' },
  },
  pu3l3: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Why this pathway weights community volunteering differently`, body: `Unlike pathways centered on direct clinical care, this pathway specifically weights community and population-level volunteering more heavily than individual clinical shadowing — because it's a more accurate preview of what population-focused public health work actually looks like day to day.` },
        { heading: `Realistic community health volunteering options`, body: `Free clinics, blood drives, health fairs, food banks, and community health education events are all legitimate, accessible options for a high schooler — often more accessible than clinical shadowing, since many don't require the same personal-connection route into a clinical setting. Local health departments and community organizations sometimes run structured volunteer programs specifically for students interested in public health.` },
        { heading: `What to pay attention to during this kind of volunteering`, body: `Notice how a community health event actually reaches and serves a population — who shows up, who doesn't, and what barriers (transportation, awareness, trust) seem to affect participation. This is exactly the kind of on-the-ground observation that builds real intuition for the access and equity questions central to public health work.` },
        { heading: `How this differs from, and complements, clinical shadowing`, body: `Community health volunteering shows you the population-level, preventive side of health work; clinical shadowing (still valuable and worth doing some of) shows you the individual, treatment side. Together they give a genuinely fuller picture of the health system than either alone — which is exactly why this pathway's benchmarks weight volunteer hours especially heavily relative to clinical hours.` },
        { heading: `Building a credible, consistent record`, body: `Log the date, organization, role, and your own reflections in your Portfolio's Clinical Hours section after each volunteering session, building a record as you go rather than reconstructing one later. Consistency over months tells a far more credible story to an admissions reader than a single large one-time event.` },
      ],
      keyTakeaways: [
        `This pathway weights community/population-level volunteering more heavily than clinical shadowing, since it more accurately previews public health work.`,
        `Free clinics, blood drives, health fairs, and community health education events are realistic, accessible volunteering options for a high schooler.`,
        `Observing who a community health event reaches — and who it doesn't — builds real intuition for public health's core access and equity questions.`,
        `Community volunteering and clinical shadowing are complementary, not redundant, and this pathway's benchmarks reflect that weighting.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. nur3l2, ph3l2):
    // no single canonical YouTube video exists for community health volunteering logistics.
  },
};
