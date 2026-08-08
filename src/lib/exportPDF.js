// ─────────────────────────────────────────────────────────────────────────────
// jsPDF — PDF exports for quiz results, school lists, flashcard decks
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf';

const BLUE  = [45,  127, 255];
const GREEN = [16,  185, 129];
const AMBER = [245, 158,  11];
const RED   = [244,  63,  94];
const DARK  = [10,   16,  32];
const LIGHT = [148, 163, 192];
const WHITE = [238, 242, 255];

function header(doc, title, subtitle='') {
  // Dark header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 220, 30, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 5, 30, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont('helvetica','bold');
  doc.text('MedSchoolPrep', 12, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.setTextColor(...LIGHT);
  doc.text(title, 12, 20);
  if (subtitle) doc.text(subtitle, 12, 26);
  doc.setTextColor(0,0,0);
  return 40;
}

function footer(doc, pageNum, total) {
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.text(`MedSchoolPrep · Generated ${new Date().toLocaleDateString()} · Page ${pageNum} of ${total}`, 14, 290);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.3);
  doc.line(14, 286, 196, 286);
}

export function exportQuizResult(quiz, answers, score, total) {
  const doc  = new jsPDF({ unit:'mm', format:'a4' });
  const pct  = total > 0 ? Math.round((score/total)*100) : 0;
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  let y = header(doc, `Quiz Result: ${quiz.title}`, date);

  // Score circle (simulated with rect)
  const sc = pct>=80?GREEN:pct>=60?BLUE:AMBER;
  doc.setFillColor(...sc);
  doc.roundedRect(14, y, 182, 28, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(28);
  doc.setFont('helvetica','bold');
  doc.text(`${pct}%`, 20, y+18);
  doc.setFontSize(12);
  doc.setFont('helvetica','normal');
  doc.text(`${score} / ${total} correct`, 60, y+14);
  doc.text(`Category: ${quiz.cat}`, 60, y+22);
  doc.text(`Difficulty: ${quiz.diff}`, 130, y+14);
  y += 36;

  // Questions
  doc.setTextColor(0,0,0);
  answers.forEach((a, i) => {
    if (y > 260) { footer(doc, 1, 1); doc.addPage(); y = header(doc, 'Quiz Results (continued)'); }

    const ok = a.ok || a.isCorrect;
    const col = ok ? GREEN : RED;

    // Question row
    doc.setFillColor(ok ? 240 : 255, ok ? 249 : 235, ok ? 244 : 235);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setTextColor(...col);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text(`${ok?'✓':'✗'} Q${i+1}`, 17, y+5);
    doc.setTextColor(30,30,30);
    doc.setFont('helvetica','normal');
    const qText = doc.splitTextToSize(a.q || a.question || '', 165);
    doc.text(qText[0], 30, y+5);
    y += 10;

    // Explanation (only for wrong answers)
    if (!ok && a.exp) {
      doc.setFontSize(8);
      doc.setTextColor(...LIGHT);
      const expLines = doc.splitTextToSize(`Explanation: ${a.exp}`, 175);
      expLines.slice(0,2).forEach(line => { doc.text(line, 17, y); y += 4; });
      y += 2;
    }
  });

  footer(doc, 1, 1);
  doc.save(`quiz-${quiz.id}-${pct}pct-${Date.now()}.pdf`);
}

export function exportSchoolList(schools, profile={}) {
  const doc   = new jsPDF({ unit:'mm', format:'a4' });
  const tiers = ['Likely','Target','Reach','Stretch'];
  const tc    = { Likely:GREEN, Target:BLUE, Reach:AMBER, Stretch:RED };

  let y = header(doc, 'College List', `GPA ${profile.gpa||'—'} · SAT ${profile.sat||'—'} · Generated ${new Date().toLocaleDateString()}`);

  // Profile summary
  doc.setFillColor(15, 24, 40);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setTextColor(...LIGHT);
  doc.setFontSize(8);
  ['Likely','Target','Reach','Stretch'].forEach((t,i) => {
    const n = schools.filter(s=>s.tier===t).length;
    const col = tc[t];
    doc.setTextColor(...col);
    doc.setFont('helvetica','bold');
    doc.text(`${t}: ${n}`, 20 + i*46, y+7);
  });
  doc.setTextColor(...LIGHT);
  doc.setFont('helvetica','normal');
  doc.text(`Total: ${schools.length} schools`, 20, y+13);
  y += 24;

  let page = 1;
  tiers.forEach(tier => {
    const list = schools.filter(s=>s.tier===tier);
    if (!list.length) return;

    // Tier header
    if (y > 260) { footer(doc, page, 1); doc.addPage(); page++; y = header(doc, 'School List (continued)'); }
    doc.setFillColor(...tc[tier]);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text(`${tier.toUpperCase()} (${list.length})`, 18, y+5);
    y += 11;

    list.forEach(s => {
      if (y > 270) { footer(doc, page, 1); doc.addPage(); page++; y = header(doc, 'School List (continued)'); }
      doc.setFillColor(248,250,252);
      doc.rect(14, y, 182, 9, 'F');
      doc.setDrawColor(230,234,240);
      doc.line(14, y+9, 196, y+9);
      doc.setTextColor(20,30,50);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(s.name, 17, y+4);
      doc.setTextColor(...LIGHT);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.text(`GPA ${s.gpa} · SAT ${s.sat} · ${s.accept}% acceptance · ${s.type} · ${s.state}`, 17, y+8);
      y += 11;
    });
    y += 4;
  });

  footer(doc, page, page);
  doc.save(`school-list-${Date.now()}.pdf`);
}

// `extras` carries the three sections that used to be their own Portfolio tabs and were, until
// the tabs were merged into Activities & Résumé, exported nowhere: clinical/shadowing hours,
// research experience, and dated certifications. A student handing this PDF to a program
// director was leaving out the part of their record that is hardest to argue with.
export function exportPortfolioResume(studentName, activities, awards, gpaEntries=[], extras={}) {
  const { clinical=[], research=[], certifications=[] } = extras || {};
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  let y = header(doc, `Student Profile: ${studentName || 'Student'}`, `Activities, honors, hours & academic history · ${new Date().toLocaleDateString()}`);
  let page = 1;

  function ensureRoom(needed) {
    if (y + needed > 270) { footer(doc, page, page); doc.addPage(); page++; y = header(doc, `Student Profile (continued)`); }
  }

  // GPA snapshot
  if (gpaEntries.length) {
    ensureRoom(20);
    const latest = gpaEntries[gpaEntries.length - 1];
    doc.setFillColor(15, 24, 40);
    doc.roundedRect(14, y, 182, 14, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text(`Current GPA: ${latest.gpa}`, 20, y+9);
    doc.setTextColor(...LIGHT);
    doc.setFont('helvetica','normal');
    doc.text(`${gpaEntries.length} term${gpaEntries.length===1?'':'s'} tracked · Latest: ${latest.term}`, 90, y+9);
    y += 20;
  }

  // Activities section
  if (activities.length) {
    ensureRoom(12);
    doc.setFillColor(...BLUE);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text(`ACTIVITIES (${activities.length})`, 18, y+5);
    y += 11;

    activities.forEach((a) => {
      ensureRoom(22);
      doc.setFillColor(248,250,252);
      doc.rect(14, y, 182, 18, 'F');
      doc.setDrawColor(230,234,240);
      doc.line(14, y+18, 196, y+18);
      doc.setTextColor(20,30,50);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(`${a.position || a.name || 'Activity'}${a.organization?` — ${a.organization}`:''}`, 17, y+5);
      doc.setTextColor(...LIGHT);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.text(`${a.activity_type || a.type || ''}${a.status?` · ${a.status}`:''}${(a.hours_per_week||a.hours)?` · ${a.hours_per_week||a.hours} hrs`:''}`, 17, y+10);
      if (a.description) {
        const descLines = doc.splitTextToSize(a.description, 175);
        doc.setTextColor(60,70,90);
        doc.text(descLines[0] || '', 17, y+15);
      }
      y += 21;
    });
    y += 3;
  }

  // Honors & Awards section
  if (awards.length) {
    ensureRoom(12);
    doc.setFillColor(...AMBER);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text(`HONORS & AWARDS (${awards.length})`, 18, y+5);
    y += 11;

    awards.forEach((a) => {
      ensureRoom(10);
      doc.setFillColor(248,250,252);
      doc.rect(14, y, 182, 9, 'F');
      doc.setDrawColor(230,234,240);
      doc.line(14, y+9, 196, y+9);
      doc.setTextColor(20,30,50);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(a.title, 17, y+4);
      doc.setTextColor(...LIGHT);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.text([a.level, a.grade_level && `Grade ${a.grade_level}`].filter(Boolean).join(' · '), 17, y+8);
      y += 11;
    });
  }

  // ── The three sections merged in from the retired Clinical Hours / Research / Skills &
  //    Certs tabs. Same two-line row shape as Honors, so the whole document reads as one
  //    résumé rather than three appendices bolted on.
  function listSection(title, color, rows) {
    if (!rows.length) return;
    ensureRoom(12);
    doc.setFillColor(...color);
    doc.roundedRect(14, y, 182, 7, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text(title, 18, y+5);
    y += 11;
    rows.forEach(({ head, sub }) => {
      ensureRoom(10);
      doc.setFillColor(248,250,252);
      doc.rect(14, y, 182, 9, 'F');
      doc.setDrawColor(230,234,240);
      doc.line(14, y+9, 196, y+9);
      doc.setTextColor(20,30,50);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.text(doc.splitTextToSize(head, 175)[0] || '', 17, y+4);
      doc.setTextColor(...LIGHT);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(sub, 175)[0] || '', 17, y+8);
      y += 11;
    });
  }

  const clinicalHours = clinical.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  listSection(
    `CLINICAL & SHADOWING HOURS (${clinicalHours} total across ${clinical.length} ${clinical.length === 1 ? 'entry' : 'entries'})`,
    GREEN,
    clinical.map((e) => ({
      head: `${e.site_name || 'Site'} — ${e.hours || 0} hrs`,
      sub: [e.site_type, e.entry_date, e.supervisor_name && `Supervisor: ${e.supervisor_name}`,
        e.verification_status === 'verified' ? 'Verified' : 'Self-reported', e.notes].filter(Boolean).join(' · '),
    })),
  );

  listSection(
    `RESEARCH EXPERIENCE (${research.length})`,
    BLUE,
    research.map((e) => ({
      head: `${e.title || 'Project'}${e.institution ? ` — ${e.institution}` : ''}`,
      sub: [e.status, e.mentor_name && `Mentor: ${e.mentor_name}`, e.hours && `${e.hours} hrs`,
        e.publication_url && 'Publication linked', e.description].filter(Boolean).join(' · '),
    })),
  );

  listSection(
    `SKILLS & CERTIFICATIONS (${certifications.length})`,
    AMBER,
    certifications.map((e) => ({
      head: e.name || 'Certification',
      sub: [e.issuing_body, e.earned_date && `Earned ${e.earned_date}`,
        e.expiry_date && `Expires ${e.expiry_date}`].filter(Boolean).join(' · ') || 'No issuing body recorded',
    })),
  );

  footer(doc, page, page);
  doc.save(`portfolio-resume-${Date.now()}.pdf`);
}

export function exportPathwayCertificate(pathwayLabel, stats={}) {
  const { studentName='Student', totalLessons=0, completedLessons=0, avgScore=null, completedAt=Date.now() } = stats;
  const doc  = new jsPDF({ unit:'mm', format:'a4', orientation:'landscape' });
  const W = 297, H = 210;
  const date = new Date(completedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  // Background + decorative border
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W-16, H-16);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, W-24, H-24);

  doc.setTextColor(...LIGHT);
  doc.setFontSize(11);
  doc.setFont('helvetica','normal');
  doc.text('MedSchoolPrep', W/2, 28, { align:'center' });

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica','normal');
  doc.text('CERTIFICATE OF COMPLETION', W/2, 42, { align:'center' });

  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(W/2-40, 47, W/2+40, 47);

  doc.setFontSize(10);
  doc.setTextColor(...LIGHT);
  doc.text('This certifies that', W/2, 62, { align:'center' });

  doc.setFontSize(26);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...WHITE);
  doc.text(studentName, W/2, 76, { align:'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.setTextColor(...LIGHT);
  doc.text('has completed every verified lesson in the', W/2, 90, { align:'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...GREEN);
  doc.text(`${pathwayLabel} Pathway`, W/2, 102, { align:'center' });

  // Stats row
  const statY = 122;
  doc.setFillColor(15, 24, 40);
  doc.roundedRect(W/2-90, statY, 180, 20, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT);
  doc.setFont('helvetica','normal');
  doc.text('LESSONS VERIFIED', W/2-60, statY+8, { align:'center' });
  doc.text('AVERAGE QUIZ SCORE', W/2, statY+8, { align:'center' });
  doc.text('DATE COMPLETED', W/2+60, statY+8, { align:'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...WHITE);
  doc.text(`${completedLessons}/${totalLessons}`, W/2-60, statY+16, { align:'center' });
  doc.text(avgScore!=null?`${avgScore}%`:'—', W/2, statY+16, { align:'center' });
  doc.setFontSize(10);
  doc.text(date, W/2+60, statY+16, { align:'center' });

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.setFont('helvetica','normal');
  doc.text('Based on locally verified lesson quizzes · Not an accredited academic credential', W/2, 168, { align:'center' });
  doc.text(`Generated ${new Date().toLocaleDateString()}`, W/2, 174, { align:'center' });

  doc.save(`${pathwayLabel.replace(/\s+/g,'-')}-certificate-${Date.now()}.pdf`);
}

export function exportFlashDeck(deckName, cards) {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  let y = header(doc, `Flashcard Deck: ${deckName}`, `${cards.length} cards · ${new Date().toLocaleDateString()}`);

  cards.forEach((card, i) => {
    if (y > 255) { doc.addPage(); y = header(doc, `${deckName} (continued)`); }

    // Card number + stability indicator
    const stability = card.stability ? Math.round(card.stability) : 0;
    doc.setFillColor(15,24,40);
    doc.roundedRect(14, y, 182, 28, 2, 2, 'F');

    // Card indicator bar
    doc.setFillColor(...BLUE);
    doc.roundedRect(14, y, 2, 28, 1, 1, 'F');

    doc.setTextColor(...LIGHT);
    doc.setFontSize(8);
    doc.text(`CARD ${i+1}${stability?` · Stability: ${stability}d`:''}`, 20, y+5);

    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('Q:', 20, y+11);
    doc.setFont('helvetica','normal');
    const qLines = doc.splitTextToSize(card.front, 165);
    qLines.slice(0,1).forEach((l,li) => doc.text(l, 28, y+11+li*4));

    doc.setTextColor(...LIGHT);
    doc.setFont('helvetica','bold');
    doc.text('A:', 20, y+20);
    doc.setFont('helvetica','normal');
    const aLines = doc.splitTextToSize(card.back, 165);
    aLines.slice(0,2).forEach((l,li) => { doc.setTextColor(148,163,192); doc.text(l, 28, y+20+li*4); });

    y += 32;
  });

  doc.save(`deck-${deckName.replace(/\s+/g,'-')}-${Date.now()}.pdf`);
}
