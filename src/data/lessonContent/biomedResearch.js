// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Biomedical & Clinical Research pathway. Original
// articles + a curated, properly-embedded YouTube video per lesson. Keyed by
// lesson id (see PATHS.biomedResearch in constants.js). Rendered by the
// LessonPlayer (App.jsx) as Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy, so every video id below was verified via WebSearch.
// - br1l2 (Qqe4thU-os8, "DNA Replication (Updated)") confirmed as part of the
//   Crash Course Biology series.
// - br1l3's original raw link (bKIpDtJdK8Q) is a Professor Dave Explains
//   video, not Crash Course — same issue already fixed in the Pharmacy batch
//   (ph2l3). Reuses that batch's confirmed swap.
// - br2l2's original raw link (Ue2m_l91W2w) doesn't resolve to anything
//   indexed — same issue already fixed in the PA batch (pa2l3). Reuses that
//   batch's confirmed swap.
// - br2l3's original raw link (Tj-w1W_pZ8M) doesn't resolve to anything
//   indexed — swapped for a newly confirmed alternative.
// - br3l2 (Rf-fIpB4D50, "Sampling Methods and Bias with Surveys: Crash Course
//   Statistics #10") confirmed via WebSearch.
// ─────────────────────────────────────────────────────────────────────────────

export const BIOMED_RESEARCH_CONTENT = {
  br1l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why this pathway goes deeper into biology than any other`, body: `Every other pathway in this app treats biology as a foundation for a clinical career. This one treats it as the actual subject matter — the "why" behind a disease, not just the "what to do about it." That means this review needs to go further than a surface pass: cell structure, division, and inheritance reviewed at roughly the depth a real research lab actually operates at.` },
        { heading: `Cell theory and organelle function, at research depth`, body: `Cell theory establishes the cell as the basic unit of life, but a researcher's version of that idea is more operational: which organelle does what, and how do you actually observe or manipulate it in an experiment? Mitochondria aren't just "the powerhouse of the cell" — they're a common target for studying metabolic disease, and their own separate DNA makes them a distinct object of genetic research in their own right.` },
        { heading: `Mitosis vs. meiosis, and why it matters for cell-culture work`, body: `Mitosis produces genetically identical daughter cells and is the mechanism behind cell-line growth in a culture flask — a technique underlying an enormous share of biomedical research. Meiosis, reserved for gamete production, is largely irrelevant to most lab techniques but essential for understanding genetic inheritance patterns in human subjects research. Knowing which process is actually relevant to a given research question is a basic but important discernment skill.` },
        { heading: `Mendelian inheritance as the foundation for reading genetics research`, body: `A Punnett square predicts the probability of specific allele combinations in offspring based on dominant/recessive inheritance. Modern genetics research has moved well beyond single-gene Mendelian traits into polygenic and environmentally-influenced ones, but Mendelian logic is still the starting vocabulary every genetics paper assumes you already have — you can't follow a discussion of a complex trait's heritability without first understanding the simple case.` },
        { heading: `Why this review sets up everything else in this pathway`, body: `DNA replication, transcription, translation, and the research-methods content later in this pathway all assume the cell/genetics foundation covered here. Building genuine fluency now — not surface familiarity — is what makes the rest of this pathway's deeper content land as building on something solid, rather than each new topic feeling disconnected from the last.` },
      ],
      keyTakeaways: [
        `Understanding organelle function at an operational level — not just "what it's called" — is what a real research context actually demands.`,
        `Mitosis underlies cell-culture techniques central to biomedical research; meiosis is more relevant to human-subjects genetics research specifically.`,
        `Mendelian inheritance is the starting vocabulary for reading any genetics research, even research on far more complex, polygenic traits.`,
        `This lesson's cell/genetics foundation is assumed by everything else in this pathway, from DNA replication to research methods.`,
      ],
    },
    video: { ytId: '8kK2zwjRV0M', title: 'DNA Structure and Replication: Crash Course Biology #10', channel: 'Crash Course' },
  },
  br1l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why DNA replication gets its own dedicated lesson here`, body: `DNA replication isn't just a fact to memorize — it's a process researchers actively study, manipulate, and exploit in the lab, from PCR (which relies directly on DNA polymerase) to studying what happens when replication goes wrong. This lesson covers the mechanism in real detail, with an eye toward why each step matters experimentally.` },
        { heading: `The step-by-step mechanism`, body: `Helicase unwinds the DNA double helix, breaking the hydrogen bonds between base pairs to create two separate template strands. Primase lays down short RNA primers to give DNA polymerase a starting point. DNA polymerase then reads each template strand and builds a new, complementary strand, but can only synthesize in one direction — which is why one new strand (the leading strand) is built continuously and the other (the lagging strand) is built in short fragments, later joined together by DNA ligase.` },
        { heading: `Why replication being semi-conservative matters experimentally`, body: `Semi-conservative replication means each new DNA molecule ends up with one original strand and one newly synthesized strand — a fact famously confirmed experimentally by the Meselson-Stahl experiment using labeled nitrogen isotopes to physically distinguish old DNA from new. This kind of experimental confirmation of a mechanism, not just accepting it as textbook fact, is exactly the mindset this pathway is trying to build.` },
        { heading: `Where replication errors come from, and why they matter to research`, body: `DNA polymerase makes an error roughly once per 10 billion bases copied — remarkably accurate, but not perfect, and even that low rate adds up across a genome copied trillions of times over a lifetime. Understanding where and how these errors occur is directly relevant to cancer research (many cancers involve failures in replication accuracy or repair) and to evolutionary biology (replication errors are the raw material for genetic variation).` },
        { heading: `The throughline to real biomedical research`, body: `PCR, a foundational lab technique used constantly in genetics and diagnostic research, is essentially DNA replication performed artificially in a test tube, using the same DNA polymerase enzyme. Understanding the natural biological process this deeply is what makes a technique like PCR feel like an application of something you understand, not a memorized lab protocol.` },
      ],
      keyTakeaways: [
        `DNA replication proceeds via helicase (unwinding), primase (priming), DNA polymerase (synthesis), and ligase (joining lagging-strand fragments).`,
        `Semi-conservative replication was experimentally confirmed (Meselson-Stahl), not just theoretically assumed — a model of how research actually validates a mechanism.`,
        `Rare replication errors are the raw material for genetic variation and are directly relevant to cancer research and evolutionary biology.`,
        `PCR, a foundational research technique, is essentially DNA replication performed artificially using the same natural enzyme, DNA polymerase.`,
      ],
    },
    video: { ytId: 'Qqe4thU-os8', title: 'DNA Replication (Updated)', channel: 'Crash Course' },
  },
  br1l3: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why gene expression, not just gene sequence, is the real research question`, body: `Every cell in your body carries essentially the same DNA, yet a liver cell and a neuron look and behave completely differently — the difference is which genes actually get expressed, not which genes exist. Understanding transcription and translation, the two-step process that turns a gene into a working protein, is what makes gene expression a concept you can actually reason about, not just a term you've heard.` },
        { heading: `Transcription: DNA to mRNA`, body: `Transcription happens in the nucleus, where an enzyme called RNA polymerase reads a gene's DNA sequence and builds a complementary messenger RNA (mRNA) molecule. This mRNA then travels out of the nucleus, carrying the gene's instructions to the cell's protein-building machinery. Whether and how much a given gene gets transcribed — controlled by regulatory proteins binding to specific DNA sequences — is the first major control point for gene expression.` },
        { heading: `Translation: mRNA to protein`, body: `Translation happens at ribosomes, which read the mRNA sequence three bases (a codon) at a time, each codon specifying a particular amino acid, delivered by transfer RNA (tRNA) molecules. The ribosome links these amino acids together in the exact order specified by the mRNA, building a protein chain that then folds into its functional three-dimensional shape.` },
        { heading: `Gene expression as a research question`, body: `Modern biomedical research increasingly focuses on gene expression itself — which genes are turned up or down in a disease state, and why — rather than just cataloging gene sequences. Techniques like RT-PCR and RNA sequencing let researchers directly measure how much of a specific gene's mRNA is present in a sample, a direct, quantitative window into gene expression.` },
        { heading: `Why this two-step process is worth understanding deeply`, body: `Nearly every major area of modern biomedical research — cancer biology, genetic disease, drug development, even vaccine design (mRNA vaccines work by directly delivering translation instructions to cells) — ultimately comes back to this transcription-translation pathway. Genuine fluency here is fluency in the actual working vocabulary of contemporary biomedical research.` },
      ],
      keyTakeaways: [
        `Transcription (DNA to mRNA, in the nucleus) and translation (mRNA to protein, at ribosomes) are the two steps that turn a gene into a working protein.`,
        `Gene expression — which genes get transcribed and how much — is what makes genetically identical cells behave completely differently.`,
        `Techniques like RNA sequencing let researchers directly measure gene expression, a central focus of modern biomedical research.`,
        `Cancer biology, genetic disease research, and even mRNA vaccine design all come back to this same transcription-translation pathway.`,
      ],
    },
    // The pre-existing raw link (bKIpDtJdK8Q) resolves to a Professor Dave Explains video,
    // not Crash Course — same issue already fixed in the Pharmacy batch (ph2l3). Reusing
    // that batch's confirmed swap for channel consistency.
    video: { ytId: '6ulXau2HyHg', title: 'Translation: How RNA Gets Translated into Protein Power: Crash Course Biology #35', channel: 'Crash Course' },
  },
  br2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why AP-level chemistry precision matters in a real lab`, body: `A research lab runs on exact, reproducible measurements — a slightly wrong reagent concentration doesn't just give a slightly wrong answer, it can invalidate an entire experiment. This lesson reviews the mole, stoichiometry, atomic structure, and bonding with that real-lab precision standard in mind.` },
        { heading: `The mole and stoichiometry in practice`, body: `A mole is 6.022 × 10²³ particles, letting chemists count atoms and molecules indirectly by weighing them. Preparing a reagent solution at a specific molar concentration — a routine first step before nearly any wet-lab experiment — is a direct, hands-on application of mole and stoichiometry math. Getting this wrong doesn't just affect one measurement; it can propagate an error through an entire experimental protocol.` },
        { heading: `Atomic structure at the AP level`, body: `Quantum numbers describe an electron's energy level and orbital shape, and electron configuration — how electrons fill those orbitals — directly determines how an atom bonds and reacts. This level of detail underlies why certain reagents and dyes used in lab techniques (like fluorescent tags used in imaging) behave the way they do.` },
        { heading: `Bonding types and lab-relevant properties`, body: `Ionic bonds produce compounds that dissociate into ions in water — relevant to buffer solutions used constantly in biological experiments to keep pH stable. Covalent bonds produce the vast majority of biological molecules studied in a research lab — proteins, DNA, lipids. Recognizing which bonding type a substance has lets you predict its solubility and stability, both directly relevant to how a reagent needs to be stored and handled.` },
        { heading: `Precision as the actual scientific standard`, body: `The scientific method's credibility rests on reproducibility — another researcher getting the same result when they repeat your protocol exactly. That's only possible with precise, careful chemical reasoning at every step, which is exactly why this fundamentals review isn't a formality but the actual foundation of doing trustworthy research.` },
      ],
      keyTakeaways: [
        `The mole and stoichiometry are the direct math behind preparing a reagent solution at an exact, correct concentration — a routine first lab step.`,
        `Quantum numbers and electron configuration determine an atom's bonding behavior, relevant to why lab reagents like fluorescent dyes work the way they do.`,
        `Ionic bonding underlies buffer solutions (pH stability); covalent bonding underlies most biological molecules studied in a lab.`,
        `Precise chemical reasoning is what makes an experiment's results reproducible — the actual foundation of trustworthy research.`,
      ],
    },
    video: { ytId: 'UL1jmJaUkaQ', title: 'Stoichiometry: Chemistry for Massive Creatures - Crash Course Chemistry #6', channel: 'Crash Course' },
  },
  br2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why reaction kinetics is a core research technique, not just a chemistry topic`, body: `Enzyme kinetics — studying how fast an enzyme catalyzes a reaction under different conditions — is one of the most common ways researchers actually study how a biological process works and how a drug might interfere with it. This lesson covers the fundamentals of reaction kinetics with that direct research application in mind.` },
        { heading: `What reaction rate measures`, body: `Reaction rate describes how quickly reactants convert into products, typically measured as a change in concentration over time. It's affected by temperature, concentration, and the presence of a catalyst. Enzymes are biological catalysts — they speed up a specific reaction without being consumed by it, by lowering the activation energy needed to get started.` },
        { heading: `Rate laws and reaction order, determined experimentally`, body: `A rate law relates reaction rate to reactant concentration, and reaction order describes how sensitively rate responds to a concentration change. Determining a rate law means running a reaction at multiple different concentrations and measuring how the rate changes — a direct, hands-on experimental technique, not just a formula to memorize.` },
        { heading: `Enzyme kinetics as a research method`, body: `Measuring how an enzyme's reaction rate changes as substrate concentration increases — plotting the resulting curve — lets researchers determine key values like Vmax (maximum reaction rate) and Km (a measure of the enzyme's affinity for its substrate). These values are used constantly in research to characterize how an enzyme works and to test whether a candidate drug molecule inhibits it.` },
        { heading: `Why this connects to nearly every area of biomedical research`, body: `Whether studying a metabolic disease, screening a potential new drug, or characterizing a newly discovered enzyme, reaction kinetics is very often the actual experimental technique being used to generate the data. Genuine fluency with the underlying chemistry is what makes that technique make sense, rather than being a black-box lab protocol.` },
      ],
      keyTakeaways: [
        `Reaction rate is affected by temperature, concentration, and catalysts — enzymes are biological catalysts central to nearly all biomedical research.`,
        `A rate law relating rate to concentration is determined experimentally, by running a reaction at multiple concentrations and measuring the result.`,
        `Enzyme kinetics (measuring Vmax and Km) is a core research method for characterizing how an enzyme works and testing candidate drug molecules.`,
        `Reaction kinetics is often the actual experimental technique generating the data behind disease, drug-screening, and enzyme-characterization research.`,
      ],
    },
    // The pre-existing raw link (Ue2m_l91W2w) does not resolve to anything indexed — same
    // issue already fixed in the PA batch (pa2l3). Reusing that batch's confirmed swap.
    video: { ytId: '7qOFtL3VEBc', title: "Kinetics: Chemistry's Demolition Derby: Crash Course Chemistry #32", channel: 'Crash Course' },
  },
  br2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why thermodynamics matters for a biomedical researcher specifically`, body: `Thermodynamics can feel like the most abstract chemistry topic, but it answers a question researchers ask constantly: will this reaction — or this protein folding into its functional shape — actually happen spontaneously, or does it need energy input? Gibbs free energy is the specific tool that answers that question.` },
        { heading: `What Gibbs free energy measures`, body: `Gibbs free energy (G) combines a reaction's enthalpy change (heat absorbed or released) and entropy change (change in disorder) into a single value that predicts spontaneity: a negative change in Gibbs free energy (ΔG) means a reaction proceeds spontaneously, releasing usable energy; a positive ΔG means it requires energy input to proceed at all.` },
        { heading: `How enthalpy and entropy combine`, body: `Enthalpy change reflects the heat released or absorbed as bonds break and form. Entropy change reflects whether a system becomes more or less disordered. The Gibbs free energy equation (ΔG = ΔH − TΔS) combines both, weighted by temperature — which is exactly why some reactions are spontaneous at one temperature but not another, a genuinely useful predictive tool, not just an abstract formula.` },
        { heading: `Protein folding as a thermodynamics problem`, body: `A protein's specific three-dimensional shape — which determines everything about what it does — is, at its core, the shape with the lowest Gibbs free energy the protein chain can settle into. Misfolded proteins, which don't reach that stable low-energy state correctly, are directly implicated in diseases like Alzheimer's and Parkinson's, making protein folding thermodynamics a genuinely major biomedical research area in its own right.` },
        { heading: `Why this abstract-seeming topic is actually central to research`, body: `From predicting whether a biochemical reaction will run without added energy, to understanding why a protein misfolds in a disease state, Gibbs free energy is one of the most quietly load-bearing concepts across biomedical research. Building real comfort with it now means these later research applications feel like natural extensions of something you understand.` },
      ],
      keyTakeaways: [
        `Gibbs free energy (ΔG) predicts whether a reaction is spontaneous: negative ΔG means spontaneous, positive ΔG means it requires energy input.`,
        `ΔG combines enthalpy (heat change) and entropy (disorder change), weighted by temperature — which is why spontaneity can depend on temperature.`,
        `A protein's functional shape is the lowest-Gibbs-free-energy shape it can fold into, and misfolding is directly implicated in diseases like Alzheimer's.`,
        `Gibbs free energy is a quietly central, load-bearing concept across a wide range of biomedical research areas.`,
      ],
    },
    // The pre-existing raw link (Tj-w1W_pZ8M) does not resolve to anything indexed via
    // WebSearch — no verification record possible. Swapped to a confirmed alternative.
    video: { ytId: 'Ykhn2psFmEM', title: 'Thermodynamics and Energy Diagrams: Crash Course Organic Chemistry #15', channel: 'Crash Course' },
  },
  br3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why statistics is the research skill, not a side skill`, body: `If there's one skill that separates someone who can run an experiment from someone who can actually design and interpret research, it's statistics. This lesson covers the fundamentals — describing data, probability, and statistical significance — with a direct eye toward how they show up in real research.` },
        { heading: `Describing data well`, body: `Mean, median, and mode each summarize a data set differently, and choosing the right one matters — the mean is sensitive to outliers in a way the median isn't. Spread (often measured by standard deviation) matters just as much as the center: two experimental groups could have the same average result but wildly different consistency, which itself is often the more interesting finding.` },
        { heading: `Probability and hypothesis testing`, body: `Probability measures how likely an event is, and it's the mathematical foundation underneath hypothesis testing — the process of determining whether an observed experimental result is likely to be real, or could plausibly have occurred by random chance alone. A p-value, the number most associated with this process, expresses exactly that: the probability of seeing a result this extreme purely by chance, if there were actually no real effect.` },
        { heading: `Why "statistically significant" doesn't mean "important"`, body: `A statistically significant result just means it's unlikely to be due to chance — it says nothing about how large or practically meaningful the effect actually is. A large enough sample size can make even a tiny, practically irrelevant effect statistically significant, which is exactly why a careful researcher reports and evaluates effect size, not just whether a p-value crossed a threshold.` },
        { heading: `Why this literacy is the actual gatekeeping skill in research`, body: `Being able to design a study that will actually detect a real effect, and interpret its results honestly rather than overselling a marginal finding, is the difference between research that holds up under scrutiny and research that doesn't. This is exactly the literacy this lesson, and this whole pathway, is built to develop.` },
      ],
      keyTakeaways: [
        `Mean, median, and mode summarize data differently, and choosing the right one — along with reporting spread, not just center — matters for honest data description.`,
        `A p-value expresses the probability of an observed result occurring by chance alone, the mathematical foundation of hypothesis testing.`,
        `"Statistically significant" means "unlikely to be chance," not "large or practically important" — effect size matters separately.`,
        `Honest statistical interpretation, not just running an experiment, is the actual gatekeeping skill that makes research hold up under scrutiny.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  br3l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why sampling is where a lot of research quietly goes wrong`, body: `Even a perfectly executed experiment can produce misleading conclusions if the sample it was run on doesn't actually represent the population it's meant to generalize to. Sampling methods and bias are, in a real sense, more foundational to good research design than statistical analysis itself — no amount of correct math fixes a badly chosen sample.` },
        { heading: `Random sampling and why it matters`, body: `Simple random sampling means every member of a population has an equal chance of being selected for a study — the gold standard for avoiding sampling bias. Non-random samples (like a survey only reaching people who happened to respond) risk systematically differing from the broader population in ways that quietly skew results, even when every individual data point is measured accurately.` },
        { heading: `Common sources of bias in study design`, body: `Non-response bias occurs when the people who complete a study or survey are systematically different from those who don't. Selection bias occurs when the method of choosing participants itself favors a particular outcome. Researchers try to control for these through careful sampling design, randomization, and sometimes statistical adjustment after the fact — but the cleanest fix is always preventing the bias at the design stage, not correcting for it afterward.` },
        { heading: `A well-designed small study vs. a poorly-designed large one`, body: `A common misconception is that a bigger sample automatically means a more trustworthy result — but a large, biased sample can produce a confidently wrong conclusion, while a smaller, carefully randomized sample can produce a genuinely trustworthy one. Sample size affects precision, but sampling method affects whether the result is measuring what you think it's measuring at all.` },
        { heading: `Why this is one of the highest-leverage research skills to build early`, body: `Learning to critically evaluate a study's sampling method — not just its stated conclusion — is exactly the skill that separates someone who can consume research critically from someone who takes a headline finding at face value. It's also exactly the skill a pre-college summer research program will expect you to already have some grounding in.` },
      ],
      keyTakeaways: [
        `Simple random sampling gives every population member an equal chance of selection, the gold standard for avoiding sampling bias.`,
        `Non-response bias and selection bias are common ways a study's sample can systematically differ from the population it's meant to represent.`,
        `A large but biased sample can be less trustworthy than a smaller, carefully randomized one — sample size and sampling method are separate issues.`,
        `Critically evaluating a study's sampling method, not just its headline conclusion, is a core research-literacy skill worth building early.`,
      ],
    },
    video: { ytId: 'Rf-fIpB4D50', title: 'Sampling Methods and Bias with Surveys: Crash Course Statistics #10', channel: 'Crash Course' },
  },
  br3l3: {
    readMins: 5,
    article: {
      sections: [
        { heading: `What PubMed actually is`, body: `PubMed is a free, publicly accessible database of biomedical research literature, maintained by the US National Library of Medicine, indexing tens of millions of research abstracts and citations. For a student genuinely interested in research, it's the single most useful resource available — free, comprehensive, and exactly what real researchers use to find and cite existing work.` },
        { heading: `Searching PubMed effectively`, body: `A vague search phrased like a full sentence question tends to return noisy, unhelpful results. Effective PubMed searches use specific keywords, and increasingly rely on MeSH (Medical Subject Headings) — a standardized vocabulary that catches relevant papers even when different authors phrase the same concept differently. Learning to search with MeSH terms rather than casual phrasing is a genuinely transferable research skill.` },
        { heading: `Abstract vs. full text, and why the difference matters`, body: `An abstract is a brief (usually around 250-word) summary of a study's question, methods, and findings — useful for a fast initial scan across many papers. But a study's methodology and actual data live in the full text, and any real evaluation of whether a study's conclusions are trustworthy requires reading well beyond the abstract, not stopping there.` },
        { heading: `Why peer review is a meaningful (if imperfect) quality filter`, body: `Peer review means independent experts in the same field evaluated a study's methods and conclusions before a journal agreed to publish it. It's not a perfect filter — flawed studies do get published — but it's a meaningfully higher bar than an unreviewed preprint or a general web article, and it's worth knowing how to tell the difference when searching PubMed.` },
        { heading: `From browsing PubMed to an actual research project`, body: `Getting comfortable navigating PubMed now — searching a topic you're curious about, skimming abstracts, occasionally reading a full paper closely — is realistic, valuable preparation for the moment you're ready for a pre-college summer research program or an independent project. It's a resource this pathway wants you actually using, not just knowing about.` },
      ],
      keyTakeaways: [
        `PubMed is a free, comprehensive database of biomedical research literature maintained by the National Library of Medicine.`,
        `Effective PubMed searches use specific keywords and MeSH terms, not casual full-sentence phrasing.`,
        `An abstract is a brief summary; genuinely evaluating a study's trustworthiness requires reading the full text's methods and data.`,
        `Peer review is a meaningful, if imperfect, quality filter — and getting comfortable navigating PubMed now is real preparation for future research.`,
      ],
    },
    // No video for this lesson — the resource itself (pubmed.ncbi.nlm.nih.gov) is the
    // linked destination, not a video; matches the established precedent for this lesson.
  },
};
