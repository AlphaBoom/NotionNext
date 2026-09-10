import { formatSurvivalTime } from '../lib/survivorsLeaderboard'

export default function SurvivorsResult({
  result,
  board,
  onRestart,
  onClose,
  onDetails
}) {
  const done = board.status === 'done'
  const busy = board.status === 'sending'
  const attempted = board.status !== 'idle'
  const waiting = board.loading || board.rows === null
  const rankText = board.loadError
    ? '—'
    : waiting
      ? '…'
      : board.rank
        ? `#${String(board.rank).padStart(2, '0')}`
        : '20+'
  const rankLabel = done
    ? board.personalBest
      ? '当前排名'
      : '最佳纪录排名'
    : '本局预计排名'
  const rankNote = board.loadError
    ? '暂时无法读取排名'
    : waiting
      ? '正在与榜单比较'
      : !board.rank
        ? '暂未进入前 20 名'
        : done
          ? '已收录 · TOP 20'
          : busy
            ? '正在上传 · TOP 20'
            : board.status === 'error'
              ? '上传待确认 · TOP 20'
              : '尚未上传 · TOP 20'
  return (
    <section className='quill-result' aria-label='本局结算'>
      <div className='quill-result-heading'>
        <span className='quill-eyebrow'>NIGHT COMPLETE</span>
        <span className='quill-result-badge'>
          {done ? '已留名' : '本局成绩'}
        </span>
      </div>
      <div className='quill-result-score'>
        <div>
          <h3 data-result-title tabIndex={-1}>
            这一夜，你走了这么远。
          </h3>
          <strong className='quill-result-time'>
            {formatSurvivalTime(result.durationMs)}
          </strong>
          <dl className='quill-result-stats'>
            <div>
              <dt>击退</dt>
              <dd>{result.kills}</dd>
            </div>
            <div>
              <dt>首领</dt>
              <dd>{result.bosses}</dd>
            </div>
            <div>
              <dt>等级</dt>
              <dd>LV.{result.level}</dd>
            </div>
          </dl>
        </div>
        <div className='quill-result-rank' role='status' aria-live='polite'>
          <span>{rankLabel}</span>
          <strong>{rankText}</strong>
          <small>{rankNote}</small>
        </div>
      </div>
      <p className='quill-result-note'>
        {done
          ? board.message
          : board.loadError
            ? '排名暂不可用，你仍可上传成绩或稍后查看榜单。'
            : '给这次夜行留个名字。预计排名以提交时榜单为准，保留你的最佳成绩。'}
      </p>
      <form onSubmit={board.submit}>
        <label className='quill-sr-only' htmlFor='quill-nickname'>
          排行榜昵称
        </label>
        <input
          id='quill-nickname'
          name='nickname'
          placeholder='昵称（1–16 字）'
          value={board.nickname}
          onChange={event => board.setNickname(event.target.value)}
          maxLength={32}
          required
          autoComplete='nickname'
          disabled={busy || done}
          aria-describedby='quill-upload-note'
        />
        <button className='quill-upload' type='submit' disabled={busy || done}>
          {busy ? '上传中…' : done ? '已上传 ✓' : '上传成绩 ↗'}
        </button>
      </form>
      <p id='quill-upload-note' className='quill-privacy'>
        {done
          ? '昵称与最佳成绩已公开。'
          : busy
            ? '正在提交本局成绩…'
            : board.status === 'error'
              ? '提交尚未确认，可以重试。'
              : '点击上传才会公开昵称与成绩，无需登录。'}
      </p>
      {board.status === 'error' && (
        <p className='quill-upload-error' role='alert'>
          {board.message}
        </p>
      )}
      <div className='quill-result-actions'>
        <button type='button' onClick={onRestart}>
          {attempted ? '再来一局' : '不上传，再来一局'}
        </button>
        <button
          type='button'
          className='quill-details'
          onClick={onDetails}
          aria-haspopup='dialog'
        >
          查看完整榜单 →
        </button>
        <button type='button' className='quill-return' onClick={onClose}>
          返回博客
        </button>
      </div>
      <style jsx>{`
        .quill-result {
          width: min(680px, 100%);
          padding: 22px 26px 18px;
          border: 1px solid var(--line);
          border-top: 3px solid var(--accent);
          border-radius: 14px;
          color: var(--ink);
          background: var(--paper);
          box-shadow: 0 18px 50px #0003;
          text-align: left;
        }
        .quill-result-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .quill-eyebrow {
          color: var(--accent);
          font: 10px monospace;
          letter-spacing: 0.18em;
        }
        .quill-result-badge {
          font-size: 10px;
          color: var(--accent);
          padding: 3px 9px;
          border-radius: 20px;
          background: var(--wash);
        }
        .quill-result-score {
          display: grid;
          grid-template-columns: 1fr 150px;
          gap: 20px;
          margin: 16px 0;
        }
        .quill-result-score h3 {
          margin: 0 0 5px;
          color: var(--muted);
          line-height: 1.6;
          font-family: inherit;
          font-size: 13px;
          font-weight: 400;
          outline: none;
        }
        .quill-result-time {
          display: block;
          color: var(--ink);
          font: 500 clamp(30px, 4vw, 40px)/1.2 monospace;
          letter-spacing: -0.06em;
          font-variant-numeric: tabular-nums;
        }
        .quill-result-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin: 12px 0 0;
        }
        .quill-result-stats div {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 11px;
        }
        dt {
          color: var(--muted);
        }
        dd {
          margin: 0;
          color: var(--ink);
          font-weight: 600;
        }
        .quill-result-rank {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 3px;
          padding: 8px;
          border-left: 1px solid var(--line);
          text-align: center;
          color: var(--accent);
        }
        .quill-result-rank > span {
          color: var(--muted);
          font-size: 11px;
        }
        .quill-result-rank strong {
          font: 500 46px/1.2 monospace;
          letter-spacing: -0.07em;
        }
        .quill-result-rank small {
          font-size: 10px;
        }
        .quill-result .quill-result-note {
          margin: 0 0 12px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--muted);
        }
        form {
          display: flex;
          gap: 8px;
        }
        input {
          min-width: 0;
          flex: 1;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: var(--wash);
          color: var(--ink);
          padding: 10px 12px;
          font: inherit;
          font-size: 14px;
        }
        input::placeholder {
          color: var(--muted);
        }
        button {
          cursor: pointer;
          font: inherit;
        }
        .quill-upload {
          flex-shrink: 0;
          padding: 10px 18px;
          border: 1px solid var(--accent);
          border-radius: 7px;
          background: var(--accent);
          color: var(--paper);
          font-size: 13px;
          font-weight: 600;
        }
        .quill-upload:hover {
          filter: brightness(0.92);
          color: var(--paper);
        }
        button:disabled,
        input:disabled {
          opacity: 0.65;
          cursor: default;
        }
        .quill-result .quill-privacy {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }
        .quill-result .quill-upload-error {
          margin: 8px 0 0;
          color: var(--accent);
          font-size: 12px;
        }
        .quill-result-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 20px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
        }
        .quill-result-actions button {
          padding: 2px 0;
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 12px;
        }
        .quill-result-actions .quill-details {
          color: var(--accent);
        }
        .quill-result-actions .quill-return {
          margin-left: auto;
        }
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .quill-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
        }
        @media (max-width: 560px) {
          .quill-result {
            padding: 16px;
          }
          .quill-result-score {
            grid-template-columns: 1fr 115px;
            gap: 10px;
          }
          .quill-result-stats {
            gap: 8px;
          }
          .quill-result-rank strong {
            font-size: 36px;
          }
          .quill-upload {
            padding: 10px 12px;
          }
        }
      `}</style>
    </section>
  )
}
