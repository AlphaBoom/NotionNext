import { siteConfig } from '@/lib/config'

const ART = '/images/new-game/hifumi-soujirou.webp'

export function prepareArtwork() {
  return new Promise(resolve => {
    const art = new Image()
    const finish = () => {
      clearTimeout(timer)
      art.onload = art.onerror = null
      resolve()
    }
    const timer = setTimeout(finish, 4000)
    art.onload = art.onerror = finish
    art.src = ART
    if (art.complete) finish()
  })
}

function Wordmark() {
  return (
    <span className='ng-wordmark' aria-label='NEW GAME!'>
      {'NEW'.split('').map((letter, i) => (
        <span aria-hidden='true' key={i}>
          {letter}
        </span>
      ))}
      <span className='ng-word-space' aria-hidden='true'>
        {' '}
      </span>
      {'GAME!'.split('').map((letter, i) => (
        <span aria-hidden='true' key={i + 3}>
          {letter}
        </span>
      ))}
    </span>
  )
}

export function NewGameHero() {
  return (
    <section className='ng-hero' aria-label='NEW GAME! 隐藏主题已解锁'>
      <div
        className='ng-hero-art'
        role='img'
        aria-label='同人插画：ひふみ温柔地抱着刺猬宗次郎'
      />
      <div className='ng-hero-copy'>
        <span className='ng-unlock-stamp'>★ SECRET CHAPTER / CLEAR!</span>
        <p className='ng-small-jp'>いつもの毎日に、ニューゲーム！</p>
        <h2>
          <Wordmark />
        </h2>
        <p className='ng-hero-line'>原来，是这个世界的小刺猬啊。</p>
        <p className='ng-hero-description'>
          你找到了 {siteConfig('AUTHOR')} 的隐藏频道。
          <br />
          从安静的文字，跳进喜欢的世界。
        </p>
        <span className='ng-clear-chip'>
          90秒夜行达成 <b>＋</b> 隐藏主题 GET!
        </span>
      </div>
      <span className='ng-hero-sticker' aria-hidden='true'>
        おつかれさま！<b>✦</b>
      </span>
      <div className='ng-marquee' aria-hidden='true'>
        <span>
          NEW GAME! ✦ HEDGEHOG CLUB ✦ CREATE / PLAY / REPEAT ✦ NEW GAME! ✦
          HEDGEHOG CLUB ✦
        </span>
      </div>
    </section>
  )
}

