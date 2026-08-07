// ─────────────────────────────────────────────────────────────────────────────
// Supplemental essay prompts, by school.
//
// The Essay Workspace could always track essays a student typed in by hand. It
// could not tell them WHICH essays they owed. A student with Duke on their
// college list had no way to find out from this app that Duke wants a 250-word
// "why Duke" plus a set of optional identity essays — they'd discover it in
// October, inside the Common App, with a deadline attached.
//
// This is that missing half: the prompts themselves, so the app can say "you
// have Duke on your list, here is what Duke actually asks" and then hand each
// one to the critique engine as a practice rep.
//
// ── On accuracy, which matters more here than anywhere else in the app ──
// Supplemental prompts are rewritten by admissions offices every year. Word
// limits move, optional essays get added and dropped, and a school occasionally
// replaces its whole set. Everything below reflects a RECENT application cycle
// and is stored as guidance to draft against, never as this year's official
// requirement — `CYCLE_NOTE` is rendered next to every prompt list in the UI and
// says exactly that. The rule for this file: it is better to show a student a
// representative prompt they can practise on today (clearly labelled) than to
// show them nothing, and it is much worse to imply a stale prompt is official.
// Nothing in the app ever submits these anywhere; they exist to be drafted and
// critiqued against.
//
// Schools not in this list fall through to AI-generated prompts (see
// src/lib/supplementalPrompts.js), which are labelled even more loudly.
// ─────────────────────────────────────────────────────────────────────────────

export const CYCLE_NOTE = 'Prompts reflect a recent application cycle and are here to practise against — confirm this year\'s exact prompts and word limits on the school\'s admissions site or in the Common App before you submit anything.';

// kind: 'why_school' | 'why_major' | 'community' | 'identity' | 'activity' | 'intellectual' | 'creative' | 'short'
// Used only for grouping/iconography in the UI and to tell the critic what
// archetype it is judging — a "why us" essay and a "tell us about yourself"
// essay fail in completely different ways.
const S = (id, prompt, wordLimit, kind, required = true) => ({ id, prompt, wordLimit, kind, required });

