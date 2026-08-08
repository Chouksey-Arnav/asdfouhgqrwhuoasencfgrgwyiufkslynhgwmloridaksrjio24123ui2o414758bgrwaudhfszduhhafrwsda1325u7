import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, FlaskConical, ExternalLink, BookOpenCheck, Clock, Microscope } from 'lucide-react';
import { C, glass, glass2, btn, btnSm, inp, R, CC, G, pill, tint } from '../../lib/theme';
import { createItem, deleteItem } from '../../lib/dataApi';
import { SectionTitle, StatTile } from '../ui/PanelHero';
import { showMedabrainToast } from '../../lib/medabrainComments';
import SectionIntro from './SectionIntro';

const STATUSES = ['Ongoing', 'Completed', 'Published'];
// Per call, not a frozen literal — see the note in theme.js's header.
const statusColor = (status) => ({ Ongoing: C.amber, Completed: C.blue, Published: C.green }[status]);

export const researchTotalHours = (entries = []) => entries.reduce((s, e) => s + (e.hours || 0), 0);

// Research experience — formerly the standalone Portfolio → Research tab, now a section of
// Activities & Résumé. Research stays its own tracked resource rather than a row in the generic
// activities list (a mentored project has a PI, an institution and a publication link that the
// activities form has nowhere to put), but it now sits beside that list and counts toward the
// research pillar the activities section grades.
export default function ResearchSection({ accent = C.cyan, entries = [], setEntries, loading = false, onLogged, isMobile = false }) {
  const [title, setTitle] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [institution, setInstitution] = useState('');
  const [description, setDescription] = useState('');
  const [publicationUrl, setPublicationUrl] = useState('');
  const [hours, setHours] = useState('');
  const [status, setStatus] = useState(STATUSES[0]);

  async function addEntry(e) {
    e?.preventDefault();
    if (!title.trim()) { toast.error('Project title is required.'); return; }
    try {
      const row = await createItem('research_experience', {
        title: title.trim(), mentor_name: mentorName.trim() || null, institution: institution.trim() || null,
        description: description.trim() || null, publication_url: publicationUrl.trim() || null,
        hours: hours ? parseFloat(hours) : null, status,
      });
      setEntries(prev => [row, ...prev]);
      setTitle(''); setMentorName(''); setInstitution(''); setDescription(''); setPublicationUrl(''); setHours('');
      showMedabrainToast('research_added', { title: row.title });
      onLogged?.();
    } catch (err) { toast.error(err.message); }
  }

  async function removeEntry(id) {
    if (!window.confirm('Delete this research experience?')) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await deleteItem('research_experience', id); } catch (err) { toast.error(err.message); }
  }

  const totalHours = researchTotalHours(entries);
  const published = entries.filter(e => e.status === 'Published').length;
  const ongoing = entries.filter(e => e.status === 'Ongoing').length;

  return (
    <div style={CC({ gap: 18 })}>
      <SectionIntro icon={FlaskConical} color={accent} color2={C.teal} m={isMobile}
        title="Research Experience"
        blurb="Track lab work, independent projects, and mentored research — link a publication or poster if you have one; it's one of the strongest signals an application can show, and the fastest way to stop looking like every other applicant with the same activities list."
        stats={entries.length > 0 ? [{ value: entries.length, label: entries.length === 1 ? 'project' : 'projects', color: accent }, { value: `${totalHours}h`, label: 'logged', color: C.tealL }] : []} />

      {entries.length > 0 && (
        <div style={G(3, 12, {}, isMobile)}>
          <StatTile icon={Microscope} value={ongoing} label="Ongoing projects" color={C.amber} />
          <StatTile icon={Clock} value={`${totalHours}h`} label="Research hours" color={accent} />
          <StatTile icon={BookOpenCheck} value={published} label="Published" color={C.green} />
        </div>
      )}

      <div style={{ ...glass({ padding: 18 }), background: `linear-gradient(120deg,${tint(accent, 0.06)},rgba(255,255,255,0.02) 55%)`, border: `1px solid ${tint(accent, 0.2)}` }}>
        <SectionTitle icon={Plus} color={accent}>Add Research Experience</SectionTitle>
        <form onSubmit={addEntry} style={CC({ gap: 10 })}>
          <div style={R({ gap: 10, flexWrap: 'wrap' })}>
            <input style={inp({ flex: 1, minWidth: 200 })} placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} />
            <select style={inp({ width: 'auto' })} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={R({ gap: 10, flexWrap: 'wrap' })}>
            <input style={inp({ flex: 1, minWidth: 160 })} placeholder="Mentor / PI name (optional)" value={mentorName} onChange={e => setMentorName(e.target.value)} />
            <input style={inp({ flex: 1, minWidth: 160 })} placeholder="Institution / lab (optional)" value={institution} onChange={e => setInstitution(e.target.value)} />
            <input type="number" min="0" step="0.5" style={inp({ width: 110 })} placeholder="Hours" value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <input style={inp()} placeholder="What did you actually do? (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <input style={inp()} placeholder="Publication / poster / abstract link (optional)" value={publicationUrl} onChange={e => setPublicationUrl(e.target.value)} />
          <button type="submit" style={{ ...btn(accent), alignSelf: 'flex-start' }}><Plus size={14} />Add Research</button>
        </form>
      </div>

      {!loading && entries.length === 0 && (
        <div style={glass({ padding: 24, textAlign: 'center' })}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <FlaskConical size={20} color={accent} />
          </div>
          <div style={{ fontSize: 13, color: C.t2 }}>No research logged yet — even a single independent project is worth tracking here.</div>
        </div>
      )}

      <div style={CC({ gap: 8 })}>
        {entries.map(e => {
          const sc = statusColor(e.status) || accent;
          return (
            <div key={e.id} style={{ ...glass2({ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }), borderLeft: `3px solid ${sc}`, background: `linear-gradient(120deg,${tint(sc, 0.05)},rgba(255,255,255,0.02) 55%)` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: tint(accent, 0.13), border: `1px solid ${tint(accent, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FlaskConical size={15} color={accent} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{e.title}</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{[e.mentor_name, e.institution].filter(Boolean).join(' · ')}{e.hours ? ` · ${e.hours}h` : ''}</div>
                {e.description && <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>{e.description}</div>}
                {e.publication_url && <a href={e.publication_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View publication<ExternalLink size={10} /></a>}
              </div>
              <div style={{ ...R({ gap: 6 }), flexShrink: 0 }}>
                <span style={pill(tint(sc, 0.15), sc, { fontSize: 10 })}>{e.status}</span>
                <button style={btnSm(C.roseDim, { color: C.rose })} onClick={() => removeEntry(e.id)} aria-label="Delete research experience"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