export default function NewGameTheme({ active, opening, onToggle }) {
  return (
    <>
      <div className={`ng-theme-switch ${active ? 'is-active' : ''}`}>
        <span aria-hidden='true'>✦</span>
        <span>{active ? 'NEW GAME! MODE' : 'NEW GAME! 已解锁'}</span>
        <button type='button' onClick={onToggle}>
          {active ? '恢复原主题' : '再次开启'}
        </button>
      </div>
      {active && (
        <>
          <aside
            className='ng-character-card'
            aria-label='NEW GAME! 主题角色卡'
          >
            <div className='ng-card-art' />
            <span>PLAYER 02</span>
            <strong>ひふみ & 宗次郎</strong>
            <small>今天也要创造一点快乐！</small>
            <a
              href='https://newgame-anime.com/'
              target='_blank'
              rel='noreferrer'
            >
              NEW GAME! 动画官网 ↗
            </a>
            <small className='ng-art-credit'>AI 同人插画 · 非官方主题</small>
          </aside>
          <div className='ng-edge-mark' aria-hidden='true'>
            NEW GAME! / ANOTHER SIDE OF THE BLOG
          </div>
        </>
      )}
      {active && opening && (
        <div className='ng-unlock-opening' aria-hidden='true'>
          <div>
            <span>ACHIEVEMENT UNLOCKED</span>
            <Wordmark />
            <p>欢迎来到，另一个我喜欢的世界。</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        .ng-theme-switch {
          position: fixed;
          z-index: 70;
          bottom: max(18px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
          padding: 8px 9px 8px 17px;
          border: 1px solid #b3a4dc;
          border-radius: 99px;
          background: #fffaff;
          color: #67528a;
          box-shadow: 0 5px 22px #60438926;
          font:
            11px 'Noto Sans SC',
            sans-serif;
        }
        .ng-theme-switch > span:first-child {
          color: #ed6da6;
          font-size: 20px;
        }
        .ng-theme-switch.is-active {
          border: 2px solid #8970c6;
          box-shadow: 3px 4px 0 #cab7ee;
        }
        .ng-theme-switch button {
          border-radius: 99px;
          background: #7760b3;
          color: white;
          padding: 7px 14px;
          font-size: 11px;
          cursor: pointer;
        }
        .ng-theme-switch button:hover {
          background: #d44e93;
        }
        .ng-theme-switch button:focus-visible {
          outline: 2px solid #cf4087;
          outline-offset: 4px;
        }
        body:has(#theme-medium.medium-newgame) {
          background: #f0eafa;
        }
        #theme-medium.medium-newgame {
          --paper: #fffaff;
          --ink: #433853;
          --muted: #796988;
          --line: #dfd0ed;
          --accent: #9860c1;
          --wash: #f4ebfa;
          background:
            radial-gradient(circle, #bda6d444 1.3px, transparent 1.5px) 0 0 /
              18px 18px,
            linear-gradient(130deg, #ede7ff 0%, #fff0f6 48%, #dcf4ee 100%);
        }
        #theme-medium.medium-newgame::before {
          content: '';
          position: fixed;
          z-index: -1;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            135deg,
            transparent 20%,
            #fff6 20%,
            #fff6 24%,
            transparent 24%,
            transparent 74%,
            #f7bed544 74%,
            #f7bed544 81%,
            transparent 81%
          );
        }
        #theme-medium.medium-newgame .medium-nav {
          background: #fffafff2;
          border-top: 5px solid transparent;
          border-image: linear-gradient(
              90deg,
              #a48ade 25%,
              #f193bb 25%,
              #f193bb 50%,
              #88d6c3 50%,
              #88d6c3 75%,
              #eed282 75%
            )
            1;
          box-shadow: 0 4px 0 #b69acf33;
        }
        #theme-medium.medium-newgame .medium-nav-inner {
          min-height: 80px;
          border: 0;
        }
        #theme-medium.medium-newgame .logo {
          border: 0;
          padding: 5px 13px;
          border-radius: 4px 15px 4px 15px;
          background: #9477c4;
          color: #fff;
          font-family: 'Noto Sans SC', sans-serif;
          font-weight: 700;
          box-shadow: 4px 4px 0 #ead48e;
          transform: rotate(-2deg);
        }
        #theme-medium.medium-newgame .medium-nav-item > :is(a, button) {
          padding: 8px 12px;
          border-radius: 99px;
        }
        #theme-medium.medium-newgame .medium-nav-item.is-current > a {
          background: #ede2fa;
          box-shadow: none;
          color: #7b4ca1;
        }
        #theme-medium.medium-newgame .medium-theme-toggle {
          display: none;
        }
        #theme-medium.medium-newgame #medium-navigation > ul {
          gap: 8px;
        }
        #theme-medium.medium-newgame #container-inner {
          background: transparent;
          box-shadow: none;
          padding-bottom: 32px;
        }
        #theme-medium.medium-newgame .medium-home-intro {
          padding-top: 28px;
        }
        #theme-medium.medium-newgame .medium-masthead {
          padding: 18px 22px;
          margin: 22px 0;
          min-height: 128px;
          border: 2px solid #dbc9ed;
          border-radius: 20px 7px 20px 7px;
          background: #fffaffed;
          box-shadow: 5px 5px 0 #d9c7ef;
        }
        #theme-medium.medium-newgame .medium-masthead h1 {
          font:
            700 30px 'Noto Sans SC',
            sans-serif;
          color: #7758a0;
        }
        #theme-medium.medium-newgame .medium-eyebrow {
          margin-bottom: 5px;
          color: #a97abc;
        }
        #theme-medium.medium-newgame .medium-bio {
          margin-top: 6px;
          font-size: 12px;
        }
        #theme-medium.medium-newgame .medium-portrait {
          flex-basis: 110px;
          width: 110px;
          height: 110px;
        }
        #theme-medium.medium-newgame .medium-avatar,
        #theme-medium.medium-newgame .medium-avatar-monogram {
          width: 70px;
          height: 70px;
        }
        #theme-medium.medium-newgame .medium-portrait-orbit {
          border-color: #ed92b7;
        }
        #theme-medium.medium-newgame .medium-topics {
          border: 0;
          border-radius: 12px;
          background: #8e72be;
          padding: 13px 20px;
          color: #f9f4ff;
          margin-bottom: 24px;
          box-shadow: 4px 4px 0 #decbed;
        }
        #theme-medium.medium-newgame .medium-topics-label {
          color: #fff;
        }
        #theme-medium.medium-newgame .medium-topics a:hover {
          color: #ffe3a2;
        }
        #theme-medium.medium-newgame .medium-post {
          position: relative;
          background: #fffafff2;
          padding: 26px;
          margin-bottom: 20px;
          border: 2px solid #dbcbed;
          border-radius: 18px 6px 18px 6px;
          box-shadow: 5px 5px 0 #d8c6ed;
          transition:
            box-shadow 150ms,
            border-color 150ms;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n + 2) {
          box-shadow: 5px 5px 0 #f0cadd;
          border-color: #f0cadd;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n) {
          box-shadow: 5px 5px 0 #bfe3d9;
          border-color: #bfe3d9;
        }
        #theme-medium.medium-newgame .medium-post:hover {
          border-color: #ae88d1;
          box-shadow: 7px 7px 0 #c9b0e4;
        }
        #theme-medium.medium-newgame .medium-post h2 {
          color: #62467f;
          font-weight: 700;
        }
        #theme-medium.medium-newgame .medium-post-cover {
          border-radius: 12px;
          border: 2px solid #e7d7ef;
          transform: rotate(2deg);
        }
        #theme-medium.medium-newgame .medium-post-tags a {
          padding: 2px 9px;
          background: #f4eafa;
          border-radius: 99px;
          color: #9672af;
        }
        #theme-medium.medium-newgame .medium-article-header {
          padding: 30px;
          margin-top: 30px;
          margin-bottom: 24px;
          border: 2px solid #d5bdeb;
          border-radius: 20px 6px 20px 6px;
          background:
            radial-gradient(
              circle at 95% 20%,
              #f2d5eb 0 35px,
              transparent 36px
            ),
            #fffaff;
          box-shadow: 6px 6px 0 #d9c9ee;
        }
        #theme-medium.medium-newgame .medium-article-header::before {
          content: 'NEW GAME! / READING QUEST';
          display: block;
          color: #af7ac7;
          font: 10px monospace;
          letter-spacing: 0.15em;
          margin-bottom: 15px;
        }
        #theme-medium.medium-newgame .medium-article-header h1 {
          font-family: 'Noto Sans SC', sans-serif;
          font-weight: 700;
          color: #684985;
        }
        #theme-medium.medium-newgame .medium-article-meta {
          margin-bottom: 0;
          padding-bottom: 0;
          border: 0;
        }
        #theme-medium.medium-newgame #notion-article {
          background: #fffaff;
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow:
            0 0 0 1px #e3d2ef,
            5px 5px 0 #decfef;
        }
        #theme-medium.medium-newgame #article-wrapper .notion {
          color: var(--ink);
        }
        #theme-medium.medium-newgame
          #article-wrapper
          :is(.notion-h1, .notion-h2, .notion-h3) {
          color: #8960ac;
        }
        #theme-medium.medium-newgame #article-wrapper .notion-quote {
          background: #f4eafa;
          border-left: 4px solid #ca90c1;
          border-radius: 0 10px 10px 0;
          padding: 10px 16px;
        }
        #theme-medium.medium-newgame .medium-catalog {
          padding: 18px;
          background: #fffaffeb;
          border: 1px solid #dfcaec;
          border-radius: 14px;
          box-shadow: 4px 4px 0 #d8c7eb;
        }
        #theme-medium.medium-newgame .medium-article-end {
          background: #fffaff;
          border-radius: 18px;
          padding: 22px;
          margin-top: 28px;
        }
        #theme-medium.medium-newgame .medium-footer {
          background: #fffaff;
          border: 2px solid #dbcaed;
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -4px 0 #ead1e5;
          padding-inline: 25px;
        }
        #theme-medium.medium-newgame .medium-footer::before {
          content: '✦ NEW GAME! — CREATE / PLAY / REPEAT ✦';
          display: block;
          padding-bottom: 16px;
          color: #ac83c7;
          font: 11px monospace;
          letter-spacing: 0.12em;
        }
        #theme-medium.medium-newgame .medium-submenu {
          background: #fffaff;
          border: 2px solid #e3cdef;
          box-shadow: 4px 4px 0 #d9c5ed;
        }
        #theme-medium.medium-newgame [class*='dark:text-gray-'] {
          color: var(--ink);
        }
        #theme-medium.medium-newgame [class*='dark:bg-'] {
          background-color: var(--paper);
        }
        #theme-medium.medium-newgame .medium-game-return {
          color: #8660a8;
        }
        .ng-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-height: 400px;
          border: 3px solid #fff;
          border-radius: 24px 7px 24px 7px;
          background: #ece0f6;
          box-shadow:
            7px 7px 0 #baa1d9,
            0 0 0 1px #d0b6e7;
        }
        .ng-hero-art {
          position: absolute;
          z-index: -1;
          inset: 0;
          background:
            linear-gradient(90deg, #f5effce8, #f5effc70 43%, transparent 66%),
            url('${ART}') center 47% / cover no-repeat;
        }
        .ng-hero-copy {
          position: relative;
          width: 65%;
          padding: 35px 34px 58px;
        }
        .ng-unlock-stamp {
          display: inline-block;
          padding: 5px 12px;
          background: #e279ac;
          border: 2px solid #fff;
          outline: 1px solid #e279ac;
          color: #fff;
          transform: rotate(-3deg);
          font: 10px monospace;
          letter-spacing: 0.08em;
          box-shadow: 3px 3px 0 #d9badf;
        }
        .ng-small-jp {
          color: #9d77b9;
          font-size: 11px;
          letter-spacing: 0.14em;
          margin: 24px 0 5px;
        }
        .ng-wordmark {
          display: block;
          white-space: nowrap;
          font-family: 'Arial Rounded MT Bold', 'Noto Sans SC', sans-serif;
          font-size: clamp(38px, 5vw, 68px);
          font-weight: 900;
          line-height: 1.25;
          letter-spacing: -0.055em;
          filter: drop-shadow(3px 4px 0 #ffffff) drop-shadow(1px 2px 0 #9572bc);
        }
        .ng-wordmark > span:nth-child(4n + 1) {
          color: #9261bd;
        }
        .ng-wordmark > span:nth-child(4n + 2) {
          color: #e17ba7;
        }
        .ng-wordmark > span:nth-child(4n + 3) {
          color: #58afaa;
        }
        .ng-wordmark > span:nth-child(4n) {
          color: #d9ae56;
        }
        .ng-wordmark .ng-word-space {
          display: inline-block;
          width: 0.16em;
        }
        .ng-hero-line {
          font-size: 19px;
          font-weight: 700;
          color: #674d82;
          margin-top: 16px;
        }
        .ng-hero-description {
          font-size: 12px;
          line-height: 1.9;
          color: #897093;
          margin-top: 9px;
        }
        .ng-clear-chip {
          display: inline-block;
          margin-top: 23px;
          padding: 7px 13px;
          border-radius: 6px;
          border: 1px dashed #b598d0;
          background: #fffaffc9;
          font-size: 10px;
          color: #9473ad;
        }
        .ng-clear-chip b {
          color: #d983a7;
          margin: 0 5px;
        }
        .ng-hero-sticker {
          position: absolute;
          right: 17px;
          top: 18px;
          transform: rotate(8deg);
          background: #fff7c8;
          color: #9e7aaa;
          padding: 8px 13px;
          border: 2px solid white;
          border-radius: 50% 50% 6px 50%;
          font-size: 11px;
          box-shadow: 3px 3px 0 #b89ccb;
        }
        .ng-hero-sticker b {
          display: block;
          font-size: 25px;
          text-align: right;
          color: #da8cb5;
        }
        .ng-marquee {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
          background: #9476bebd;
          border-top: 2px solid #fff9;
          color: #fff;
          height: 26px;
          font: 9px/26px monospace;
          letter-spacing: 0.15em;
          white-space: nowrap;
          text-align: center;
        }
        .ng-character-card {
          display: none;
          position: fixed;
          left: max(18px, calc(50% - 710px));
          top: 230px;
          width: 155px;
          padding: 9px 9px 13px;
          border: 2px solid white;
          border-radius: 13px 4px 13px 4px;
          background: #fef8ff;
          transform: rotate(-3deg);
          box-shadow: 5px 5px 0 #bfa8d9;
          color: #8766a1;
          z-index: 20;
        }
        .ng-card-art {
          height: 153px;
          border-radius: 8px;
          margin-bottom: 12px;
          background: url('${ART}') 85% 40% / auto 180px no-repeat;
        }
        .ng-character-card > span {
          display: block;
          font: 8px monospace;
          color: #b18cc2;
          letter-spacing: 0.1em;
        }
        .ng-character-card strong {
          display: block;
          font-size: 13px;
          margin: 3px 0;
        }
        .ng-character-card small,
        .ng-character-card a {
          display: block;
          font-size: 9px;
          line-height: 1.8;
        }
        .ng-character-card a {
          color: #ad79b6;
          margin-top: 8px;
        }
        .ng-character-card .ng-art-credit {
          color: #a696ae;
          font-size: 8px;
          margin-top: 8px;
        }
        .ng-edge-mark {
          position: fixed;
          right: 15px;
          top: 45%;
          z-index: 10;
          pointer-events: none;
          writing-mode: vertical-rl;
          font: 9px monospace;
          letter-spacing: 0.18em;
          color: #b096c7;
        }
        .ng-unlock-opening {
          position: fixed;
          inset: 0;
          z-index: 65;
          display: grid;
          place-items: center;
          text-align: center;
          pointer-events: none;
          background: repeating-conic-gradient(
            from 25deg at 50% 50%,
            #eee1ff 0deg 12deg,
            #fbe8f3 12deg 24deg
          );
          animation: ng-unlock-reveal 1800ms both;
        }
        .ng-unlock-opening > div {
          padding: 25px;
          transform: rotate(-5deg);
        }
        .ng-unlock-opening > div > span:first-child {
          display: block;
          font: 12px monospace;
          letter-spacing: 0.2em;
          color: #b679a9;
          margin-bottom: 18px;
        }
        .ng-unlock-opening .ng-wordmark {
          font-size: clamp(55px, 10vw, 132px);
        }
        .ng-unlock-opening p {
          color: #9673af;
          margin-top: 20px;
          font-size: 15px;
        }
        @keyframes ng-unlock-reveal {
          0% {
            clip-path: polygon(0 45%, 100% 45%, 100% 55%, 0 55%);
          }
          15%,
          65% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            transform: none;
          }
          100% {
            clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
            transform: translateX(8%);
          }
        }
        body:has(#theme-medium.medium-full-width) .ng-character-card {
          display: none;
        }
        @media (min-width: 1480px) {
          .ng-character-card {
            display: block;
          }
        }
        @media (max-width: 950px) {
          .ng-hero {
            min-height: 365px;
          }
          .ng-hero-copy {
            width: 70%;
            padding: 28px 24px 46px;
          }
          .ng-hero-line {
            font-size: 16px;
          }
          .ng-edge-mark {
            display: none;
          }
        }
        @media (max-width: 600px) {
          .ng-hero {
            min-height: 430px;
          }
          .ng-hero-art {
            background-position:
              center,
              70% 0;
            background-image:
              linear-gradient(0deg, #f5effc 3%, #f5effcdd 43%, transparent 76%),
              url('${ART}');
          }
          .ng-hero-copy {
            padding: 180px 20px 44px;
            width: 100%;
          }
          .ng-unlock-stamp {
            font-size: 8px;
          }
          .ng-small-jp {
            margin-top: 14px;
          }
          .ng-wordmark {
            font-size: 44px;
          }
          .ng-hero-line {
            font-size: 15px;
          }
          .ng-hero-description {
            font-size: 11px;
          }
          .ng-clear-chip {
            margin-top: 12px;
          }
          #theme-medium.medium-newgame .medium-post {
            padding: 17px;
          }
          #theme-medium.medium-newgame .medium-article-header {
            padding: 22px;
          }
          #theme-medium.medium-newgame #notion-article {
            padding: 18px 14px;
          }
          .ng-theme-switch {
            gap: 8px;
            font-size: 9px;
            padding-left: 12px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ng-unlock-opening {
            display: none;
          }
          #theme-medium.medium-newgame *,
          .ng-theme-switch {
            animation: none !important;
            transition: none !important;
          }
        }
        @media print {
          .ng-theme-switch,
          .ng-character-card,
          .ng-edge-mark,
          .ng-unlock-opening,
          .ng-hero {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
