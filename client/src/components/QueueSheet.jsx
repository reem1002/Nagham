import { useRef, useState } from 'react';
import { Sheet } from './Sheet.jsx';
import { SongCover } from './Cover.jsx';
import { Eq } from './SongRow.jsx';
import { IconDrag, IconClose } from './Icons.jsx';
import { usePlayer } from '../lib/hooks.js';
import { jumpTo, removeFromQueue, moveInQueue, clearUpcoming } from '../player/engine.js';

const ROW_H = 60;

/** Queue with touch-friendly drag-to-reorder (pointer events, works on Android). */
export function QueueSheet({ open, onClose }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const [drag, setDrag] = useState(null); // { from, offset }
  const startY = useRef(0);

  const upcoming = queue.slice(index + 1);
  const current = queue[index];

  const onPointerDown = (e, i) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDrag({ from: i, offset: 0 });
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    setDrag({ ...drag, offset: e.clientY - startY.current });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const delta = Math.round(drag.offset / ROW_H);
    const to = Math.max(0, Math.min(upcoming.length - 1, drag.from + delta));
    if (to !== drag.from) moveInQueue(index + 1 + drag.from, index + 1 + to);
    setDrag(null);
  };

  const targetOf = drag ? Math.max(0, Math.min(upcoming.length - 1, drag.from + Math.round(drag.offset / ROW_H))) : null;

  return (
    <Sheet open={open} onClose={onClose} title="Queue" tall>
      {current && (
        <>
          <div className="queue-label">Now playing</div>
          <div className="queue-row current">
            <SongCover song={current} size={44} radius={8} />
            <div className="meta">
              <div className="title truncate" dir="auto">{current.title}</div>
              <div className="sub truncate" dir="auto">{current.artist?.name}</div>
            </div>
            <Eq paused={!playing} />
          </div>
        </>
      )}
      <div className="queue-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Up next · {upcoming.length}</span>
        {upcoming.length > 0 && (
          <button className="see-all" onClick={clearUpcoming}>Clear</button>
        )}
      </div>
      {upcoming.length === 0 && <p className="faint" style={{ padding: '8px 4px' }}>Nothing queued. Use “Play next” or “Add to queue” on any song.</p>}
      <div className="queue-list" style={{ position: 'relative' }}>
        {upcoming.map((s, i) => {
          let y = 0;
          if (drag) {
            if (i === drag.from) y = drag.offset;
            else if (drag.from < i && i <= targetOf) y = -ROW_H;
            else if (drag.from > i && i >= targetOf) y = ROW_H;
          }
          return (
            <div
              key={`${s._id}-${index + 1 + i}`}
              className={`queue-row ${drag?.from === i ? 'dragging' : ''}`}
              style={{ transform: `translateY(${y}px)`, transition: drag?.from === i ? 'none' : 'transform .18s' }}
              onClick={() => jumpTo(index + 1 + i)}
            >
              <SongCover song={s} size={44} radius={8} />
              <div className="meta">
                <div className="title truncate" dir="auto">{s.title}</div>
                <div className="sub truncate" dir="auto">{s.artist?.name}</div>
              </div>
              <button className="icon-btn" aria-label="Remove from queue" onClick={(e) => (e.stopPropagation(), removeFromQueue(index + 1 + i))}>
                <IconClose size={18} />
              </button>
              <span
                className="drag-handle"
                aria-label="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <IconDrag size={20} />
              </span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
