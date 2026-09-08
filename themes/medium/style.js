import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'

// Keep the reading system scoped to Medium; other themes and Notion data stay independent.
const Style = () => (
  <style jsx global>{`
    ${themeConsoleStyle('medium', CONFIG)}

    body:has(#theme-medium) { --medium-page-paper: #faf9f6; background: var(--medium-page-paper); }
    .dark body:has(#theme-medium) { --medium-page-paper: #1c201e; }
    body:has(#theme-medium) #canvasRibbon { display: none; }
    #theme-medium {
      --paper: var(--medium-page-paper);
      --ink: #292e2b;
      --muted: #727871;
      --line: #e0e3dc;
      --accent: #376b5c;
      --wash: #f0f2ec;
      position: relative;
      z-index: 1;
      min-height: 100vh;
      background: var(--paper);
      color: var(--ink);
      font-family: 'Noto Sans SC', 'Noto Sans CJK SC', sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .dark #theme-medium {
      --ink: #e1e5dc;
      --muted: #a0aaa2;
      --line: #39423b;
      --accent: #a3c9b3;
      --wash: #262e28;
    }
    #theme-medium *, #theme-medium *::before, #theme-medium *::after { box-sizing: border-box; }
    #theme-medium :is(a, button) { -webkit-tap-highlight-color: transparent; }
    #theme-medium :is(a, button):focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 5px;
      border-radius: 2px;
    }
    #theme-medium a { text-underline-offset: .22em; }
    #theme-medium :is(a, button) { transition: color 150ms, background-color 150ms; }
    #theme-medium :is(a, button):hover { color: var(--accent); }
    #theme-medium ::selection { background: #dce8d7; color: #203b2e; }
    #theme-medium .medium-skip-link {
      position: fixed; left: 20px; top: -100px; z-index: 100;
      padding: 12px 20px; background: var(--paper); border: 1px solid var(--accent);
    }
    #theme-medium .medium-skip-link:focus { top: 12px; }

    /* Masthead and navigation */
    #theme-medium .medium-nav { position: relative; z-index: 40; background: var(--paper); }
    #theme-medium .medium-nav-inner {
      max-width: 1040px; margin: 0 auto; min-height: 88px; padding: 0 40px;
      display: flex; align-items: center; gap: 24px; border-bottom: 1px solid var(--line);
    }
    #theme-medium #top-wrapper { width: auto; flex: 1; min-width: 0; }
    #theme-medium .logo {
      font-family: 'Noto Serif SC', serif; font-size: 20px; font-weight: 500;
      color: var(--ink); white-space: nowrap;
      border-left: 3px solid var(--accent); padding-left: 12px;
    }
    #theme-medium #medium-navigation > ul { display: flex; align-items: center; gap: 26px; }
    #theme-medium .medium-nav-item { position: relative; list-style: none; font-size: 13px; color: var(--muted); }
    #theme-medium .medium-nav-item > :is(a, button) { display: flex; align-items: center; gap: 8px; padding: 10px 0; white-space: nowrap; }
    #theme-medium .medium-nav-item.is-current > a { color: var(--accent); box-shadow: inset 0 -2px var(--accent); }
    #theme-medium .medium-nav-item i { font-size: 9px; }
    #theme-medium .medium-submenu {
      position: absolute; right: 0; top: 100%; min-width: 180px; padding: 8px;
      border: 1px solid var(--line); border-radius: 6px; background: var(--paper);
      box-shadow: 0 12px 30px #0000000a; z-index: 50;
    }
    #theme-medium .medium-submenu[hidden] { display: none; }
    #theme-medium .medium-submenu a { display: block; padding: 10px 12px; white-space: nowrap; }
    #theme-medium .medium-submenu a:hover { background: var(--wash); }
    #theme-medium .medium-theme-toggle, #theme-medium .medium-menu-toggle {
      display: grid; place-items: center; width: 36px; height: 40px; flex-shrink: 0;
      color: var(--muted);
    }
    #theme-medium .medium-menu-toggle { display: none; }

    /* A centered page, with the directory in the outer margin. */
    #theme-medium .medium-layout { position: relative; padding: 0 32px; }
    #theme-medium #container-inner {
      width: 100%; max-width: 960px; min-height: 65vh; margin: 0 auto;
      background: var(--paper);
      outline: none; padding: 0 0 48px;
    }
    #theme-medium.medium-reading #container-inner { max-width: 900px; }
    #theme-medium.medium-full-width #container-inner { max-width: 1440px; }
    #theme-medium .medium-desktop-toc {
      display: none; position: absolute; left: calc(50% + 488px); top: 78px;
      bottom: 48px; width: 206px;
    }
    #theme-medium .medium-desktop-toc > .medium-catalog { position: sticky; top: 36px; }

    #theme-medium .medium-intro-stage {
      position: relative;
      overflow: clip;
      transition: height 440ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    #theme-medium .medium-intro-content {
      display: flow-root;
    }
    #theme-medium .medium-intro-content.is-entering {
      animation: medium-intro-enter 320ms ease both;
    }
    #theme-medium .medium-intro-content.is-leaving {
      animation: medium-intro-leave 160ms ease both;
      pointer-events: none;
    }
    #theme-medium
      .medium-intro-stage.is-playing
      .medium-intro-content.is-entering {
      animation: medium-game-opening 460ms steps(1, end) both;
    }
    #theme-medium .medium-masthead.is-preparing .medium-portrait-orbit {
      animation: medium-orbit-loading 1.2s linear infinite;
    }
    #theme-medium .medium-masthead.is-preparing .medium-portrait-frame {
      box-shadow: 0 0 52px color-mix(in srgb, var(--accent) 26%, transparent);
      transform: scale(1.04);
    }
    #theme-medium .medium-game-load-error {
      font-size: 11px;
      color: var(--muted);
      margin-top: 12px;
    }
    @keyframes medium-orbit-loading {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    /* A single aperture cut and scan sweep, without repeated flashes. */
    #theme-medium .medium-intro-stage.is-booting .medium-intro-content {
      animation: medium-game-cut 180ms steps(1, end) both;
    }
    #theme-medium .medium-intro-stage.is-booting::after {
      content: '';
      pointer-events: none;
      position: absolute;
      z-index: 3;
      inset: 0;
      background: linear-gradient(
        transparent 48%,
        var(--accent) 49%,
        var(--accent) 50%,
        transparent 51%
      );
      animation: medium-signal-cut 180ms ease-out both;
    }
    #theme-medium .medium-intro-stage.is-playing .medium-inline-game::after {
      content: '';
      pointer-events: none;
      position: absolute;
      z-index: 2;
      left: 0;
      right: 0;
      top: 0;
      height: 32px;
      background: linear-gradient(transparent, #b6d5b025, #b6d5b070);
      animation: medium-scan-sweep 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes medium-game-cut {
      0% {
        clip-path: inset(0);
      }
      35% {
        transform: translateX(-7px);
        clip-path: polygon(
          0 0,
          100% 0,
          100% 35%,
          12% 35%,
          12% 38%,
          100% 38%,
          100% 100%,
          0 100%
        );
      }
      70% {
        transform: translateX(4px);
        clip-path: inset(45% 0 43% 0);
      }
      100% {
        transform: none;
        clip-path: inset(50% 0);
      }
    }
    @keyframes medium-signal-cut {
      from {
        transform: scaleX(0.1);
      }
      to {
        transform: scaleX(1.4);
      }
    }
    @keyframes medium-game-opening {
      0% {
        clip-path: inset(49% 0);
        transform: translateX(-4px);
      }
      18% {
        clip-path: inset(24% 0);
        transform: translateX(3px);
      }
      35% {
        clip-path: inset(4% 0);
        transform: none;
      }
      55%,
      100% {
        clip-path: inset(0);
        transform: none;
      }
    }
    @keyframes medium-scan-sweep {
      0% {
        transform: translateY(0);
        opacity: 0.8;
      }
      90% {
        opacity: 0.5;
      }
      100% {
        transform: translateY(570px);
        opacity: 0;
      }
    }
    #theme-medium .medium-inline-game {
      padding-top: 24px;
    }
    #theme-medium .medium-game-return {
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 4px 0;
      font-size: 11px;
      cursor: pointer;
    }
    #theme-medium .medium-game-loading {
      min-height: 280px;
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 13px;
    }
    @keyframes medium-intro-enter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes medium-intro-leave {
      to {
        opacity: 0;
        transform: translateY(-8px);
      }
    }
    /* A personal card on the home page; article layouts keep their quiet typography. */
    #theme-medium .medium-masthead {
      position: relative; isolation: isolate; display: flex; align-items: center;
      justify-content: space-between; gap: 28px; padding: 36px 0; margin: 20px 0 24px;

    }
    #theme-medium .medium-intro-copy { min-width: 0; flex: 1 1 220px; }
    #theme-medium .medium-eyebrow { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; letter-spacing: .06em; margin-bottom: 16px; }
    #theme-medium .medium-intro-mark { color: var(--accent); font-size: 23px; line-height: 1; transition: transform 600ms ease; }
    #theme-medium .medium-masthead:hover .medium-intro-mark { transform: rotate(90deg); }
    #theme-medium .medium-masthead h1 {
      font-family: 'Noto Serif SC', serif; font-size: clamp(32px, 4vw, 48px);
      font-weight: 500; line-height: 1.35; letter-spacing: -.035em; overflow-wrap: anywhere;
    }
    #theme-medium .medium-bio { margin-top: 14px; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }
    #theme-medium .medium-author-link { color: inherit; }
    #theme-medium .medium-portrait { position: relative; flex: 0 0 184px; width: 184px; height: 184px; display: grid; place-items: center; }
    #theme-medium .medium-portrait-orbit { pointer-events: none; position: absolute; inset: 5px; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 50%; transform: rotate(-25deg); transition: transform 700ms ease; }
    #theme-medium .medium-portrait-orbit::before { content: ''; position: absolute; inset: 13px -10px; border: 1px dashed color-mix(in srgb, var(--accent) 25%, transparent); border-radius: 50%; transform: rotate(55deg); }
    #theme-medium .medium-portrait-orbit::after { content: ''; position: absolute; top: 20px; right: 20px; width: 8px; height: 8px; background: var(--accent); border: 2px solid var(--paper); border-radius: 50%; }
    #theme-medium .medium-masthead:hover .medium-portrait-orbit { transform: rotate(0deg); }
    #theme-medium .medium-portrait-frame { position: relative; z-index: 1; padding: 7px; border: 1px solid var(--line); border-radius: 50%; background: var(--paper); box-shadow: 0 0 44px color-mix(in srgb, var(--accent) 14%, transparent); transition: transform 300ms ease, box-shadow 300ms ease; cursor: pointer; }
    /* Returning from the game restores keyboard focus; keep the avatar circular. */
    #theme-medium .medium-portrait-frame:is(:hover, :focus-visible) { border-radius: 50%; transform: scale(1.06); box-shadow: 0 0 48px color-mix(in srgb, var(--accent) 24%, transparent); }
    #theme-medium .medium-mobile-avatar { display: none; }
    @media (max-width: 768px), (hover: none), (pointer: coarse) {
      #theme-medium .medium-portrait-trigger { display: none; }
      #theme-medium .medium-mobile-avatar { display: block; cursor: default; }
      #theme-medium .medium-mobile-avatar:hover { transform: none; }
    }
    #theme-medium .medium-avatar { pointer-events: none; display: block; width: 112px; height: 112px; object-fit: cover; border-radius: 50%; }
    #theme-medium .medium-avatar-monogram { display: grid; place-items: center; width: 112px; height: 112px; font-family: 'Noto Serif SC', serif; font-size: 56px; color: var(--accent); }
    #theme-medium .medium-topics { display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; padding: 18px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 12px; color: var(--muted); }
    #theme-medium .medium-topics-label { font-size: 14px; font-weight: 500; color: var(--ink); margin-right: 8px; }
    #theme-medium .medium-post { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; padding: 30px 0; border-bottom: 1px solid var(--line); align-items: center; }
    #theme-medium .medium-post-with-cover { grid-template-columns: minmax(0, 1fr) 180px; }
    #theme-medium .medium-post-copy { min-width: 0; }
    #theme-medium .medium-post-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
    #theme-medium .medium-post-meta a { color: var(--accent); }
    #theme-medium .medium-post h2 { font-size: 23px; line-height: 1.55; font-weight: 500; letter-spacing: -.025em; margin: 8px 0 9px; overflow-wrap: anywhere; }
    #theme-medium .medium-post h2 a:hover { text-decoration: underline; text-decoration-thickness: 1px; }
    #theme-medium .medium-post-summary { font-size: 14px; line-height: 1.9; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    #theme-medium .medium-post-tags { display: flex; flex-wrap: wrap; gap: 14px; color: var(--muted); font-size: 11px; margin-top: 13px; }
    #theme-medium .medium-post-tags a::before { content: '#'; margin-right: 3px; opacity: .55; }
    #theme-medium .medium-post-cover { width: 180px; aspect-ratio: 3 / 2; overflow: hidden; border-radius: 4px; background: var(--wash); }
    #theme-medium .medium-post-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }

    /* Text-first covers use existing metadata; a Notion image always takes priority. */
    #theme-medium .medium-text-cover {
      --cover-paper: #e9eee2; --cover-ink: #334d3f; --cover-accent: #78936c;
      position: relative; isolation: isolate; display: flex; flex-direction: column;
      width: 100%; height: 100%; padding: 12px 14px; gap: 6px;
      overflow: hidden; background: var(--cover-paper); color: var(--cover-ink);
      border: 1px solid color-mix(in srgb, var(--cover-accent) 28%, transparent);
      border-radius: inherit; text-align: left;
    }
    #theme-medium .medium-text-cover-tone-1 { --cover-paper: #f1e8dc; --cover-ink: #60452f; --cover-accent: #b08c5f; }
    #theme-medium .medium-text-cover-tone-2 { --cover-paper: #ece8f2; --cover-ink: #514460; --cover-accent: #9b88b0; }
    #theme-medium .medium-text-cover::after {
      content: ''; position: absolute; z-index: -1; width: 90px; height: 90px;
      right: -48px; bottom: -46px; border: 14px solid var(--cover-accent);
      border-radius: 50%; opacity: .16;
    }
    #theme-medium .medium-text-cover-category {
      display: block; max-width: 100%; align-self: flex-start; padding-left: 6px;
      border-left: 2px solid var(--cover-accent); font-size: 9px; line-height: 1.2;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #theme-medium .medium-text-cover-title {
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      overflow: hidden; overflow-wrap: anywhere; margin: auto 0;
      font-size: 16px; font-weight: 700; line-height: 1.35; letter-spacing: -.03em;
    }
    #theme-medium .medium-text-cover-summary {
      display: block; flex-shrink: 0; overflow: hidden; white-space: nowrap;
      text-overflow: ellipsis; font-size: 8px; line-height: 1.4; opacity: .8;
    }
    .dark #theme-medium .medium-text-cover { --cover-paper: #29392f; --cover-ink: #dce7d5; --cover-accent: #9bb38d; }
    .dark #theme-medium .medium-text-cover-tone-1 { --cover-paper: #3c3329; --cover-ink: #eaddca; --cover-accent: #c4a679; }
    .dark #theme-medium .medium-text-cover-tone-2 { --cover-paper: #36303f; --cover-ink: #e3dcec; --cover-accent: #b7a2ca; }

    /* Authorship disclosure stays visible before opening or reading an article. */
    #theme-medium .medium-writing-label { position: relative; display: inline-flex; flex-shrink: 0; align-self: baseline; line-height: 1.6; vertical-align: middle; }
    #theme-medium .medium-writing-badge {
      position: relative; display: inline-flex; align-items: center; width: fit-content;
      padding: 2px 7px; border: 1px solid #cfddd4; border-radius: 4px;
      background: #edf3ee; color: #456452; font-size: 11px; font-weight: 400;
      font-family: inherit; line-height: 1.6; white-space: nowrap; cursor: pointer;
      user-select: none; -webkit-touch-callout: none; touch-action: manipulation;
    }
    #theme-medium .medium-writing-badge::before { content: ''; position: absolute; inset: -6px -3px; }
    #theme-medium .medium-writing-badge.ai-generated { background: #f0edf5; border-color: #dcd4e7; color: #695777; }
    .dark #theme-medium .medium-writing-badge { background: #26392e; border-color: #435c4c; color: #b8cfbf; }
    .dark #theme-medium .medium-writing-badge.ai-generated { background: #332d3d; border-color: #55475f; color: #cdbfdb; }
    #theme-medium .medium-writing-tooltip {
      position: absolute; z-index: 60; padding: 8px 12px;
      border: 1px solid var(--line); border-radius: 5px;
      background: var(--paper); color: var(--ink); box-shadow: 0 4px 16px #00000012;
      font-family: 'Noto Sans SC', sans-serif; font-size: 12px; font-weight: 400;
      line-height: 1.7; letter-spacing: normal; text-align: left; white-space: normal;
    }

    /* Article typography; wide blocks get space without stretching every paragraph. */
    #theme-medium .medium-article-header { max-width: 740px; margin: 0 auto; padding: 48px 0 30px; }
    #theme-medium .medium-back-link { display: inline-block; font-size: 12px; color: var(--muted); margin-bottom: 26px; }
    #theme-medium .medium-article-heading { display: flex; align-items: baseline; gap: 12px; }
    #theme-medium .medium-article-heading h1 { min-width: 0; }
    #theme-medium .medium-article-header h1 { font-family: 'Noto Serif SC', serif; font-size: clamp(27px, 3vw, 38px); font-weight: 500; line-height: 1.55; letter-spacing: -.025em; overflow-wrap: anywhere; }
    #theme-medium .medium-article-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 22px; padding-bottom: 26px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted); }
    #theme-medium .medium-article-dates { display: flex; gap: 14px; min-width: 0; }
    #theme-medium .medium-article-stats { white-space: nowrap; font-variant-numeric: tabular-nums; }
    #theme-medium #article-wrapper { width: 100%; min-width: 0; }
    #theme-medium .medium-ai-summary {
      max-width: 740px; margin: 0 auto 28px; overflow: hidden;
      background: var(--wash); border: 1px solid var(--line); border-radius: 12px;
    }
    #theme-medium .medium-ai-summary-toggle {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      width: 100%; padding: 13px 18px; border: 0; background: transparent;
      color: var(--ink); font: inherit; text-align: left; cursor: pointer;
    }
    #theme-medium .medium-ai-summary-toggle:focus-visible { outline-offset: -4px; border-radius: 12px; }
    #theme-medium .medium-ai-summary-title { font-size: 13px; font-weight: 500; color: var(--accent); }
    #theme-medium .medium-ai-summary-action { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); }
    #theme-medium .medium-ai-summary-toggle[aria-expanded='true'] svg { transform: rotate(180deg); }
    #theme-medium .medium-ai-summary-content { padding: 0 18px 17px; }
    #theme-medium .medium-ai-summary-content[hidden] { display: none; }
    #theme-medium .medium-ai-summary-content p {
      margin: 0; color: var(--ink); font-size: 14px; line-height: 1.9;
      white-space: pre-line; overflow-wrap: anywhere;
    }
    #theme-medium #notion-article { width: 100%; max-width: 740px; min-width: 0; margin-inline: auto; overflow-x: visible; }
    #theme-medium #article-wrapper .notion { font-size: 18px; font-weight: 400; line-height: 1.85; color: var(--ink); }
    #theme-medium #article-wrapper .notion-page-content-inner { width: 100%; min-width: 0; }
    #theme-medium #article-wrapper :is(.notion-page, .notion-page-content-inner) > :not(.notion-viewport) { max-width: 100%; min-width: 0; margin-left: auto !important; margin-right: auto !important; }
    #theme-medium #article-wrapper :is(.notion-page, .notion-page-content-inner) > :is(.notion-code, .notion-code-container, .collapse-wrapper, .notion-collection, .notion-simple-table, .notion-simple-table-wrapper, .notion-asset-wrapper, .notion-row) { max-width: 100%; }
    #theme-medium #article-wrapper .notion-text { line-height: 1.85; margin-top: .4em !important; margin-bottom: .8em !important; }
    #theme-medium #article-wrapper .notion-h { line-height: 1.5; margin-top: 1.8em; margin-bottom: .55em; font-weight: 500; }
    #theme-medium #article-wrapper .notion-h-title { line-height: inherit; }
    #theme-medium #article-wrapper .notion-h1 { font-size: 1.5em; }
    #theme-medium #article-wrapper .notion-h2 { font-size: 1.28em; }
    #theme-medium #article-wrapper .notion-h3 { font-size: 1.1em; }
    #theme-medium #article-wrapper .notion-header-anchor { top: -32px; scroll-margin-top: 32px; }
    #theme-medium #article-wrapper .notion-list { line-height: 1.85; }
    #theme-medium #article-wrapper .notion-quote { line-height: 1.85; border-left: 2px solid var(--accent); color: var(--muted); margin-top: 1em; margin-bottom: 1em; }
    #theme-medium #article-wrapper .notion-callout { border: 1px solid var(--line); border-radius: 4px; padding: 16px 20px; margin-top: 1em; margin-bottom: 1em; }
    #theme-medium #article-wrapper .notion-callout-text .notion-text { margin: 0 !important; }
    #theme-medium #article-wrapper .notion-code { font-size: 14px; line-height: 1.75; max-width: 100%; overscroll-behavior-x: contain; }
    #theme-medium #article-wrapper .notion-simple-table-wrapper { width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
    #theme-medium #article-wrapper .notion-collection { min-width: 0; width: 100%; }
    #theme-medium #article-wrapper :is(.notion-table, .notion-table-view, .notion-board) { max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
    #theme-medium #article-wrapper :is(.notion-page, .notion-page-content-inner, .notion-row, .notion-column, .notion-callout-text, .notion-toggle) { min-width: 0; max-width: 100%; }
    #theme-medium #article-wrapper .notion-asset-wrapper { min-width: 0; max-width: 100%; margin-top: 1.5em; margin-bottom: 1.5em; }
    #theme-medium #article-wrapper .notion-asset-wrapper > div { max-width: 100%; min-width: 0; }
    #theme-medium #article-wrapper .notion-asset-wrapper :is(img:not(.medium-zoom-image--opened), video, iframe) { max-width: 100%; }
    #theme-medium #article-wrapper .notion-bookmark { max-width: 100%; min-width: 0; }
    #theme-medium #article-wrapper .notion-bookmark > div { min-width: 0; }
    #theme-medium #article-wrapper .notion-bookmark-link { max-width: 100%; }
    #theme-medium #article-wrapper .notion-bookmark-link-icon { flex: 0 0 16px; width: 16px; height: 16px; margin-right: 6px; }
    #theme-medium #article-wrapper .notion-bookmark-image { flex: 0 0 25%; }
    #theme-medium.medium-full-width #notion-article { max-width: 100%; }
    #theme-medium #article-wrapper .notion-asset-caption { font-size: 12px; line-height: 1.7; color: var(--muted); margin-top: 10px; }
    #theme-medium #article-wrapper .notion-bookmark { border: 1px solid var(--line); border-radius: 4px; }
    #theme-medium.medium-full-width #article-wrapper :is(.notion-page, .notion-page-content-inner) > :not(.notion-viewport) { max-width: 100%; }
    #theme-medium .medium-article-end { max-width: 740px; margin: 52px auto 0; border-top: 1px solid var(--line); padding-top: 24px; }
    #theme-medium .medium-article-around { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 30px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 24px 0; margin: 28px 0; }
    #theme-medium .medium-article-around a { display: flex; flex-direction: column; gap: 8px; }
    #theme-medium .medium-article-around a > span { font-size: 11px; color: var(--muted); }
    #theme-medium .medium-article-around .medium-writing-label { margin-top: 8px; }
    #theme-medium .medium-article-around strong { font-size: 14px; font-weight: 500; line-height: 1.8; }
    #theme-medium .medium-next-article { grid-column: 2; text-align: right; }

    /* Motion is limited to deliberate interaction and navigation. */
    #theme-medium .medium-route-content { animation: medium-page-enter 360ms cubic-bezier(.2,.7,.2,1) both; }
    #theme-medium .medium-route-progress { position: fixed; inset: 0 0 auto; height: 2px; z-index: 100; pointer-events: none; overflow: hidden; }
    #theme-medium .medium-route-progress::after { content: ''; display: block; width: 100%; height: 100%; background: var(--accent); transform-origin: left; animation: medium-route-progress 8s cubic-bezier(.1,.8,.1,1) both; }
    #theme-medium :is(.medium-post h2 a, .medium-back-link, .medium-topics a, .medium-author-link, .notion-link) { background-image: linear-gradient(var(--accent), var(--accent)); background-position: 0 100%; background-size: 0% 1px; background-repeat: no-repeat; transition: background-size 240ms ease, color 180ms ease; box-decoration-break: clone; }
    #theme-medium :is(.medium-post h2 a, .medium-back-link, .medium-topics a, .medium-author-link, .notion-link):is(:hover, :focus-visible) { background-size: 100% 1px; text-decoration: none; }
    #theme-medium :is(.notion-bookmark, .medium-article-around a, .medium-toc-toggle) { transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease; }
    #theme-medium :is(.notion-bookmark, .medium-article-around a, .medium-toc-toggle):active { border-color: var(--accent); }
    #theme-medium .medium-post-cover img { transition: transform 420ms cubic-bezier(.2,.7,.2,1); }
    #theme-medium .medium-theme-toggle i { transition: transform 300ms ease; }
    #theme-medium .medium-theme-toggle:hover i { transform: rotate(-18deg); }
    #theme-medium :is(.medium-submenu:not([hidden]), .medium-toc-panel) { animation: medium-page-enter 180ms ease-out both; }
    @media (hover: hover) {
      #theme-medium .notion-bookmark:hover { border-color: var(--accent); box-shadow: 0 5px 16px #00000009; }
      #theme-medium .medium-post-cover:hover img { transform: scale(1.035); }
    }
    @keyframes medium-page-enter { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes medium-route-progress { from { transform: scaleX(.08); } to { transform: scaleX(.9); } }

    /* Directory and small-screen controls. */
    #theme-medium .medium-catalog { font-size: 12px; color: var(--muted); }
    #theme-medium .medium-catalog-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; font-size: 11px; }
    #theme-medium .medium-catalog-heading > span { letter-spacing: .08em; color: var(--ink); }
    #theme-medium .medium-catalog-heading button { padding: 6px 0; font-size: 10px; }
    #theme-medium .medium-catalog nav { max-height: calc(100dvh - 180px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
    #theme-medium .medium-catalog ol { margin: 0; padding: 0; list-style: none; }
    #theme-medium .medium-catalog li { margin: 0; }
    #theme-medium .medium-catalog a { display: block; padding: 7px 0; border-left: 1px solid var(--line); line-height: 1.65; overflow-wrap: anywhere; }
    #theme-medium .medium-catalog a[aria-current] { color: var(--accent); border-left: 2px solid var(--accent); font-weight: 500; }
    #theme-medium .medium-mobile-toc { position: fixed; bottom: calc(24px + env(safe-area-inset-bottom)); right: 24px; z-index: 45; }
    #theme-medium .medium-toc-toggle { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 18px; background: var(--paper); border: 1px solid var(--line); border-radius: 24px; font-size: 12px; box-shadow: 0 3px 12px #00000008; }
    #theme-medium .medium-toc-panel { position: absolute; right: 0; bottom: 56px; width: min(330px, calc(100vw - 48px)); padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); box-shadow: 0 10px 40px #00000010; }
    #theme-medium .medium-toc-panel nav { max-height: min(55dvh, 440px); }
    #theme-medium .medium-mobile-top { position: fixed; bottom: calc(24px + env(safe-area-inset-bottom)); left: 24px; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 50%; background: var(--paper); color: var(--muted); z-index: 30; font-size: 12px; }
    #theme-medium .medium-desktop-top { display: none; right: 36px; bottom: 32px; margin: 0; color: var(--muted); background: var(--paper); border-color: var(--line); }

    #theme-medium .medium-footer { max-width: 960px; margin: 0 auto; padding: 26px 0 100px; border-top: 1px solid var(--line); color: var(--muted); background: var(--paper); font-size: 12px; }
    #theme-medium .medium-footer-main { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    #theme-medium .medium-footer-main > div { font-size: 16px; color: var(--muted); }
    #theme-medium .medium-footer-note { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 10px; margin-top: 16px; }

    @media (min-width: 1440px) {
      #theme-medium .medium-desktop-toc { display: block; }
      #theme-medium .medium-mobile-toc, #theme-medium .medium-mobile-top { display: none; }
      #theme-medium .medium-desktop-top { display: flex; }
      #theme-medium.medium-full-width .medium-mobile-toc { display: block; }
    }
    @media (max-width: 1024px) {
      #theme-medium .medium-footer { margin-left: 32px; margin-right: 32px; }
    }
    @media (max-width: 767px) {
      #theme-medium .medium-nav-inner { min-height: 68px; padding: 0 22px; gap: 8px; }
      #theme-medium .logo { font-size: 18px; }
      #theme-medium .medium-menu-toggle { display: grid; }
      #theme-medium #medium-navigation { display: none; position: absolute; top: 68px; left: 0; right: 0; padding: 16px 24px; background: var(--paper); border-bottom: 1px solid var(--line); box-shadow: 0 12px 20px #00000006; }
      #theme-medium #medium-navigation.is-open { display: block; }
      #theme-medium #medium-navigation > ul { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
      #theme-medium .medium-nav-item > :is(a, button) { min-height: 44px; width: 100%; }
      #theme-medium .medium-nav-item.is-current > a { box-shadow: none; }
      #theme-medium .medium-submenu { position: static; box-shadow: none; margin-bottom: 10px; }
      #theme-medium .medium-layout { padding: 0 22px; }
      #theme-medium .medium-masthead { padding: 20px 0; margin: 20px 0; gap: 16px; }
      #theme-medium .medium-portrait { margin: 6px auto 0; flex-basis: 136px; width: 136px; height: 136px; }
      #theme-medium .medium-masthead { flex-wrap: wrap; }
      #theme-medium .medium-portrait-frame { padding: 5px; border-radius: 50%; }
      #theme-medium .medium-avatar-monogram { width: 72px; height: 72px; font-size: 38px; }
      #theme-medium .medium-eyebrow { font-size: 10px; gap: 5px; }
      #theme-medium .medium-masthead h1 { font-size: 30px; }
      #theme-medium .medium-avatar { width: 72px; height: 72px; border-radius: 50%; }
      #theme-medium .medium-topics { gap: 12px 18px; }
      #theme-medium .medium-topics-label { width: 100%; }
      #theme-medium .medium-post { gap: 18px; padding: 24px 0; }
      #theme-medium .medium-post-with-cover { grid-template-columns: minmax(0, 1fr) 96px; }
      #theme-medium .medium-post h2 { font-size: 19px; }
      #theme-medium .medium-post-cover { width: 96px; aspect-ratio: 1; align-self: start; margin-top: 28px; }
      #theme-medium .medium-text-cover { padding: 9px; gap: 5px; }
      #theme-medium .medium-text-cover-category { font-size: 7px; padding-left: 4px; }
      #theme-medium .medium-text-cover-title { font-size: 11px; line-height: 1.45; }
      #theme-medium .medium-text-cover-summary { display: none; }
      #theme-medium .medium-post-summary { font-size: 13px; }
      #theme-medium .medium-post-meta { font-size: 10px; gap: 10px; }
      #theme-medium .medium-article-header { padding-top: 30px; padding-bottom: 16px; }
      #theme-medium .medium-back-link { margin-bottom: 22px; }
      #theme-medium .medium-article-meta { flex-wrap: wrap; gap: 7px; margin-top: 18px; padding-bottom: 22px; }
      #theme-medium .medium-article-dates { flex-wrap: wrap; gap: 8px 14px; }
      #theme-medium #article-wrapper .notion { font-size: 17px; }
      #theme-medium #article-wrapper .notion-code { font-size: 13px; }
      #theme-medium #article-wrapper .notion-callout { padding: 12px; }
      #theme-medium .medium-article-around { gap: 18px; }
      #theme-medium .medium-footer { margin-left: 22px; margin-right: 22px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #theme-medium *, #theme-medium *::before, #theme-medium *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
    }
    @media print {
      #theme-medium .medium-writing-tooltip { display: none; }
      #theme-medium .medium-nav, #theme-medium .medium-desktop-toc, #theme-medium .medium-mobile-toc, #theme-medium .medium-mobile-top, #theme-medium .medium-desktop-top, #theme-medium .medium-footer, #theme-medium .medium-article-end { display: none; }
      #theme-medium { --paper: white; --ink: black; }
      #theme-medium #container-inner { max-width: none; box-shadow: none; }
      body:has(#theme-medium) #canvasRibbon { display: none; }
    }
  `}</style>
)

export { Style }
