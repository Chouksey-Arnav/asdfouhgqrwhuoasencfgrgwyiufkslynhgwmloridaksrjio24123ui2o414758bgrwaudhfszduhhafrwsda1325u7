import React, { useMemo, useState } from 'react';
import { Play, PlayCircle, ChevronRight } from 'lucide-react';
import { C, glass2, btnG, R, CC, tint, pill } from '../../lib/theme';
import { SatCard } from './satUi';
import {
  videosForSkill, recommendVideos, watchUrl, thumbUrl,
} from '../../data/sat/videos.js';
import { skillMeta } from '../../data/sat/taxonomy';

// ─────────────────────────────────────────────────────────────────────────────
// Video recommendations, rendered from src/data/sat/videos.js.
//
// The design rule here is that a recommendation must always carry its REASON.
// A bare list of videos is a content dump; "you are at 41% on Boundaries, here
// is a 15-minute lesson on Boundaries" is advice. Every surface below leads
// with the skill and the number that put the video on screen.
//
// Thumbnails come from i.ytimg.com and links open on youtube.com in a new tab.
// Nothing is embedded: an iframe player would load YouTube's full tracking
// bundle into a study session, and a student who wants the video is one click
// away either way.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_LABEL = {
  lesson: 'Lesson',
  walkthrough: 'Walkthrough',
  short: 'Short',
};

/** One video, as a horizontal card with a thumbnail. */
export function SatVideoCard({ video, isMobile = false, accentColor = C.sky }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <a
      href={watchUrl(video.yt)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...glass2({ padding: 10 }),
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        textDecoration: 'none',
        transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = tint(accentColor, 0.4); }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.b1; }}
    >
      <div style={{
        position: 'relative',
        width: isMobile ? 84 : 104,
        aspectRatio: '16 / 9',
        flexShrink: 0,
        borderRadius: 7,
        overflow: 'hidden',
        background: tint(accentColor, 0.12),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!imgFailed ? (
          <img
            src={thumbUrl(video.yt)}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            // hqdefault is 4:3 with letterbox bars; cropping to the center
            // recovers the 16:9 frame without stretching anyone's face.
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PlayCircle size={20} color={accentColor} />
        )}
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.28)',
        }}>
          <Play size={16} color="#fff" fill="#fff" />
        </span>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: C.t1, lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {video.title}
        </div>
        <div style={{ ...R({ gap: 7 }), marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>{video.channel}</span>
          {video.kind && video.kind !== 'lesson' && (
            <span style={pill(tint(C.t3, 0.14), C.t3, { fontSize: 9.5, padding: '2px 8px' })}>
              {KIND_LABEL[video.kind] || video.kind}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

/**
 * Videos for one skill, with no card chrome — for embedding inside an already
 * expanded Review Log entry or a skill row.
 */
export function SatSkillVideos({ skill, limit = 2, isMobile = false, heading = true }) {
  const videos = useMemo(() => videosForSkill(skill, { limit }), [skill, limit]);
  if (!videos.length) return null;
  const meta = skillMeta(skill);

  return (
    <div style={CC({ gap: 8 })}>
      {heading && (
        <div style={{ ...R({ gap: 6 }) }}>
          <PlayCircle size={12} color={meta.color} />
          <span style={{
            fontSize: 10, fontWeight: 700, color: meta.color,
            textTransform: 'uppercase', letterSpacing: '.08em',
          }}>
            Watch someone teach {meta.label}
          </span>
        </div>
      )}
      {videos.map(v => (
        <SatVideoCard key={v.yt} video={v} isMobile={isMobile} accentColor={meta.color} />
      ))}
    </div>
  );
}

/**
 * The full recommendation card: grouped by skill, weakest first, each group
 * headed by the reason it is there.
 *
 * @param {Array<{skill:string, accuracy?:number}>} weakSkills weakest-first
 */
export function SatVideoRecommendations({
  weakSkills = [], title = 'Watch this next', limit = 3, perSkill = 2,
  isMobile = false, onNavigate, accent = C.sky,
}) {
  const groups = useMemo(
    () => recommendVideos(weakSkills, { limit, perSkill }),
    [weakSkills, limit, perSkill],
  );
  if (!groups.length) return null;

  return (
    <SatCard title={title} icon={PlayCircle} iconColor={C.rose} m={isMobile}>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginBottom: 14 }}>
        Free lessons on the skills currently costing you the most points. Picked from what
        you have actually missed, not a generic playlist.
      </div>
      <div style={CC({ gap: 18 })}>
        {groups.map(g => (
          <div key={g.skill}>
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginBottom: 9 }}>
              <span style={pill(tint(g.color, 0.14), g.color, { fontSize: 10 })}>{g.skillLabel}</span>
              <span style={{ fontSize: 11, color: C.t3 }}>{g.reason}</span>
            </div>
            <div style={CC({ gap: 8 })}>
              {g.videos.map(v => (
                <SatVideoCard key={v.yt} video={v} isMobile={isMobile} accentColor={g.color} />
              ))}
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('practice', { skill: g.skill })}
                style={{ ...btnG({ padding: '6px 12px', fontSize: 11.5 }), marginTop: 9 }}
              >
                Then drill {g.skillLabel} <ChevronRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </SatCard>
  );
}

export default SatVideoRecommendations;
