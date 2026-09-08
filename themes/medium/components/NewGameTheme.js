import { siteConfig } from '@/lib/config'
import RewardContextMenu from './RewardContextMenu'

const ART = '/images/new-game/hifumi-official.webp'
const ICON = '/images/new-game/hifumi-icon.webp'
const LOGO = '/images/new-game/logo-official.png'

export function prepareArtwork() {
  return Promise.all(
    [ART, LOGO].map(
      src =>
        new Promise(resolve => {
          const art = new Image()
          const finish = () => {
            clearTimeout(timer)
            art.onload = art.onerror = null
            resolve()
          }
          const timer = setTimeout(finish, 4000)
          art.onload = art.onerror = finish
          art.src = src
          if (art.complete) finish()
        })
    )
  )
}

function Wordmark() {
  return <span className='ng-wordmark' role='img' aria-label='NEW GAME!!' />
}

export function NewGameHero() {
  return (
    <section className='ng-hero' aria-label='NEW GAME! 隐藏主题已解锁'>
      <div className='ng-hero-geometry' aria-hidden='true'>
        <svg className='ng-floating-pad' viewBox='0 0 120 80' fill='none'>
          <path
            d='M29 18h62c13 0 23 38 18 48-5 11-20-2-27-11H38c-7 9-22 22-27 11C6 56 16 18 29 18Z'
            fill='#a48bd5'
            stroke='white'
            strokeWidth='4'
          />
          <path d='M34 30v20m-10-10h20' stroke='white' strokeWidth='7' />
          <circle cx='86' cy='33' r='5' fill='#fff4a2' />
          <circle cx='97' cy='45' r='5' fill='#f78eac' />
          <path d='M54 20v-7c0-10 17-3 17-12' stroke='white' strokeWidth='3' />
        </svg>
        <span className='ng-floating-star'>✦</span>
      </div>
      <div className='ng-hero-copy'>
        <p className='ng-section-label'>
          SECRET SAVE <span>BONUS UNLOCKED</span>
        </p>
        <h2>
          <Wordmark />
        </h2>
        <p className='ng-small-jp'>今日も一日、おつかれさま！</p>
        <div className='ng-hero-message'>
          <span className='ng-message-index'>＋</span>
          <p>
            原来，是这个世界
            <br />
            的小刺猬啊。
          </p>
        </div>
        <p className='ng-hero-description'>
          小刺猬带你来的，是我的另一个世界。
          <br />
          收藏喜欢的日常，也认真玩好每一局。
        </p>
        <span className='ng-clear-chip'>
          HIDDEN THEME <b>UNLOCKED!</b>
        </span>
      </div>
      <div className='ng-character-panel'>
        <div
          className='ng-hero-art'
          role='img'
          aria-label='《NEW GAME!》官方角色立绘：泷本日富美'
        />
        <p className='ng-character-name'>
          <span>TAKIMOTO HIFUMI</span>滝本ひふみ
        </p>
        <span className='ng-character-number' aria-hidden='true'>
          ✦
        </span>
      </div>
      <span className='ng-hero-sticker' aria-hidden='true'>
        好きなものを、
        <br />
        好きなだけ。
      </span>
      <div className='ng-hero-footer'>
        <span>
          NEW GAME! <b>×</b> {siteConfig('AUTHOR')}
        </span>
        <a
          href='https://newgame-anime.com/character/'
          target='_blank'
          rel='noreferrer'
        >
          角色素材来自动画官网 ↗
        </a>
      </div>
    </section>
  )
}

