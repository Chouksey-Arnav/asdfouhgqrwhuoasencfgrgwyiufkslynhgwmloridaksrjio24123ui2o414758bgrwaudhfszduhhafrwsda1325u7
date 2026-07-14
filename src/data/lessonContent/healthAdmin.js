// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Health Administration pathway. Original articles +
// a curated, properly-embedded YouTube video per lesson. Keyed by lesson id
// (see PATHS.healthAdmin in constants.js). Rendered by the LessonPlayer
// (App.jsx) as Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy, so every video id below was verified via WebSearch.
// - ha1l1 (g9aDizJpd_s, "Supply and Demand: Crash Course Economics #4"),
//   ha1l2 (d8uTB5XorBw, "Macroeconomics: Crash Course Economics #5"), and
//   ha2l3 (Dugn51K_6WA, "Money and Finance: Crash Course Economics #11") were
//   all researched fresh for this pathway (no existing Khan Academy category
//   link had a specific video) and confirmed via WebSearch.
// - ha1l3 reuses Public Health's already-verified 5aww-Bpgkf4.
// - ha2l1 reuses Exploring's already-shipped, attributed sxQaBpKfDRk.
// - ha2l2, ha3l1 have no confident canonical video match — see per-lesson
//   comments below.
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_ADMIN_CONTENT = {
  ha1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why microeconomics is the daily operating logic of a healthcare organization`, body: `Every healthcare organization — a single clinic or a full hospital system — runs on the same underlying economic questions: how many staff to schedule, what to charge for a service, how to allocate a limited budget across competing needs. Microeconomics, the study of how individual actors and markets make these decisions, is the actual analytical toolkit behind them.` },
        { heading: `Supply, demand, and price`, body: `The law of demand says that when a price rises, people buy less; when it falls, they buy more. Supply describes how much of something producers are willing to provide at a given price. Where supply and demand meet is the equilibrium price and quantity — the point where what's produced roughly matches what's wanted at that price. This basic model underlies how insurers, hospitals, and clinics reason about pricing services and negotiating rates.` },
        { heading: `Why healthcare markets break the standard model`, body: `Classic supply-and-demand reasoning assumes buyers have good information and make deliberate, price-sensitive choices — assumptions healthcare frequently violates. A patient having a heart attack isn't comparison-shopping between emergency rooms, and most patients don't know a procedure's price until after receiving it. Insurance further separates the person receiving care from the person directly paying for it. Understanding exactly where and why healthcare breaks the standard economic model is foundational to understanding why healthcare economics is its own specialized field.` },
        { heading: `Microeconomic reasoning in a real healthcare setting`, body: `A hospital administrator deciding whether to add a new service line, a clinic manager setting appointment scheduling policy, and a health system negotiating rates with an insurer are all applying microeconomic reasoning to real operational decisions — even when they don't use the academic vocabulary explicitly. Recognizing this connection is what turns an economics class into a preview of actual day-to-day work in this field.` },
        { heading: `Why this foundation matters for a health administration career`, body: `Every resource-allocation decision in a healthcare organization — staffing, budgeting, service offerings — is fundamentally a microeconomic decision made under real-world constraints healthcare adds on top of the standard model. Genuine fluency here is genuine fluency in the actual decision-making framework this career uses constantly.` },
      ],
      keyTakeaways: [
        `Supply and demand determine equilibrium price and quantity — the basic model underlying pricing and rate negotiation in healthcare.`,
        `Healthcare markets break standard microeconomic assumptions: patients often lack price information, urgency limits comparison-shopping, and insurance separates payer from patient.`,
        `Staffing, pricing, and service-line decisions in a real healthcare organization are all applied microeconomic reasoning, even when not labeled that way.`,
        `Resource allocation in healthcare administration is fundamentally microeconomic decision-making under healthcare-specific real-world constraints.`,
      ],
    },
    video: { ytId: 'g9aDizJpd_s', title: 'Supply and Demand: Crash Course Economics #4', channel: 'Crash Course' },
  },
  ha1l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why macroeconomics matters for running a healthcare organization`, body: `While microeconomics explains individual organizational decisions, macroeconomics explains the bigger forces shaping the entire healthcare sector — national spending trends, employment, inflation — that no single hospital administrator controls but every one of them has to plan around.` },
        { heading: `GDP, inflation, and unemployment`, body: `GDP (Gross Domestic Product) measures the total value of goods and services a country produces, a broad indicator of economic health. Inflation measures how quickly prices rise across the economy, directly affecting a hospital's costs for everything from supplies to wages. Unemployment affects how many people carry employer-based health insurance, which is exactly why unemployment trends directly shape hospital revenue and the demand for uncompensated care.` },
        { heading: `Healthcare spending as a macroeconomic issue`, body: `US healthcare spending represents a substantial share of the entire national economy — a genuinely massive macroeconomic category in its own right, not just a collection of individual medical bills. Understanding healthcare spending at this scale is essential context for understanding why health policy debates are simultaneously medical and economic policy debates.` },
        { heading: `How macroeconomic conditions directly affect hospital operations`, body: `A recession increases unemployment, which increases the number of uninsured or underinsured patients a hospital serves, while simultaneously often reducing charitable donations and government funding — a genuine operational squeeze from multiple directions at once. Understanding these macroeconomic dynamics is what lets a health administrator plan for, rather than be blindsided by, a broader economic downturn.` },
        { heading: `Why this big-picture view is a real administrative skill`, body: `A health administrator who only thinks at the level of their own department misses the larger economic forces that will eventually affect their budget regardless. Genuine macroeconomic literacy is what lets someone in this field anticipate and plan for those forces rather than just react to them after the fact.` },
      ],
      keyTakeaways: [
        `GDP, inflation, and unemployment are macroeconomic indicators that directly affect hospital costs, revenue, and patient insurance status.`,
        `US healthcare spending is a massive macroeconomic category in its own right, which is why health policy is simultaneously economic policy.`,
        `A recession squeezes hospitals from multiple directions at once — more uninsured patients, less charitable funding, more uncompensated care.`,
        `Macroeconomic literacy lets a health administrator anticipate and plan for broader economic forces, not just react to them.`,
      ],
    },
    video: { ytId: 'd8uTB5XorBw', title: 'Macroeconomics: Crash Course Economics #5', channel: 'Crash Course' },
  },
  ha1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why health administration and public health overlap so much`, body: `Public health and health administration are distinct fields, but they overlap constantly — a public health initiative needs an organization behind it to actually run, and that organizational, operational layer is exactly where health administration fits in. Understanding public health as a field is directly relevant background for this pathway.` },
        { heading: `The core disciplines within public health`, body: `Epidemiology studies how disease spreads through populations. Biostatistics provides the mathematical tools for analyzing health data. Environmental health studies how surroundings affect health. Health policy studies how laws and regulations shape outcomes. Health administration sits alongside these as the discipline responsible for the organizational and operational systems that let all the others actually function at scale.` },
        { heading: `Running the systems behind public health work`, body: `A public health vaccination campaign needs supply chain logistics, staffing, and budget management to actually reach a population — the operational, administrative work behind the epidemiological strategy. Someone has to manage that logistics, and that role is a genuinely high-impact way to be central to a public health effort without being the epidemiologist designing the strategy itself.` },
        { heading: `Population-level thinking applied to running an organization`, body: `Just as public health reasons about a population's health rather than one patient, health administration reasons about an organization's overall capacity, resource allocation, and system-level performance rather than one clinical encounter. This population/systems-level thinking is the shared mindset connecting the two fields, even though their day-to-day work looks different.` },
        { heading: `Why this framing matters for choosing this pathway`, body: `Recognizing health administration as a legitimate, high-impact way to be genuinely embedded in medicine's broader mission — not a lesser, non-clinical fallback — is central to taking this pathway seriously as a real career choice, not a default for students unsure what else to pick.` },
      ],
      keyTakeaways: [
        `Health administration and public health overlap constantly — public health strategy needs organizational and operational systems to actually function.`,
        `Public health's core disciplines (epidemiology, biostatistics, environmental health, policy) all rely on administrative and operational support to run at scale.`,
        `Managing the logistics behind a public health effort is a genuinely high-impact role, distinct from but essential to the epidemiological strategy itself.`,
        `Health administration shares public health's systems/population-level thinking, just applied to running an organization rather than a health intervention.`,
      ],
    },
    video: { ytId: '5aww-Bpgkf4', title: 'What is Public Health? Crash Course Public Health #1', channel: 'Crash Course' },
  },
  ha2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why statistics is an operational tool, not just an academic subject, here`, body: `A health administrator uses statistics constantly and practically — forecasting how many patients to expect next month, deciding how many staff to schedule for a shift, evaluating whether a new process actually improved efficiency. This lesson covers statistics fundamentals with that direct operational application in view.` },
        { heading: `Choosing the right summary statistic`, body: `Mean, median, and mode each summarize data differently, and the choice matters operationally — average patient wait time can be skewed upward by a small number of unusually long waits in a way the median wouldn't reflect, which is exactly why a health administrator reviewing wait-time data needs to know which statistic is actually being reported and what it hides.` },
        { heading: `Probability and forecasting`, body: `Probability measures how likely an event is, and it's the mathematical foundation behind forecasting patient volume, staffing needs, and resource demand — using historical patterns to estimate how many patients are likely to arrive on a given day or how much of a supply is likely to be needed in a given period. Getting this forecasting wrong in either direction has real operational costs: understaffing strains a team and hurts care quality, while overstaffing wastes budget.` },
        { heading: `Why "statistically significant" doesn't mean "worth acting on"`, body: `A statistically significant improvement from a new process change might be real but too small to justify the cost and disruption of rolling it out organization-wide. A health administrator has to evaluate not just whether a result is statistically real, but whether the actual magnitude of improvement justifies the operational cost of implementing it — a judgment statistics informs but doesn't make automatically.` },
        { heading: `Why this literacy is a daily administrative skill`, body: `Reading operational data correctly — choosing the right summary statistic, forecasting responsibly, and evaluating whether a statistically real improvement is actually worth pursuing — is a genuinely constant part of health administration work, not a one-time analytical exercise.` },
      ],
      keyTakeaways: [
        `Mean, median, and mode summarize operational data differently, and choosing the right one matters for accurately understanding metrics like wait times.`,
        `Probability underlies forecasting patient volume and staffing needs — getting this wrong in either direction has real operational costs.`,
        `A statistically significant result isn't automatically worth acting on — evaluating whether the magnitude justifies the operational cost is a separate judgment.`,
        `Statistical literacy for health administration is a daily, practical skill for reading and acting on operational data, not an academic exercise.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  ha2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why reading charts well is a daily operational skill in this field`, body: `A health administrator reviews dashboards and reports constantly — patient flow, budget tracking, staffing utilization — nearly all presented as charts and graphs. Reading them accurately, and knowing when a chart is technically correct but visually misleading, is a genuinely practical skill this lesson builds directly.` },
        { heading: `Reading bar charts, histograms, and line graphs`, body: `A bar chart compares distinct categories. A histogram shows the distribution of a continuous variable, grouped into ranges. A line graph shows how a value changes over time — the standard choice for tracking a metric like daily patient volume or monthly budget spend. Choosing the wrong chart type for a given data set, or misreading one, can lead directly to a wrong operational conclusion.` },
        { heading: `Data visualization as a daily operational tool`, body: `Tracking patient flow through a department, monitoring resource utilization, and reporting budget performance to leadership all rely on clear data visualization to communicate a pattern quickly and accurately. This isn't a specialized analytics skill reserved for a data team — it's baseline literacy for functioning effectively at nearly any level of healthcare administration.` },
        { heading: `How a chart can mislead without being technically false`, body: `A truncated y-axis (not starting at zero) can make a small difference look dramatic. An inconsistent time scale can make a trend look steadier or more volatile than it actually is. Cherry-picking a favorable date range can make a struggling metric look like it's improving. None of these techniques involve fabricating data — they involve presenting real data in a way that creates a misleading visual impression, which is exactly why critical chart-reading is a real skill, not just data literacy in the abstract.` },
        { heading: `Why this skill compounds over an administrative career`, body: `Being able to quickly and accurately read a chart — and spot when one might be misleading, whether by accident or design — is what lets a health administrator make genuinely informed decisions rather than being swayed by whichever version of the data looks most compelling at a glance.` },
      ],
      keyTakeaways: [
        `Bar charts compare categories, histograms show distribution, and line graphs show change over time — choosing the right type matters for accurate reading.`,
        `Data visualization is baseline daily literacy in health administration, used constantly for tracking patient flow, staffing, and budgets.`,
        `A chart can be technically accurate but visually misleading — through a truncated axis, an inconsistent scale, or a cherry-picked date range.`,
        `Critical chart-reading is what lets a health administrator make genuinely informed decisions rather than being swayed by a compelling-looking but misleading visual.`,
      ],
    },
    // No canonical single video found specifically matching "reading charts and data sets"
    // at the operational-literacy level this lesson targets (distinct from the general
    // statistics-fundamentals video already used for ha2l1) — per the OMIT-over-guess rule,
    // this lesson ships as article + objectives + quiz only.
  },
  ha2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why personal finance literacy scales up to organizational budgeting`, body: `The core concepts behind managing personal money — what money actually does, how borrowing and interest work, the difference between debt and equity — are the exact same concepts a health administrator applies at a much larger scale when managing an organizational budget. This lesson builds that foundation directly.` },
        { heading: `What money actually does`, body: `Money serves three core purposes: it's a medium of exchange (something universally accepted in trade), a store of value (something that holds its worth over time), and a unit of account (a common measure for comparing the value of very different things). Understanding these three functions is what makes concepts like inflation — money losing its store-of-value function — and budgeting comparisons across very different expense categories make intuitive sense.` },
        { heading: `Borrowing, interest, and basic financial instruments`, body: `Borrowing means receiving money now in exchange for a promise to repay more later, with the extra amount (interest) compensating the lender for risk and the time value of money. Bonds are essentially a form of borrowing — an organization or government borrowing from investors and promising to repay with interest. Stocks represent equity — partial ownership in an organization, rather than a debt obligation. Healthcare organizations use both borrowing and, for larger systems, equity-like financing to fund major projects like new facilities.` },
        { heading: `Why this connects directly to healthcare budgeting`, body: `A hospital's capital budget for a new wing or major equipment purchase often involves the exact same borrowing concepts covered here, just at an organizational scale — assessing whether the future benefit justifies the cost of borrowed capital and its interest. Personal finance literacy is genuinely the on-ramp to understanding this larger-scale financial reasoning, not a separate, unrelated topic.` },
        { heading: `Why this foundation matters for this specific career`, body: `Health administration draws directly on financial literacy for budgeting, resource allocation, and major capital decisions. Building real comfort with these fundamentals now — not just enough to manage a personal budget — is building the actual financial reasoning foundation this career runs on.` },
      ],
      keyTakeaways: [
        `Money serves three purposes — medium of exchange, store of value, unit of account — and understanding them makes concepts like inflation intuitive.`,
        `Borrowing (bonds) represents debt; stocks represent equity — both are financing tools healthcare organizations use for major projects.`,
        `A hospital's capital budgeting for a new facility or major equipment uses the same borrowing/interest reasoning as personal finance, just at organizational scale.`,
        `Personal finance literacy is the direct on-ramp to the larger-scale financial reasoning that health administration budgeting actually requires.`,
      ],
    },
    video: { ytId: 'Dugn51K_6WA', title: 'Money and Finance: Crash Course Economics #11', channel: 'Crash Course' },
  },
  ha3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why public speaking is a core, constant skill in this field specifically`, body: `Leading a healthcare team or organization means constantly communicating to groups — presenting a budget to leadership, explaining a policy change to staff, addressing a community meeting. Public speaking isn't a specialized skill reserved for occasional big presentations in this career; it's a near-daily leadership tool.` },
        { heading: `A reliable structure for organizing a presentation`, body: `A simple, reliable structure — a clear introduction (what you'll cover), body (the main points), conclusion (what to remember) — keeps both you and your audience oriented, especially useful when explaining something complex like a budget change or policy shift to a room with mixed technical background. Tell them what you're going to say, say it, then tell them what you just said.` },
        { heading: `Managing nervousness and speaking with genuine confidence`, body: `Practicing out loud multiple times beforehand — not just reading silently — builds real familiarity with material. Preparing key points rather than a rigid word-for-word script gives room to recover naturally if you lose your place, and tends to sound more genuine and confident than a memorized recitation. These are trainable techniques, not fixed personality traits.` },
        { heading: `Reading and adjusting for your audience`, body: `The right level of detail, tone, and framing depends heavily on who's actually listening — a budget presentation for clinical staff needs different framing than the same numbers presented to a hospital board. Adjusting for audience isn't insincerity; it's effective communication, and a core leadership skill in an organization with many different stakeholder groups.` },
        { heading: `Why this is worth building well before an actual leadership role`, body: `Every presentation, class discussion, or team update where you practice organizing your points clearly and speaking with genuine confidence is direct practice for exactly the communication demands this career places on someone in a leadership role, starting well before you're actually in one.` },
      ],
      keyTakeaways: [
        `Public speaking is a near-daily leadership tool in health administration, not an occasional specialized skill.`,
        `A clear intro-body-conclusion structure keeps both speaker and audience oriented, especially for explaining complex material like budgets or policy.`,
        `Practicing out loud and preparing key points (not a rigid script) are trainable techniques for genuine confidence, not fixed personality traits.`,
        `Adjusting tone and framing for a specific audience is effective communication and a core leadership skill, not insincerity.`,
      ],
    },
    // No canonical single video found from this app's established Crash Course/PBS Digital
    // Studios channel family for public speaking specifically — search turned up only
    // unaffiliated or unverified-channel results. Per the OMIT-over-guess rule, ships as
    // article + objectives + quiz only.
  },
  ha3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Why teamwork is a leadership skill, not just a group-project skill`, body: `Health administration is fundamentally a team-management career — coordinating staff, departments, and stakeholders toward a shared operational goal. The teamwork skills built through something as ordinary as a school group project are genuinely the early version of exactly this professional skill.` },
        { heading: `Setting clear roles and expectations early`, body: `Explicitly clarifying who's doing what and by when, even briefly at the start of a project, prevents the two most common team failures: duplicated effort and dropped responsibilities nobody claimed. This same principle scales directly to managing a healthcare team, where unclear role definition has real operational and even safety consequences.` },
        { heading: `Handling a team member who isn't contributing`, body: `A direct, specific, private conversation early on — rather than silent resentment or public confrontation — resolves far more situations than either extreme. This same skill, at a larger scale, is exactly what a manager needs when addressing an underperforming team member in a real workplace, where the stakes of getting it wrong (either avoiding the conversation or handling it poorly) are considerably higher.` },
        { heading: `Being a strong contributor, not just a leader`, body: `Effective teams need people who execute reliably and support a shared plan, not just people trying to lead. A health administration career eventually involves both leading some initiatives and supporting others led by colleagues — being a genuinely good team member in both roles is a distinct, valuable skill from leadership alone.` },
        { heading: `Why this ordinary-seeming skill is actually central to this career`, body: `Nearly everything a health administrator does — running a project, coordinating a policy rollout, managing a department — happens through a team, not alone. Genuine teamwork skill, practiced now through something as low-stakes as a school project, is direct, transferable preparation for the actual daily work of this field.` },
      ],
      keyTakeaways: [
        `Health administration is fundamentally team-management work, making school group-project teamwork skills genuinely transferable preparation.`,
        `Clarifying roles and expectations early prevents duplicated effort and dropped responsibilities — the same principle scales to managing a real healthcare team.`,
        `A direct, specific, private conversation is the most effective way to address a non-contributing team member, at any scale.`,
        `Being a strong, reliable team contributor — not just a leader — is a distinct and equally valuable skill for this career.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. nur3l2, ph3l2):
    // no single canonical YouTube video exists for general teamwork/group-project skills.
  },
  ha3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What an MHA actually is`, body: `The Master of Health Administration (MHA, sometimes called MHSA) is the standard graduate degree for careers running hospitals, clinics, or larger health systems. It's typically pursued after a relevant bachelor's degree, and leads to operational and executive leadership roles across the healthcare industry — from a single department to an entire health system.` },
        { heading: `Why business and economics coursework matters most here`, body: `Since health administration is fundamentally about the business and operations side of healthcare, coursework in business, economics, and statistics is the most directly relevant undergraduate preparation — more so than the heavy science course load other health pathways in this app emphasize. This is a genuinely different academic preparation path from the clinically-focused pathways, and worth being clear-eyed about.` },
        { heading: `What the actual day-to-day work involves`, body: `A health administrator's daily work centers on staffing, budgets, patient flow, and organizational decision-making — not direct clinical care. The role exists specifically to let physicians, nurses, and other clinical staff focus on patient care by managing the operational systems around them, a genuinely distinct but essential function within any healthcare organization.` },
        { heading: `Leadership experience as a differentiating signal`, body: `Leadership roles in high school clubs, student government, or business-oriented organizations like DECA or FBLA build exactly the organizational and people-management skills this career draws on daily. This kind of leadership experience, alongside relevant coursework, is often what differentiates a genuinely well-prepared applicant for this specific path.` },
        { heading: `What's actually high-leverage for a high schooler right now`, body: `Given how heavily this path weights business/economics coursework and leadership experience specifically, the highest-leverage moves are strong performance in those specific subjects and taking on real leadership responsibility in a club or organization — genuinely different priorities from the clinical-exposure-heavy preparation other health pathways in this app emphasize.` },
      ],
      keyTakeaways: [
        `The MHA (or MHSA) is the standard graduate degree for hospital and health system leadership roles, typically pursued after a relevant bachelor's degree.`,
        `Business, economics, and statistics coursework is the most directly relevant preparation for this path — a different academic emphasis than clinically-focused pathways.`,
        `Health administrators manage staffing, budgets, and operations specifically so clinical staff can focus on direct patient care.`,
        `Leadership experience (student government, DECA, FBLA) is a genuine differentiating signal for this specific career path.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3, nur3l3):
    // no single canonical YouTube video exists for "what health administration programs
    // look for."
  },
};