export const SUPPLEMENTS = [
  {
    name: 'Duke University',
    aliases: ['duke'],
    essays: [
      S('why', 'What is your sense of Duke as a university and a community, and why do you consider it a good match for you? If there\'s something in particular about our offerings that attracts you, feel free to share that as well.', 250, 'why_school'),
      S('perspective', 'We believe a wide range of viewpoints, beliefs, and lived experiences are essential to maintaining Duke as a vibrant intellectual community. Share with us about a time you were exposed to an idea or perspective different from your own — what did you take from it?', 250, 'identity', false),
      S('identity', 'Tell us about an aspect of your identity (e.g. your religion, culture, race, sexual identity, gender, ability, or your intersection of these) and how it has led you to grow.', 250, 'identity', false),
      S('unexpressed', 'We recognize that not fully expressing yourself can hold you back — tell us about a time you were not able to be yourself, or a part of you that you have not yet had the chance to share.', 250, 'identity', false),
    ],
  },
  {
    name: 'University of North Carolina at Chapel Hill',
    aliases: ['unc', 'unc chapel hill', 'university of north carolina', 'north carolina chapel hill'],
    essays: [
      S('quality', 'Discuss one of your personal qualities and share a story, anecdote, or memory of how it helped you make a positive impact on a community.', 250, 'community'),
      S('learning', 'Discuss an academic topic that you\'re excited to explore and learn more about in college. Why does it excite you?', 250, 'intellectual'),
      S('short_grateful', 'Short answer: What is one thing you are grateful for?', 50, 'short', false),
    ],
  },
  {
    name: 'Stanford University',
    aliases: ['stanford'],
    essays: [
      S('curiosity', 'The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.', 250, 'intellectual'),
      S('roommate', 'Virtually all of Stanford\'s undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help your roommate — and us — get to know you better.', 250, 'creative'),
      S('meaningful', 'Please describe what aspects of your life experiences, interests and character would help you make a distinctive contribution as an undergraduate.', 250, 'identity'),
      S('short_learn', 'Short question: What is the most significant challenge that society faces today?', 50, 'short'),
      S('short_summer', 'Short question: How did you spend your last two summers?', 50, 'short'),
    ],
  },
  {
    name: 'Yale University',
    aliases: ['yale'],
    essays: [
      S('why_major', 'Students at Yale have plenty of time to explore their academic interests before committing to one or more major fields of study. Tell us about your relationship with a topic, idea, or question that excites your intellectual curiosity.', 200, 'why_major'),
      S('why_yale', 'What is it about Yale that has led you to apply?', 125, 'why_school'),
      S('short_community', 'Reflect on a community to which you feel connected. Why is it meaningful to you?', 400, 'community'),
    ],
  },
  {
    name: 'Harvard University',
    aliases: ['harvard'],
    essays: [
      S('intellectual', 'Briefly describe an intellectual experience that was important to you.', 150, 'intellectual'),
      S('travel', 'Describe a time when you strongly disagreed with someone about an idea or issue. How did you communicate or engage with this person? What did you learn from this experience?', 150, 'identity'),
      S('roommates', 'How do you hope to use your Harvard education in the future?', 150, 'why_school'),
      S('life', 'Top three things your roommates might like to know about you.', 150, 'creative'),
      S('extracurricular', 'Harvard has long recognized the importance of enrolling a diverse student body. How will the life experiences that shape who you are today enable you to contribute to Harvard?', 150, 'community'),
    ],
  },
  {
    name: 'Princeton University',
    aliases: ['princeton'],
    essays: [
      S('extracurricular', 'Briefly elaborate on an activity, organization, work experience, or hobby that has been particularly meaningful to you.', 150, 'activity'),
      S('service', 'Princeton has a longstanding commitment to service and civic engagement. Tell us how your story intersects (or will intersect) with these ideals.', 250, 'community'),
      S('learning', 'Please tell us how you have spent the last two summers, or vacations between school years, including any jobs you have held.', 50, 'short'),
      S('joy', 'What brings you joy?', 50, 'short'),
    ],
  },
  {
    name: 'University of Pennsylvania',
    aliases: ['penn', 'upenn', 'pennsylvania'],
    essays: [
      S('community', 'Write a short thank-you note to someone you have not yet thanked and would like to acknowledge.', 200, 'community'),
      S('why_penn', 'How will you explore community at Penn? Consider how Penn will help shape your perspective, and how your experiences and perspective will help shape Penn.', 200, 'why_school'),
      S('why_major', 'Considering the specific undergraduate school you have selected, describe how you intend to explore your academic and intellectual interests at Penn.', 200, 'why_major'),
    ],
  },
  {
    name: 'Johns Hopkins University',
    aliases: ['johns hopkins', 'hopkins', 'jhu'],
    essays: [
      S('collaboration', 'How has your life experience contributed to your personal story — your character, values, perspectives, or skills — and what will you bring to the Hopkins community?', 300, 'community'),
    ],
  },
  {
    name: 'Massachusetts Institute of Technology',
    aliases: ['mit'],
    essays: [
      S('field', 'What field of study appeals to you the most right now? Tell us more about why this field of study at MIT appeals to you.', 100, 'why_major'),
      S('pleasure', 'We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it.', 150, 'activity'),
      S('community', 'Describe the world you come from. How has that world shaped your dreams and aspirations?', 225, 'identity'),
      S('challenge', 'How have you collaborated with others to achieve a shared goal, or contributed to a community that is meaningful to you?', 225, 'community'),
    ],
  },
  {
    name: 'Brown University',
    aliases: ['brown'],
    essays: [
      S('open_curriculum', 'Brown\'s Open Curriculum allows students to explore broadly while also diving deeply into their academic pursuits. Tell us about an academic interest (or interests) that excites you, and how you might use the Open Curriculum to pursue it.', 250, 'why_major'),
      S('community', 'Students entering Brown often find that making their home on College Hill naturally invites reflection on where they came from. Share how an aspect of your growing up has inspired or challenged you, and what unique contributions this might allow you to make to the Brown community.', 250, 'identity'),
      S('joy', 'Brown students care deeply about their work and the world around them. Students find contentment, satisfaction, and meaning in daily interactions and major discoveries. Whether big or small, mundane or spectacular, tell us about something that brings you joy.', 250, 'creative'),
    ],
  },
  {
    name: 'Dartmouth College',
    aliases: ['dartmouth'],
    essays: [
      S('why', 'As you seek admission to Dartmouth\'s Class of your year, what aspects of the college\'s academic program, community, or campus environment attract your interest?', 100, 'why_school'),
      S('choice', 'What excites you? — or — Labor leader Dolores Huerta recommended a life of purpose. What would you like to accomplish in your lifetime?', 250, 'identity'),
    ],
  },
  {
    name: 'Columbia University',
    aliases: ['columbia'],
    essays: [
      S('list', 'List the titles of the books, essays, poetry, short stories or plays you read outside of academic courses in the past year.', 100, 'short'),
      S('community', 'A hallmark of the Columbia experience is being able to learn and thrive in an equitable and inclusive community with a wide range of perspectives. Tell us about an aspect of your own perspective, viewpoint or lived experience that is important to you, and describe how it has shaped the way you would learn from and contribute to Columbia\'s diverse and collaborative community.', 150, 'community'),
      S('why', 'Why are you interested in attending Columbia University? We encourage you to consider the aspect(s) that you find unique and compelling about Columbia.', 150, 'why_school'),
      S('why_major', 'What attracts you to your preferred areas of study at Columbia?', 150, 'why_major'),
    ],
  },
  {
    name: 'Cornell University',
    aliases: ['cornell'],
    essays: [
      S('community', 'We all contribute to, and are influenced by, the communities that are meaningful to us. Share how you\'ve been shaped by one of the communities you belong to.', 350, 'community'),
      S('college', 'Students in your chosen Cornell undergraduate college are asked a college-specific question — describe how your interests and goals align with that college\'s academic programs, and what you hope to study there.', 650, 'why_major'),
    ],
  },
  {
    name: 'Northwestern University',
    aliases: ['northwestern'],
    essays: [
      S('why', 'We want to be sure we\'re considering your application in the context of your personal experiences: What aspects of your background, your identity, or your school, community, and/or household settings have most shaped how you see yourself engaging in Northwestern\'s community?', 300, 'why_school'),
      S('short_community', 'Painting "The Rock" is a tradition at Northwestern. If you could paint The Rock, what would you paint and why?', 75, 'short', false),
    ],
  },
  {
    name: 'Vanderbilt University',
    aliases: ['vanderbilt', 'vandy'],
    essays: [
      S('activity', 'Vanderbilt University values learning through contrasting points of view. We understand that our differences can deepen our understanding of one another and the world around us. Share how a perspective different from your own has shaped who you are.', 250, 'identity'),
    ],
  },
  {
    name: 'Emory University',
    aliases: ['emory'],
    essays: [
      S('why', 'What academic areas are you interested in exploring at Emory University and why?', 150, 'why_major'),
      S('reflection', 'Reflect on a personal experience where you intentionally expanded your cultural awareness.', 150, 'identity'),
    ],
  },
  {
    name: 'Washington University in St. Louis',
    aliases: ['washu', 'washington university', 'wustl', 'washington university in st louis'],
    essays: [
      S('why', 'Please tell us what you are interested in studying at college and why.', 250, 'why_major'),
      S('community', 'WashU supports engagement in the St. Louis community and beyond. How do you hope to be involved in your new community, and how has your background prepared you for that?', 250, 'community', false),
    ],
  },
  {
    name: 'Rice University',
    aliases: ['rice'],
    essays: [
      S('why', 'Please explain why you wish to study in the academic areas you selected.', 150, 'why_major'),
      S('why_rice', 'Based upon your exploration of Rice University, what elements of the Rice experience appeal to you?', 150, 'why_school'),
      S('perspective', 'Rice is lauded for creating a collaborative atmosphere that enhances the quality of life for all members of our campus community. The Residential College System and undergraduate life are heavily influenced by the unique life experiences and cultural traditions each student brings. What life perspectives would you contribute to the Rice community?', 500, 'community'),
      S('box', 'The Box: In keeping with Rice\'s long-standing tradition, please share an image of something that appeals to you.', 0, 'creative', false),
    ],
  },
  {
    name: 'Georgetown University',
    aliases: ['georgetown'],
    essays: [
      S('activity', 'Briefly discuss the significance to you of the school or summer activity in which you have been most involved.', 200, 'activity'),
      S('why', 'As Georgetown is a diverse community, the Admissions Committee would like to know more about you in your own words. Please submit a brief essay, either personal or creative, which you feel best describes you.', 650, 'identity'),
      S('school_specific', 'Your chosen Georgetown school (College, SFS, Business, Nursing & Health Studies) asks a school-specific question about why you want to study there and what you hope to do with it.', 500, 'why_major'),
    ],
  },
  {
    name: 'New York University',
    aliases: ['nyu', 'new york university'],
    essays: [
      S('perspective', 'We are looking for peacemakers, changemakers, global citizens, boundary breakers, and creative thinkers. In a world where disconnection seems to be pervasive, we are searching for you — the ones who will build community and create connection. Share more about you and your relationship with a community that has shaped you.', 250, 'community'),
    ],
  },
  {
    name: 'University of Southern California',
    aliases: ['usc', 'southern california'],
    essays: [
      S('why_major', 'Describe how you plan to pursue your academic interests and why you want to explore them at USC specifically.', 250, 'why_major'),
      S('perspective', 'USC believes that one learns best when interacting with people of different backgrounds, experiences and perspectives. Tell us about a time you were exposed to a new idea or when your beliefs were challenged by another point of view.', 250, 'identity'),
      S('short_answers', 'Short answers (about 100 characters each): describe yourself in three words; your favorite snack; best movie of all time; dream job; what is your theme song.', 25, 'short'),
    ],
  },
  {
    name: 'University of Michigan',
    aliases: ['michigan', 'umich', 'university of michigan ann arbor'],
    essays: [
      S('community', 'Everyone belongs to many different communities and/or groups defined by (among other things) shared geography, religion, ethnicity, income, cuisine, interest, race, ideology, or intellectual heritage. Choose one of the communities to which you belong, and describe that community and your place within it.', 300, 'community'),
      S('why', 'Describe the unique qualities that attract you to the specific undergraduate College or School (including preferred admission and dual degree programs) to which you are applying at the University of Michigan. How would that curriculum support your interests?', 550, 'why_major'),
    ],
  },
  {
    name: 'University of Virginia',
    aliases: ['uva', 'virginia'],
    essays: [
      S('school_specific', 'Answer the question that corresponds to the school/program you selected — e.g. for the College of Arts & Sciences: "What about your individual background, perspective, or experience will serve as a source of strength for you or those around you at UVA?"', 400, 'why_major'),
      S('short_1', 'Short answer: What\'s your favorite word and why?', 50, 'short'),
      S('short_2', 'Short answer: We are a community with quirks, both in language and in traditions. Describe one of your quirks and why it is part of who you are.', 50, 'short', false),
    ],
  },
  {
    name: 'Georgia Institute of Technology',
    aliases: ['georgia tech', 'gatech', 'georgia institute of technology'],
    essays: [
      S('why', 'Why do you want to study your chosen major specifically at Georgia Tech?', 300, 'why_major'),
    ],
  },
  {
    name: 'University of Texas at Austin',
    aliases: ['ut austin', 'texas austin', 'university of texas'],
    essays: [
      S('why_major', 'Why are you interested in the major you indicated as your first-choice major?', 300, 'why_major'),
      S('short_1', 'Short answer: Describe how your experiences, perspectives, talents, and/or your involvement in leadership activities will help you to make an impact both in and out of the classroom while enrolled at UT.', 300, 'community'),
      S('short_2', 'Short answer: Tell us about a goal you set for yourself and what you did to reach it, or reevaluate along the way.', 300, 'identity'),
    ],
  },
  {
    name: 'University of California',
    aliases: ['uc', 'ucla', 'uc berkeley', 'berkeley', 'uc san diego', 'ucsd', 'uc davis', 'uc irvine', 'uc santa barbara', 'ucsb'],
    essays: [
      S('piq_leadership', 'Personal Insight Question: Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time.', 350, 'activity'),
      S('piq_creative', 'Personal Insight Question: Every person has a creative side, and it can be expressed in many ways. Describe how you express your creative side.', 350, 'creative'),
      S('piq_talent', 'Personal Insight Question: What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?', 350, 'identity'),
      S('piq_educational', 'Personal Insight Question: Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced.', 350, 'intellectual'),
      S('piq_challenge', 'Personal Insight Question: Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?', 350, 'identity'),
      S('piq_subject', 'Personal Insight Question: Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom.', 350, 'intellectual'),
      S('piq_community', 'Personal Insight Question: What have you done to make your school or your community a better place?', 350, 'community'),
      S('piq_standout', 'Personal Insight Question: Beyond what has already been shared in your application, what do you believe makes you a strong candidate for admission to the University of California?', 350, 'identity'),
    ],
    note: 'The UC application asks for four Personal Insight Questions of your choosing out of these eight — you answer four, not all of them, and each is capped at 350 words.',
  },
  {
    name: 'Boston University',
    aliases: ['bu', 'boston university'],
    essays: [
      S('why', 'What about being a student at BU most excites you? How do you hope to contribute to our campus community?', 300, 'why_school'),
    ],
  },
  {
    name: 'Case Western Reserve University',
    aliases: ['case western', 'cwru'],
    essays: [
      S('why', 'How will your experiences, perspectives, and identity contribute to and enrich the Case Western Reserve community?', 300, 'community'),
      S('why_major', 'Why are you interested in your intended major, and what draws you to studying it at Case Western Reserve?', 300, 'why_major', false),
    ],
  },
  {
    name: 'Tufts University',
    aliases: ['tufts'],
    essays: [
      S('why', 'It\'s cool to love learning. What excites your intellectual curiosity?', 150, 'intellectual'),
      S('community', 'How have the environments or experiences of your upbringing — your family, home, neighborhood, or community — shaped the person you are today?', 250, 'identity'),
      S('creative', 'Using a specific example or two, tell us about a way that you contributed to building a collaborative and/or inclusive community.', 250, 'community'),
    ],
  },
  {
    name: 'Carnegie Mellon University',
    aliases: ['carnegie mellon', 'cmu'],
    essays: [
      S('why_major', 'Most students choose their intended major or area of study based on a passion or inspiration that\'s developed over time. What passion or inspiration led you to choose this area of study?', 300, 'why_major'),
      S('why', 'Consider your application as a whole. What do you personally want to emphasize about your application for the admission committee\'s consideration?', 300, 'identity'),
      S('community', 'Many students pursue college for a specific degree, career opportunity or personal goal. Whichever it may be, learning will be critical to achieve your ultimate goal. As you think ahead to the process of learning during your college years, how will you define a successful college experience?', 300, 'why_school'),
    ],
  },
  {
    name: 'University of Notre Dame',
    aliases: ['notre dame'],
    essays: [
      S('why', 'What excites you about the University of Notre Dame that makes it stand out from other institutions?', 200, 'why_school'),
      S('short_1', 'Short answer: Tell us about a time when you advocated for something you believe in.', 200, 'identity'),
      S('short_2', 'Short answer: What is one thing your future roommate should know about you?', 200, 'creative'),
    ],
  },
  {
    name: 'Wake Forest University',
    aliases: ['wake forest'],
    essays: [
      S('why', 'How did you become interested in Wake Forest University, and why do you think we are a good match?', 150, 'why_school'),
      S('books', 'List five books you have read that piqued your intellectual curiosity, and describe the impact they have had on you.', 150, 'short'),
      S('quote', 'Give us your top ten list. The choice of theme is entirely up to you.', 100, 'creative'),
    ],
  },
];