export default function NewGameTheme({ active, opening, onToggle }) {
  return (
    <>
      <RewardContextMenu active={active} onToggle={onToggle} />
      {active && (
        <>
          <aside
            className='ng-character-card'
            aria-label='NEW GAME! 主题角色卡'
          >
            <div className='ng-card-art' role='img' aria-label='泷本日富美' />
            <span>CHARACTER / 04</span>
            <strong>滝本ひふみ</strong>
            <small>ひふみ と 宗次郎</small>
            <a
              href='https://newgame-anime.com/'
              target='_blank'
              rel='noreferrer'
            >
              NEW GAME!!
              <br />
              OFFICIAL SITE ↗
            </a>
          </aside>
          <div className='ng-edge-mark' aria-hidden='true'>
            NEW GAME!! ＋ ANOTHER SIDE ＋ {siteConfig('AUTHOR')}
          </div>
          <div className='ng-theme-credit'>
            非官方博客主题 ·{' '}
            <a
              href='https://newgame-anime.com/'
              target='_blank'
              rel='noreferrer'
            >
              NEW GAME! 动画官网
            </a>
            <br />
            角色与标识 © 得能正太郎・芳文社／NEW GAME!製作委員会・NEW
            GAME!!製作委員会
          </div>
        </>
      )}
      {active && opening && (
        <div className='ng-unlock-opening' role='status'>
          <div>
            <span>EXTRA STAGE / UNLOCKED</span>
            <Wordmark />
            <p>隐藏主题已解锁 · 在页面空白处右键切换</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        body:has(#theme-medium.medium-newgame) {
          background: #b9a9e7;
        }
        #theme-medium.medium-newgame {
          --paper: #fffaff;
          --ink: #49415c;
          --muted: #81718c;
          --line: #e9d9ee;
          --accent: #ad4e95;
          --wash: #f5eafb;
          background:
            radial-gradient(circle, #ffffff6b 1.5px, transparent 1.7px) 0 0 /
              19px 19px,
            linear-gradient(
              145deg,
              #aa9be2 0%,
              #e7a8d2 42%,
              #bea7ed 72%,
              #96d8d8 100%
            );
        }
        #theme-medium.medium-newgame .medium-nav {
          background: #725493ed;
          border: 0;
          box-shadow: 0 5px 0 #fff3;
        }
        #theme-medium.medium-newgame .medium-nav-inner {
          min-height: 82px;
          border-bottom: 0;
        }
        #theme-medium.medium-newgame .medium-nav .logo {
          padding: 0;
          border: 0;
          border-radius: 0;
          background: none;
          color: white;
          font:
            700 24px 'Noto Sans SC',
            sans-serif;
          box-shadow: none;
          transform: none;
        }
        #theme-medium.medium-newgame .medium-nav-item > :is(a, button) {
          color: white;
          font-weight: 700;
          border-radius: 0;
          letter-spacing: 0.07em;
        }
        #theme-medium.medium-newgame .medium-nav-item.is-current > a {
          box-shadow: inset 0 -3px 0 #fff59e;
          color: #fff8ad;
        }
        #theme-medium.medium-newgame .medium-theme-toggle {
          display: none;
        }
        #theme-medium.medium-newgame .medium-search-button,
        #theme-medium.medium-newgame .medium-menu-toggle {
          color: white;
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
          min-height: 130px;
          padding: 17px 26px;
          margin: 24px 0 18px;
          border: 2px solid #fff;
          border-radius: 19px 19px 19px 3px;
          background: #fffaffed;
          box-shadow: 5px 5px 0 #9576bd4d;
        }
        #theme-medium.medium-newgame .medium-masthead h1 {
          font:
            700 28px 'Noto Sans SC',
            sans-serif;
          color: #bd5278;
        }
        #theme-medium.medium-newgame .medium-eyebrow {
          color: #b76b85;
          margin-bottom: 6px;
        }
        #theme-medium.medium-newgame .medium-bio {
          margin-top: 7px;
          font-size: 12px;
        }
        #theme-medium.medium-newgame .medium-portrait {
          flex-basis: 108px;
          width: 108px;
          height: 108px;
        }
        #theme-medium.medium-newgame .medium-avatar,
        #theme-medium.medium-newgame .medium-avatar-monogram {
          width: 70px;
          height: 70px;
        }
        #theme-medium.medium-newgame .medium-portrait-orbit {
          border-color: #ed86ab;
        }
        #theme-medium.medium-newgame .medium-topics {
          border: 0;
          border-top: 3px dashed #fff9;
          border-bottom: 3px dashed #fff9;
          padding: 15px 4px;
          margin-bottom: 25px;
          color: #fff;
        }
        #theme-medium.medium-newgame .medium-topics-label {
          color: #fff6ae;
        }
        #theme-medium.medium-newgame .medium-topics a:hover {
          color: #fff6ae;
        }
        #theme-medium.medium-newgame .medium-post {
          position: relative;
          padding: 28px;
          margin-bottom: 22px;
          border: 3px solid #fff;
          border-top: 5px solid #bca3e0;
          border-radius: 18px 5px 18px 5px;
          background: #fffaff;
          box-shadow: 5px 5px 0 #8e72b63b;
          transition:
            transform 160ms,
            box-shadow 160ms;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n + 2) {
          border-top-color: #eea0be;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n) {
          border-top-color: #c0b1de;
        }
        #theme-medium.medium-newgame .medium-post:hover {
          transform: translateY(-2px);
        }
        #theme-medium.medium-newgame .medium-post h2 {
          color: #545264;
          font-weight: 700;
        }
        #theme-medium.medium-newgame .medium-post-meta {
          color: #bb5579;
        }
        #theme-medium.medium-newgame .medium-post-cover {
          border-radius: 10px;
          border: 3px solid #f1e4f3;
          transform: rotate(2deg);
        }
        #theme-medium.medium-newgame .medium-post-tags a {
          padding: 2px 6px;
          background: #f6f1f7;
          border-radius: 0;
          color: #936087;
        }
        #theme-medium.medium-newgame .medium-article-header {
          padding: 32px;
          margin: 30px 0 24px;
          border: 3px solid #fff;
          border-radius: 20px 5px 20px 5px;
          background: #fff4fb;
          box-shadow: 6px 6px 0 #9979bc55;
        }
        #theme-medium.medium-newgame .medium-article-header::before {
          content: 'STORY / NEW GAME!!';
          display: block;
          font:
            700 13px 'Arial Narrow',
            monospace;
          letter-spacing: 0.15em;
          margin-bottom: 18px;
          color: #c2587e;
          padding-bottom: 12px;
          border-bottom: 3px dashed #edb2c6;
        }
        #theme-medium.medium-newgame .medium-article-header h1 {
          color: #555062;
          font-family: 'Noto Sans SC', sans-serif;
          font-weight: 700;
        }
        #theme-medium.medium-newgame .medium-article-meta {
          border: 0;
          padding-bottom: 0;
          margin-bottom: 0;
        }
        #theme-medium.medium-newgame #notion-article {
          background: #fffaff;
          padding: 26px 30px;
          border-radius: 16px;
          box-shadow: 6px 6px 0 #a18ac64d;
        }
        #theme-medium.medium-newgame #article-wrapper .notion {
          color: var(--ink);
        }
        #theme-medium.medium-newgame
          #article-wrapper
          :is(.notion-h1, .notion-h2, .notion-h3) {
          color: #b64e77;
        }
        #theme-medium.medium-newgame #article-wrapper .notion-quote {
          padding: 12px 16px;
          background: #f0f9fb;
          border-left: 4px solid #85cbd5;
          border-radius: 0;
        }
        #theme-medium.medium-newgame .medium-catalog {
          padding: 18px;
          background: #fff;
          border: 5px solid #fff;
          border-top-color: #91d1da;
          border-radius: 0;
          box-shadow: none;
        }
        #theme-medium.medium-newgame .medium-article-end {
          padding: 25px;
          background: #fff;
          border-radius: 0;
        }
        #theme-medium.medium-newgame .medium-footer {
          padding: 26px;
          border: 0;
          border-top: 4px dashed #fff;
          border-radius: 0;
          background: #fffdfde8;
          box-shadow: none;
        }
        #theme-medium.medium-newgame .medium-footer::before {
          content: 'NEW GAME!! ＋ THANK YOU FOR READING';
          display: block;
          padding-bottom: 18px;
          font:
            700 12px 'Arial Narrow',
            monospace;
          letter-spacing: 0.1em;
          color: #bd5a7c;
        }
        #theme-medium.medium-newgame .medium-submenu {
          background: #fff;
          border: 1px solid #ecc9d7;
          box-shadow: 0 5px 18px #bc506322;
        }
        #theme-medium.medium-newgame .medium-submenu a {
          color: #80566b;
        }
        #theme-medium.medium-newgame [class*='dark:text-gray-'] {
          color: var(--ink);
        }
        #theme-medium.medium-newgame [class*='dark:bg-'] {
          background-color: var(--paper);
        }
        #theme-medium.medium-newgame .medium-game-return {
          color: #b34c74;
        }
        .ng-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-height: 486px;
          border: 3px solid #fff;
          border-radius: 26px 7px 26px 7px;
          background: linear-gradient(120deg, #765aa5, #9673b7 48%, #de93c2);
          box-shadow:
            8px 8px 0 #76549b55,
            0 0 0 5px #fff2;
        }
        .ng-hero-geometry {
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle, #ffffff20 1.5px, transparent 2px) 0 0 / 9px
              9px,
            linear-gradient(
              135deg,
              transparent 60%,
              #ffcae333 60% 68%,
              transparent 68%
            ),
            radial-gradient(ellipse at 80% 80%, #ffc5e744, transparent 60%);
        }
        .ng-hero-copy {
          position: relative;
          z-index: 2;
          width: 60%;
          padding: 26px 30px 62px;
        }
        .ng-section-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          margin-bottom: 29px;
          border-bottom: 1px solid #ffffff6b;
          color: #fff3ad;
          font: 700 12px monospace;
          letter-spacing: 0.14em;
        }
        .ng-section-label span {
          font-size: 9px;
          letter-spacing: 0.06em;
        }
        .ng-wordmark {
          display: block;
          width: 330px;
          max-width: 100%;
          aspect-ratio: 300 / 62;
          background: url('${LOGO}') left center / contain no-repeat;
        }
        .ng-small-jp {
          color: #f7d6eb;
          font-size: 11px;
          letter-spacing: 0.22em;
          margin: 17px 0 24px;
        }
        .ng-hero-message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: white;
          font-weight: 700;
        }
        .ng-hero-message p {
          font-size: 29px;
          letter-spacing: 0.07em;
          line-height: 1.6;
        }
        .ng-message-index {
          color: #fff5a0;
          font-size: 28px;
          line-height: 1.5;
        }
        .ng-hero-description {
          color: #f2dfee;
          font-size: 12px;
          line-height: 1.9;
          margin: 18px 0;
        }
        .ng-clear-chip {
          display: inline-flex;
          gap: 10px;
          padding: 8px 12px;
          border: 1px dashed #fff;
          border-radius: 4px;
          font: 10px monospace;
          background: #fff4;
          color: white;
          letter-spacing: 0.06em;
        }
        .ng-clear-chip b {
          color: #fff3a0;
        }
        .ng-character-panel {
          position: absolute;
          z-index: 1;
          top: 30px;
          right: 6%;
          bottom: 67px;
          width: 27%;
          background: #fff;
          border: 7px solid #fff;
          border-radius: 6px;
          box-shadow: 9px 12px 0 #58427c4d;
          transform: rotate(4deg);
        }
        .ng-character-panel::before {
          content: '';
          position: absolute;
          top: -20px;
          left: 25%;
          width: 90px;
          height: 32px;
          z-index: 3;
          background: #ffe9a9b3;
          transform: rotate(-9deg);
        }
        .ng-hero-art {
          position: absolute;
          z-index: 1;
          width: 135px;
          height: 390px;
          bottom: 0;
          left: 12px;
          background: url('${ART}') left center / auto 390px no-repeat;
        }
        .ng-character-name {
          position: absolute;
          z-index: 2;
          right: -21px;
          bottom: -25px;
          color: #9162a7;
          background: #fff0fa;
          border: 3px solid #fff;
          padding: 9px 18px;
          transform: rotate(-7deg);
          font-size: 17px;
          letter-spacing: 0.14em;
        }
        .ng-character-name span {
          display: block;
          margin-bottom: 4px;
          font: 8px monospace;
          letter-spacing: 0.12em;
        }
        .ng-character-number {
          position: absolute;
          z-index: 4;
          left: -28px;
          top: -26px;
          color: #fff0a6;
          font: 700 65px/1 sans-serif;
          text-shadow: 3px 3px #9d6eac;
        }
        .ng-hero-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 3;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          min-height: 29px;
          padding: 9px 18px;
          color: #f5daec;
          background: #503d706b;
          font: 9px monospace;
          letter-spacing: 0.08em;
        }
        .ng-hero-footer b {
          color: #83c1cf;
          margin-inline: 5px;
        }
        .ng-hero-footer a {
          color: #f0dcec;
          font:
            8px 'Noto Sans SC',
            sans-serif;
        }
        .ng-hero-sticker {
          position: absolute;
          z-index: 4;
          right: 18px;
          top: 42px;
          padding: 12px 10px;
          background: #fff3a9;
          color: #9b6095;
          border: 3px solid white;
          border-radius: 45% 45% 45% 5px;
          font-size: 11px;
          line-height: 1.6;
          transform: rotate(11deg);
          box-shadow: 3px 3px 0 #77508444;
        }
        .ng-character-card {
          display: none;
          position: fixed;
          z-index: 20;
          top: 210px;
          left: max(16px, calc(50% - 710px));
          width: 150px;
          text-align: center;
          color: white;
        }
        .ng-card-art {
          width: 124px;
          height: 124px;
          margin: 0 auto 16px;
          background: url('${ICON}') center / contain no-repeat;
        }
        .ng-character-card > span {
          display: block;
          padding-top: 14px;
          border-top: 3px dashed #fff9;
          font: 9px monospace;
          letter-spacing: 0.08em;
        }
        .ng-character-card strong {
          display: block;
          margin: 7px 0;
          font-size: 20px;
          letter-spacing: 0.07em;
        }
        .ng-character-card small {
          font-size: 11px;
        }
        .ng-character-card a {
          display: block;
          margin-top: 19px;
          padding: 10px;
          background: #fff3aa;
          border: 3px solid white;
          border-radius: 6px;
          transform: rotate(-4deg);
          color: #90609f;
          font:
            700 12px/1.6 'Arial Narrow',
            monospace;
        }
        .ng-edge-mark {
          position: fixed;
          right: 20px;
          top: 37%;
          z-index: 10;
          pointer-events: none;
          writing-mode: vertical-rl;
          color: #fff;
          font: 12px monospace;
          letter-spacing: 0.2em;
        }
        .ng-theme-credit {
          padding: 10px 20px 14px;
          color: #806080;
          background: #e8cbea;
          text-align: center;
          font-size: 8px;
          line-height: 1.8;
        }
        .ng-theme-credit a {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .ng-unlock-opening {
          position: fixed;
          z-index: 65;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          text-align: center;
          background: repeating-conic-gradient(
            from 15deg at 50% 50%,
            #a681c9 0deg 12deg,
            #d59cc8 12deg 24deg
          );
          animation: ng-unlock-reveal 1800ms both;
        }
        .ng-unlock-opening > div {
          padding: 30px;
          transform: rotate(-4deg);
          color: white;
        }
        .ng-unlock-opening > div > span:first-child {
          display: block;
          padding-bottom: 18px;
          margin-bottom: 24px;
          border-bottom: 4px dashed white;
          font: 700 13px monospace;
          letter-spacing: 0.16em;
        }
        .ng-unlock-opening .ng-wordmark {
          width: min(600px, 76vw);
          margin: auto;
        }
        .ng-unlock-opening p {
          font-size: 13px;
          margin-top: 28px;
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
        /* The unlocked world moves behind opaque content, without a JS loop. */
        #theme-medium.medium-newgame::before {
          content: '';
          position: fixed;
          z-index: -1;
          inset: -80px;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 8% 25%,
              #fff0ad55 0 105px,
              transparent 106px
            ),
            radial-gradient(
              circle at 91% 45%,
              #83dfdf66 0 190px,
              transparent 191px
            ),
            repeating-linear-gradient(
              -35deg,
              transparent 0 180px,
              #fff2 180px 195px,
              transparent 195px 300px
            );
          animation: ng-world-drift 24s ease-in-out infinite alternate;
        }
        #theme-medium.medium-newgame::after {
          content: 'NEW GAME!!';
          position: fixed;
          z-index: -1;
          top: 51vh;
          left: -3vw;
          white-space: nowrap;
          pointer-events: none;
          color: transparent;
          -webkit-text-stroke: 2px #ffffff80;
          font:
            900 17vw/1 'Arial Narrow',
            sans-serif;
          letter-spacing: -0.04em;
          transform: rotate(-13deg);
          animation: ng-world-title 18s ease-in-out infinite alternate;
        }
        .ng-floating-pad {
          position: absolute;
          width: 126px;
          right: 40%;
          bottom: 45px;
          opacity: 0.75;
          transform: rotate(17deg);
          animation: ng-pad-drift 7s ease-in-out infinite alternate;
        }
        .ng-floating-star {
          position: absolute;
          left: 45%;
          top: 103px;
          color: #fff5a8;
          font-size: 42px;
          text-shadow:
            -290px 235px 0 #fff8,
            28px 206px 0 #ffe594;
          animation: ng-star-turn 12s ease-in-out infinite alternate;
        }
        .ng-hero-art {
          transform-origin: 50% 100%;
          animation: ng-character-float 6s ease-in-out infinite alternate;
        }
        .ng-hero-copy {
          animation: ng-copy-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .ng-character-panel {
          animation: ng-character-enter 750ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .ng-character-card::before {
          content: '';
          position: absolute;
          width: 165px;
          height: 165px;
          top: -20px;
          left: -8px;
          border: 3px dashed #ffffffb3;
          border-radius: 50%;
          pointer-events: none;
          animation: ng-ring-spin 40s linear infinite;
        }
        .ng-edge-mark {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.24em;
        }
        #theme-medium.medium-newgame .medium-post {
          cursor: pointer;
          animation: ng-card-enter 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n + 2) {
          animation-delay: 70ms;
        }
        #theme-medium.medium-newgame .medium-post:nth-child(3n) {
          animation-delay: 140ms;
        }
        #theme-medium.medium-newgame .medium-post:hover {
          transform: translateY(-5px);
          box-shadow: 0 7px 0 #cc537a66;
        }
        #theme-medium.medium-newgame .medium-post-title-link::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        #theme-medium.medium-newgame
          .medium-post
          :is(.medium-post-meta a, .medium-post-tags a, .medium-post-cover) {
          position: relative;
          z-index: 2;
        }
        #theme-medium.medium-newgame
          .medium-post:has(.medium-post-title-link:focus-visible) {
          outline: 3px solid #fff7ae;
          outline-offset: 4px;
        }
        #theme-medium.medium-newgame #container-inner {
          padding-bottom: 12px;
        }
        #theme-medium.medium-newgame .medium-footer {
          padding: 18px 24px;
        }
        #theme-medium.medium-newgame .medium-footer::before {
          padding-bottom: 10px;
          font-size: 10px;
        }
        #theme-medium.medium-newgame .medium-footer-note {
          margin-top: 8px;
        }
        .ng-theme-credit {
          padding: 10px 20px 14px;
          font-size: 8px;
        }
        @keyframes ng-world-drift {
          to {
            transform: translate(48px, 32px);
          }
        }
        @keyframes ng-world-title {
          to {
            transform: translateY(-25px) rotate(-9deg);
          }
        }
        @keyframes ng-pad-drift {
          to {
            transform: translate(12px, -16px) rotate(-8deg);
          }
        }
        @keyframes ng-star-turn {
          to {
            transform: rotate(30deg) scale(0.8);
          }
        }
        @keyframes ng-character-float {
          to {
            transform: translateY(-5px) rotate(0.7deg);
          }
        }
        @keyframes ng-ring-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes ng-copy-enter {
          from {
            opacity: 0;
            transform: translateX(-25px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes ng-character-enter {
          from {
            transform: translateX(70px);
          }
          to {
            transform: rotate(4deg);
          }
        }
        @keyframes ng-card-enter {
          from {
            opacity: 0;
            translate: 0 20px;
          }
          to {
            opacity: 1;
            translate: 0 0;
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
          .ng-edge-mark {
            display: none;
          }
          .ng-hero-copy {
            padding-inline: 22px;
          }
          .ng-hero-message p {
            font-size: 25px;
          }
          .ng-character-name {
            right: 10px;
            font-size: 18px;
          }
        }
        @media (max-width: 767px) {
          #theme-medium.medium-newgame .medium-nav-inner {
            min-height: 68px;
          }
          #theme-medium.medium-newgame #medium-navigation {
            background: #fff;
          }
          #theme-medium.medium-newgame
            #medium-navigation
            .medium-nav-item
            > :is(a, button) {
            color: #a74e71;
          }
          .ng-hero {
            min-height: 455px;
            border-width: 6px;
          }
          .ng-hero-copy {
            width: 69%;
            padding: 18px 13px 52px;
          }
          .ng-section-label {
            font-size: 11px;
            margin-bottom: 24px;
          }
          .ng-section-label span {
            display: none;
          }
          .ng-small-jp {
            font-size: 8px;
            letter-spacing: 0.06em;
          }
          .ng-hero-message {
            gap: 5px;
          }
          .ng-hero-message p {
            font-size: 20px;
            letter-spacing: 0;
          }
          .ng-message-index {
            font-size: 20px;
          }
          .ng-hero-description {
            max-width: 165px;
            font-size: 10px;
          }
          .ng-clear-chip {
            font-size: 8px;
            padding: 6px;
            gap: 5px;
          }
          .ng-character-panel {
            width: 27%;
            right: 3%;
            top: 70px;
          }
          .ng-hero-art {
            left: -6px;
            width: 105px;
            height: 300px;
            background-size: auto 300px;
          }
          .ng-character-name {
            bottom: -20px;
            right: -8px;
            padding: 7px;
            font-size: 12px;
          }
          .ng-character-name span {
            display: none;
          }
          .ng-character-number,
          .ng-hero-sticker {
            display: none;
          }
          .ng-hero-footer {
            font-size: 7px;
            padding-inline: 7px;
          }
          .ng-hero-footer a {
            font-size: 7px;
          }
          #theme-medium.medium-newgame .medium-masthead {
            padding-inline: 15px;
          }
          #theme-medium.medium-newgame .medium-post {
            padding: 20px 17px;
          }
          #theme-medium.medium-newgame .medium-article-header {
            padding: 19px;
          }
          #theme-medium.medium-newgame #notion-article {
            padding: 20px 14px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ng-unlock-opening {
            background: #9770b7;
            animation: none;
          }
          .ng-unlock-opening > div {
            transform: none;
          }
          #theme-medium.medium-newgame *,
          #theme-medium.medium-newgame::before,
          #theme-medium.medium-newgame::after,
          .ng-character-card::before {
            animation: none !important;
            transition: none !important;
          }
        }
        @media print {
          .ng-character-card,
          .ng-edge-mark,
          .ng-unlock-opening,
          .ng-hero,
          .ng-theme-credit {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
