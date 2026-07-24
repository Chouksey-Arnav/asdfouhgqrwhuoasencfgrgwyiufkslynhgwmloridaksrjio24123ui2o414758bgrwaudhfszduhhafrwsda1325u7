// ─────────────────────────────────────────────────────────────────────────────
// Auto-suggested deadlines — derives candidate Deadlines-tab entries from data
// the student already entered elsewhere in Portfolio (college EA/ED/RD/aid
// dates, tracked scholarship deadlines) plus a couple of well-known fixed
// program dates (FAFSA's October 1 opening, the AP/IB exam window).
//
// Deliberately NOT AI-generated: a wrong date here isn't a stylistic miss,
// it's a missed application. An LLM has no way to actually know this specific
// student's FAFSA/AP/IB dates, so this only ever surfaces (a) facts the
// student already typed in somewhere else in the app, or (b) genuinely fixed,
// stable program dates — never a guess. The AI's job (see DeadlinesPanel's
// Meta Brain priority summary) is reasoning about urgency over real dates,
// not inventing the dates themselves.
const CURRENT_YEAR = new Date().getFullYear();

function nextOccurrence(monthDay) {
  // Returns this year's date if it hasn't passed yet, otherwise next year's —
  // for fixed annual dates like FAFSA's Oct 1 opening or the May AP/IB window.
  const now = new Date();
  const thisYear = new Date(`${CURRENT_YEAR}-${monthDay}T00:00:00`);
  const year = now > thisYear ? CURRENT_YEAR + 1 : CURRENT_YEAR;
  return `${year}-${monthDay}`;
}

function alreadyTracked(existing, title, dueDate) {
  return existing.some(d => d.title === title && d.due_date === dueDate);
}

// { colleges, scholarships, apIb, existingDeadlines } -> [{ title, due_date, kind, college_id?, source }]
// Each item is ready to spread into createItem('deadlines', ...).
export function deriveSuggestedDeadlines({ colleges = [], scholarships = [], apIb = false, existingDeadlines = [] } = {}) {
  const suggestions = [];

  colleges.forEach(c => {
    if (c.ea_ed_deadline) {
      const title = `${c.name} — EA/ED Deadline`;
      if (!alreadyTracked(existingDeadlines, title, c.ea_ed_deadline)) {
        suggestions.push({ title, due_date: c.ea_ed_deadline, kind: 'early_action', college_id: c.id, source: `from ${c.name}'s College List entry` });
      }
    }
    if (c.rd_deadline) {
      const title = `${c.name} — RD Deadline`;
      if (!alreadyTracked(existingDeadlines, title, c.rd_deadline)) {
        suggestions.push({ title, due_date: c.rd_deadline, kind: 'regular_decision', college_id: c.id, source: `from ${c.name}'s College List entry` });
      }
    }
    if (c.financial_aid_deadline) {
      const title = `${c.name} — Financial Aid Deadline`;
      if (!alreadyTracked(existingDeadlines, title, c.financial_aid_deadline)) {
        suggestions.push({ title, due_date: c.financial_aid_deadline, kind: 'css_profile', college_id: c.id, source: `from ${c.name}'s College List entry` });
      }
    }
  });

  scholarships.forEach(s => {
    if (s.deadline && !['awarded', 'denied'].includes(s.status)) {
      const title = `${s.name} — Scholarship Deadline`;
      if (!alreadyTracked(existingDeadlines, title, s.deadline)) {
        suggestions.push({ title, due_date: s.deadline, kind: 'scholarship', source: 'from your tracked scholarships' });
      }
    }
  });

  if (!existingDeadlines.some(d => d.kind === 'fafsa')) {
    suggestions.push({ title: 'FAFSA Opens', due_date: nextOccurrence('10-01'), kind: 'fafsa', source: 'FAFSA has opened October 1 in recent years' });
  }

  if (apIb) {
    if (!existingDeadlines.some(d => d.kind === 'ap_exam')) {
      suggestions.push({ title: 'AP Exams Begin (typical window — confirm exact dates with your school)', due_date: nextOccurrence('05-01'), kind: 'ap_exam', source: 'AP Exams typically run the first two weeks of May' });
    }
    if (!existingDeadlines.some(d => d.kind === 'ib_exam')) {
      suggestions.push({ title: 'IB Exams Begin (typical window — confirm exact dates with your school)', due_date: nextOccurrence('05-01'), kind: 'ib_exam', source: 'IB Exams typically run early-to-mid May' });
    }
  }

  return suggestions.sort((a, b) => a.due_date.localeCompare(b.due_date));
}
