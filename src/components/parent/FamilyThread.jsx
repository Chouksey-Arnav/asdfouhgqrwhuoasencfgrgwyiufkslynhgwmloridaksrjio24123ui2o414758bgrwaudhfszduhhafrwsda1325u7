// The conversation between a parent and a student, rendered identically for both of them.
//
// ── One component, both roles — the same rule the rest of this feature follows ──
// ConnectionsPanel renders inside the parent app AND inside the student's Settings tab, and this
// does the same, for a reason that is stronger here than there: the whole argument for letting a
// parent send anything (see supabase/migrations/0011_family_messages.sql) is that the student can
// answer, decline, and see exactly what was said. Two components would drift, and the half that
// drifts is always the student's.
//
// So the only role-dependent things in this file are the wording of the empty state, and which
// composer controls exist — a quiz request is a parent's move and the server enforces that, so
// showing the control to a student would be offering them a button that 400s.
//
// ── What is deliberately absent ─────────────────────────────────────────────
// No typing indicators, no read receipts on screen, no editing, no deleting, no threading. A
// message here is a line next to a study plan, not a chat window, and every affordance that makes
// it feel like a chat window makes it likelier to become the place an argument happens.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandLoader } from '../BrandJourney';
import toast from 'react-hot-toast';
import {
  Loader2, Send, MessageSquare, ClipboardList, HelpCircle, Check, X, CornerDownRight, Clock,
} from 'lucide-react';
import { C, glass2, btn, btnG, inp, CC, R, pill, tint, onTint } from '../../lib/theme';
import * as ParentAPI from '../../lib/parentApi';

const KINDS = {
  note: { icon: MessageSquare, hue: () => C.violet, label: 'Note', verb: 'Send note' },
  question: { icon: HelpCircle, hue: () => C.cyan, label: 'Question', verb: 'Ask' },
  quiz_request: { icon: ClipboardList, hue: () => C.blue, label: 'Quiz request', verb: 'Send request' },
};

const STATUS = {
  done: () => ({ bg: tint(C.green, 0.13), color: C.greenL, label: 'Done' }),
  declined: () => ({ bg: tint(C.t3, 0.13), color: C.t3, label: 'Said no' }),
};

const MAX = 600;

