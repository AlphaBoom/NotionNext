import { formatSurvivalTime } from '../lib/survivorsLeaderboard'

export default function SurvivorsLeaderboard({ board }) {
  const rows = board.rows || []
  return (
    <section className='quill-leaderboard' aria-label='无限模式排行榜'>
      <div className='quill-board-summary'>
        <span>
          <i aria-hidden='true'>✧</i> 每一次夜行，都值得被记住
        </span>
        <span className='quill-board-tag'>TOP 20</span>
      </div>
      {board.loading && (
        <p className='quill-board-notice' role='status'>
          正在读取排行榜…
        </p>
      )}
      {board.loadError && (
        <p className='quill-board-notice' role='alert'>
          {board.loadError}
        </p>
      )}
      {!board.loading && !board.loadError && rows.length === 0 && (
        <div className='quill-board-empty'>
          <span aria-hidden='true'>✧</span>
          <h4>第一段夜行，等你留下名字。</h4>
          <p>完成一次无限挑战，选择上传，就能在这里相遇。</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className='quill-table-wrap'>
          <table>
            <caption className='quill-sr-only'>无限模式前 20 名</caption>
            <thead>
              <tr>
                <th scope='col'>名次</th>
                <th scope='col'>夜行者</th>
                <th scope='col'>生存时间</th>
                <th scope='col'>击退</th>
                <th scope='col'>首领</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className={`${row.rank <= 3 ? 'quill-leading' : ''} ${row.id === board.best?.id ? 'quill-self' : ''}`}
                >
                  <td>
                    <span className='quill-rank-number'>
                      {String(row.rank).padStart(2, '0')}
                    </span>
                  </td>
                  <td className='quill-name'>
                    <span>{row.nickname}</span>
                    {row.id === board.best?.id && <small>你</small>}
                  </td>
                  <td className='quill-time'>
                    {formatSurvivalTime(row.durationMs)}
                  </td>
                  <td>{row.kills}</td>
                  <td>{row.bosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className='quill-board-footer'>
        <p>
          先比生存时间，再比击退、首领数。
          <br />
          同分先到者在前，每个浏览器保留最佳纪录。
        </p>
        <button type='button' disabled={board.loading} onClick={board.refresh}>
          刷新排行 <span aria-hidden='true'>↻</span>
        </button>
      </div>
      <style jsx>{`
        .quill-leaderboard {
          color: var(--ink);
          font-size: 13px;
        }
        .quill-board-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 20px 0 8px;
          padding: 14px 16px;
          background: var(--wash);
          color: var(--accent);
          border-radius: 9px;
        }
        .quill-board-summary > span:first-child {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .quill-board-summary i {
          font-size: 22px;
          font-style: normal;
          line-height: 1;
        }
        .quill-board-tag {
          font: 10px monospace;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }
        .quill-board-notice {
          margin: 16px 0;
          padding: 12px 16px;
          background: var(--wash);
          border-radius: 7px;
          color: var(--muted);
        }
        .quill-table-wrap {
          overflow-x: auto;
          margin: 12px 0;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 5px;
          font-variant-numeric: tabular-nums;
          text-align: left;
        }
        th {
          padding: 8px 12px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 400;
          white-space: nowrap;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          font-size: 12px;
        }
        td:first-child {
          width: 54px;
          border-radius: 8px 0 0 8px;
        }
        td:last-child {
          border-radius: 0 8px 8px 0;
        }
        .quill-rank-number {
          display: inline-grid;
          place-items: center;
          width: 28px;
          height: 28px;
          color: var(--muted);
          font: 13px monospace;
        }
        .quill-leading td {
          background: var(--wash);
          border-bottom-color: transparent;
          padding-top: 15px;
          padding-bottom: 15px;
        }
        .quill-leading .quill-rank-number {
          color: var(--accent);
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-size: 15px;
        }
        .quill-leading .quill-name {
          font-size: 14px;
          font-weight: 500;
        }
        .quill-leading .quill-time {
          color: var(--accent);
          font-size: 19px;
        }
        .quill-time {
          font-family: monospace;
          letter-spacing: -0.04em;
          font-size: 15px;
        }
        .quill-name {
          min-width: 95px;
          max-width: 220px;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .quill-name small {
          display: inline-block;
          margin-left: 7px;
          padding: 1px 5px;
          border: 1px solid var(--accent);
          border-radius: 4px;
          color: var(--accent);
          font-size: 9px;
        }
        .quill-self td:first-child {
          box-shadow: inset 3px 0 var(--accent);
        }
        .quill-board-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding-top: 16px;
          margin-top: 12px;
          border-top: 1px solid var(--line);
        }
        .quill-board-footer p {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.7;
        }
        button {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: 6px;
          color: var(--accent);
          background: var(--paper);
          font: inherit;
          font-size: 11px;
          cursor: pointer;
        }
        button span {
          margin-left: 5px;
        }
        button:hover {
          background: var(--wash);
        }
        button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .quill-board-empty {
          text-align: center;
          padding: 40px 16px;
        }
        .quill-board-empty > span {
          display: inline-grid;
          place-items: center;
          width: 64px;
          height: 64px;
          margin-bottom: 14px;
          border: 1px solid var(--line);
          border-radius: 18px;
          color: var(--accent);
          background: var(--wash);
          font-size: 40px;
        }
        .quill-board-empty h4 {
          margin: 0 0 8px;
          color: var(--ink);
          font-weight: 500;
          font-size: 17px;
        }
        .quill-board-empty p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.7;
        }
        .quill-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
        }
        @media (max-width: 560px) {
          th,
          td {
            padding-left: 7px;
            padding-right: 7px;
          }
          .quill-leading .quill-time {
            font-size: 16px;
          }
          .quill-board-footer {
            gap: 10px;
          }
        }
      `}</style>
    </section>
  )
}
