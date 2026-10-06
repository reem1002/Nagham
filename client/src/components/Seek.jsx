import { useState } from 'react';
import { useTime } from '../lib/hooks.js';
import { seek } from '../player/engine.js';
import { fmtTime } from '../lib/format.js';

export function SeekBar() {
  const { currentTime, duration, buffered } = useTime();
  const [drag, setDrag] = useState(null);
  const value = drag ?? currentTime;
  const max = duration || 1;
  const pct = Math.min(100, (value / max) * 100);
  const bufPct = Math.min(100, (buffered / max) * 100);
  return (
    <div className="seek">
      <input
        type="range"
        className="range"
        min={0}
        max={max}
        step={0.1}
        value={value}
        aria-label="Seek"
        style={{ '--p': `${pct}%`, '--b': `${bufPct}%` }}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => {
          if (drag != null) seek(drag);
          setDrag(null);
        }}
        onKeyUp={() => {
          if (drag != null) seek(drag);
          setDrag(null);
        }}
        onTouchEnd={() => {
          if (drag != null) seek(drag);
          setDrag(null);
        }}
      />
      <div className="seek-times">
        <span>{fmtTime(value)}</span>
        <span>-{fmtTime(Math.max(0, (duration || 0) - value))}</span>
      </div>
    </div>
  );
}

export function MiniProgress() {
  const { currentTime, duration } = useTime();
  return (
    <div className="mini-progress">
      <i style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` }} />
    </div>
  );
}