/** "just now" / "20 min ago" / "3 d ago" — a thread reads by recency, not by clock time. */
function ago(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days < 8 ? `${days} d ago` : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * One message, and — when the reader is the one who received it and it asked for something — the
 * two buttons that answer it.
 *
 * The buttons are "I did it" and "Not this week", and the second one is not a softer way of
 * ignoring the first. A request that can only be accepted is an instruction, and this product
 * does not let a parent instruct: `declined` is a first-class outcome, stored, shown to the
 * parent in those words, and the end of the matter.
 */
function Message({ message, onAnswer, busy }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const meta = KINDS[message.kind] || KINDS.note;
  const Icon = meta.icon;
  const hue = meta.hue();
  const status = message.status !== 'open' ? (STATUS[message.status] || STATUS.done)() : null;
  // Only the recipient answers, and only the two actionable kinds are worth answering.
  const canAnswer = !message.mine && message.status === 'open' && message.kind !== 'note';

  const submitReply = async (e) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text) return;
    await onAnswer(message.id, { status: 'done', reply: text });
    setReplying(false);
    setReply('');
  };

  return (
    <div style={glass2({
      ...CC({ gap: 10 }),
      // The viewer's own messages sit in a plainer box. Not a chat bubble alignment — a thread
      // this short reads better as a list — but enough that "what I said" and "what they said"
      // are distinguishable at a glance.
      borderColor: message.mine ? C.b1 : tint(hue, 0.28),
      background: message.mine ? C.surf2 : tint(hue, 0.05),
    })}>
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <Icon size={13} color={hue} />
        <span style={{ fontSize: 11, fontWeight: 700, color: hue, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {meta.label}
        </span>
        {message.topic && (
          <span style={pill(tint(hue, 0.12), onTint(hue), { fontSize: 10.5 })}>{message.topic}</span>
        )}
        {status && <span style={pill(status.bg, status.color, { fontSize: 10.5 })}>{status.label}</span>}
        {message.unread && <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 10.5 })}>New</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.t4 || C.t3, whiteSpace: 'nowrap' }}>
          {message.mine ? 'You' : 'Them'} · {ago(message.createdAt)}
        </span>
      </div>

      <div style={{ fontSize: 13.5, color: C.t1, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.body}
      </div>

      {message.reply && (
        <div style={R({ gap: 8, alignItems: 'flex-start', paddingTop: 2 })}>
          <CornerDownRight size={13} color={C.t3} style={{ flexShrink: 0, marginTop: 3 }} />
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.reply}
          </div>
        </div>
      )}

      {canAnswer && !replying && (
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <button type="button" disabled={busy} onClick={() => onAnswer(message.id, { status: 'done' })} style={btnG({ fontSize: 12 })}>
            <Check size={12} /> {message.kind === 'quiz_request' ? 'Did it' : 'Answered'}
          </button>
          <button type="button" disabled={busy} onClick={() => setReplying(true)} style={btnG({ fontSize: 12 })}>
            <CornerDownRight size={12} /> Reply
          </button>
          <button type="button" disabled={busy} onClick={() => onAnswer(message.id, { status: 'declined' })} style={btnG({ fontSize: 12 })}>
            <X size={12} /> Not this week
          </button>
        </div>
      )}

      {canAnswer && replying && (
        <form onSubmit={submitReply} style={CC({ gap: 8 })}>
          <input
            autoFocus value={reply} onChange={(e) => setReply(e.target.value)}
            placeholder="One line back…" maxLength={MAX} aria-label="Your reply" style={inp({ fontSize: 13 })}
          />
          <div style={R({ gap: 8 })}>
            <button type="submit" disabled={busy || !reply.trim()} style={btn(C.blueGrad, { fontSize: 12, padding: '8px 16px', opacity: busy || !reply.trim() ? 0.6 : 1 })}>
              <Send size={12} /> Send
            </button>
            <button type="button" onClick={() => { setReplying(false); setReply(''); }} style={btnG({ fontSize: 12 })}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * @param {object}   props
 * @param {string}   props.linkId       the connection this thread belongs to
 * @param {string}   props.role         'parent' | 'student' — who is reading
 * @param {string?}  props.counterparty their name, for the empty state and the placeholder
 * @param {Function} props.onUnreadChange called with the thread's unread count after every load
 * @param {boolean}  props.compact      drop the heading (the caller already drew one)
 */
export default function FamilyThread({ linkId, role, counterparty, onUnreadChange, compact = false }) {
  const [messages, setMessages] = useState(null); // null = not loaded
  const [available, setAvailable] = useState(true);
  const [kind, setKind] = useState(role === 'parent' ? 'note' : 'note');
  const [topic, setTopic] = useState(ParentAPI.QUIZ_TOPICS[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const them = counterparty || (role === 'parent' ? 'your student' : 'them');

  const load = useCallback(async ({ markRead = false } = {}) => {
    try {
      const res = await ParentAPI.fetchMessages(linkId);
      setMessages(res.messages || []);
      setAvailable(res.available !== false);
      onUnreadChange?.(res.unread || 0);
      // Opening the thread IS reading it. Done after the render data is in hand rather than
      // before, so a failed load never silently clears somebody's unread badge.
      if (markRead && (res.messages || []).some((m) => m.unread)) {
        await ParentAPI.markThreadRead(linkId);
        onUnreadChange?.(0);
      }
    } catch {
      // A thread that will not load is not a broken account — this sits inside a settings tab and
      // a dashboard that both still work. Fail quiet and let the next open retry.
      setMessages([]);
    }
  }, [linkId, onUnreadChange]);

  useEffect(() => { load({ markRead: true }); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      await ParentAPI.sendMessage(linkId, { kind, body, topic: kind === 'quiz_request' ? topic : null });
      setText('');
      setKind('note');
      await load();
      toast.success(kind === 'quiz_request' ? 'Request sent.' : 'Sent.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const answer = async (messageId, patch) => {
    setBusy(true);
    try {
      await ParentAPI.answerMessage(messageId, patch);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const open = useMemo(
    () => (messages || []).filter((m) => !m.mine && m.status === 'open' && m.kind !== 'note').length,
    [messages],
  );

  if (messages === null) {
    return <div style={{ padding: 18 }}><BrandLoader size={112} progress={false} /></div>;
  }

  if (!available) {
    return (
      <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
        Messages are not switched on for this deployment yet.
      </div>
    );
  }

  return (
    <div style={CC({ gap: 12 })}>
      {!compact && (
        <div style={CC({ gap: 4 })}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>
            {role === 'parent' ? `You and ${them}` : `${them} and you`}
          </div>
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.55 }}>
            {role === 'parent'
              ? 'Short notes, questions, and requests to sit a quiz. It shows up in their app, not their inbox — and they can always say no.'
              : 'Anything they send lands here. You can answer in a line, say you did it, or say not this week — none of it changes your plan on its own.'}
          </div>
        </div>
      )}

      {open > 0 && (
        <div style={{ ...R({ gap: 8 }), fontSize: 12.5, color: C.amberL }}>
          <Clock size={13} /> {open} waiting for {role === 'parent' ? 'them' : 'you'}.
        </div>
      )}

      {/* ── Composer ────────────────────────────────────────────────────────
          Above the thread rather than under it, because the thread is short, capped, and read
          newest-first — putting the box at the bottom of a reverse-chronological list is the
          arrangement that makes people scroll to find it. */}
      <form onSubmit={send} style={glass2({ ...CC({ gap: 10 }) })}>
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          {Object.entries(KINDS)
            // A quiz request is a parent's move. The server refuses it from a student, so the
            // control does not exist for one — an offered button that 400s is worse than none.
            .filter(([id]) => id !== 'quiz_request' || role === 'parent')
            .map(([id, meta]) => {
              const on = kind === id;
              const hue = meta.hue();
              const Icon = meta.icon;
              return (
                <button
                  key={id} type="button" onClick={() => setKind(id)}
                  aria-pressed={on}
                  style={{
                    ...R({ gap: 6 }), padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: C.FB,
                    color: on ? onTint(hue) : C.t3,
                    background: on ? tint(hue, 0.13) : 'transparent',
                    border: `1px solid ${on ? tint(hue, 0.32) : C.b1}`,
                    transition: 'all .15s',
                  }}
                >
                  <Icon size={12} /> {meta.label}
                </button>
              );
            })}
        </div>

        {kind === 'quiz_request' && (
          <select
            value={topic} onChange={(e) => setTopic(e.target.value)}
            aria-label="Quiz topic"
            style={inp({ fontSize: 13, cursor: 'pointer' })}
          >
            {ParentAPI.QUIZ_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          rows={3}
          maxLength={MAX}
          aria-label="Your message"
          placeholder={
            kind === 'quiz_request' ? `Why you're asking — “ten minutes before dinner would do it.”`
              : kind === 'question' ? `Something you want to ask ${them}…`
                : `Something you want to say to ${them}…`
          }
          style={inp({ resize: 'vertical', lineHeight: 1.6, fontFamily: C.FB })}
        />

        <div style={R({ gap: 10, flexWrap: 'wrap' })}>
          <button type="submit" disabled={busy || !text.trim()} style={btn(C.blueGrad, { fontSize: 12.5, opacity: busy || !text.trim() ? 0.6 : 1 })}>
            {busy ? <Loader2 className="spin" size={12} /> : <Send size={12} />} {KINDS[kind].verb}
          </button>
          <span style={{ fontSize: 11.5, color: C.t3, marginLeft: 'auto' }}>{text.length}/{MAX}</span>
        </div>
      </form>

      {messages.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
          {role === 'parent'
            ? `Nothing sent yet. A single line lands better than a conversation about it at dinner.`
            : `${them} hasn't sent you anything.`}
        </div>
      ) : (
        <div style={CC({ gap: 10 })}>
          {messages.map((m) => (
            <Message key={m.id} message={m} onAnswer={answer} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}