// ── Lookup ───────────────────────────────────────────────────────────────────
// Students type school names by hand (CollegeAutocomplete accepts freeform), so
// "Duke", "duke university", "Duke Univ." and "UNC Chapel Hill" all have to land
// on the right record. Normalize hard, then try exact name, then aliases, then a
// containment match in both directions — that last one is what makes "University
// of Michigan Ann Arbor" find the Michigan entry.
function normalize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[.,'’]/g, '')
    .replace(/\b(the|univ|university|college|of|at|in)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True when `needle`'s words appear as a consecutive whole-word run inside `haystack`.
// Both sides are already normalized to lowercase space-separated tokens.
function containsWords(haystack, needle) {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

export function getSupplementsFor(collegeName) {
  const q = normalize(collegeName);
  if (!q) return null;
  for (const school of SUPPLEMENTS) {
    if (normalize(school.name) === q) return school;
  }
  for (const school of SUPPLEMENTS) {
    if ((school.aliases || []).some(a => normalize(a) === q)) return school;
  }
  // Whole-word containment in both directions, never raw substring: "Maurice College" normalizes
  // to "maurice", which contains the letters of "rice", and matching that would hand a student
  // Rice University's prompts for a school that has nothing to do with Rice. A wrong school here
  // is worse than no match at all — no match falls through to the AI path, which at least says
  // out loud that it's guessing.
  // "Penn State University" contains the whole word "penn", and "California State" contains
  // "california" — the loose match would hand both students the wrong school's prompts. The flagship
  // and its state system are the single most common confusable pair in American higher education,
  // so a query carrying "state" may only match a school whose own name does.
  const qIsState = containsWords(q, 'state');
  for (const school of SUPPLEMENTS) {
    const schoolName = normalize(school.name);
    if (qIsState && !containsWords(schoolName, 'state')) continue;
    const candidates = [school.name, ...(school.aliases || [])].map(normalize).filter(n => n.length >= 3);
    if (candidates.some(n => containsWords(q, n) || containsWords(n, q))) return school;
  }
  return null;
}

export function hasCuratedSupplements(collegeName) {
  return !!getSupplementsFor(collegeName);
}
