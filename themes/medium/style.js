import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'

// Keep the reading system scoped to Medium; other themes and Notion data stay independent.
const Style = () => (
  <style jsx global>{`
    ${themeConsoleStyle('medium', CONFIG)}

    body:has(#theme-medium) { background: #f1f0eb; }
    .dark body:has(#theme-medium) { background: #171b18; }
    body:has(#theme-medium) #canvasRibbon { display: none; }
    #theme-medium {
      --paper: #faf9f6;
      --ink: #292e2b;
      --muted: #727871;
      --line: #e0e3dc;
      --accent: #376b5c;
      --wash: #f0f2ec;
      position: relative;
      z-index: 1;
      min-height: 100vh;
      background: linear-gradient(90deg, transparent, var(--paper) 20%, var(--paper) 80%, transparent);
      color: var(--ink);
      font-family: 'Noto Sans SC', 'Noto Sans CJK SC', sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .dark #theme-medium {
      --paper: #1c201e;
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
      background: var(--paper); box-shadow: 0 0 0 24px var(--paper);
      outline: none; padding: 0 0 48px;
    }
    #theme-medium.medium-reading #container-inner { max-width: 900px; }
    #theme-medium.medium-full-width #container-inner { max-width: 1440px; }
    #theme-medium .medium-desktop-toc {
      display: none; position: absolute; left: calc(50% + 488px); top: 78px;
      bottom: 48px; width: 206px;
    }
    #theme-medium .medium-desktop-toc > .medium-catalog { position: sticky; top: 36px; }

    /* Home: a compact personal introduction, followed immediately by the writing. */
    #theme-medium .medium-masthead { display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 52px 0 42px; }
    #theme-medium .medium-eyebrow { color: var(--muted); font-size: 12px; letter-spacing: .06em; margin-bottom: 12px; }
    #theme-medium .medium-masthead h1 {
      font-family: 'Noto Serif SC', serif; font-size: clamp(32px, 4vw, 46px);
      font-weight: 500; line-height: 1.35; letter-spacing: -.035em;
    }
    #theme-medium .medium-bio { margin-top: 16px; color: var(--muted); font-size: 14px; }
    #theme-medium .medium-avatar { display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 50%; }
    #theme-medium .medium-topics { display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; padding: 18px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 12px; color: var(--muted); }
    #theme-medium .medium-topics-label { font-size: 14px; font-weight: 500; color: var(--ink); margin-right: 8px; }
    #theme-medium .medium-archive-link { margin-left: auto; }
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

    /* Article typography; wide blocks get space without stretching every paragraph. */
    #theme-medium .medium-article-header { max-width: 740px; margin: 0 auto; padding: 48px 0 30px; }
    #theme-medium .medium-back-link { display: inline-block; font-size: 12px; color: var(--muted); margin-bottom: 26px; }
    #theme-medium .medium-article-header h1 { font-family: 'Noto Serif SC', serif; font-size: clamp(27px, 3vw, 38px); font-weight: 500; line-height: 1.55; letter-spacing: -.025em; overflow-wrap: anywhere; }
    #theme-medium .medium-article-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 22px; padding-bottom: 26px; border-bottom: 1px solid var(--line); font-size: 11px; color: var(--muted); }
    #theme-medium .medium-article-dates { display: flex; gap: 14px; min-width: 0; }
    #theme-medium .medium-article-stats { white-space: nowrap; font-variant-numeric: tabular-nums; }
    #theme-medium #article-wrapper { width: 100%; min-width: 0; }
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
    #theme-medium .medium-article-around span { font-size: 11px; color: var(--muted); }
    #theme-medium .medium-article-around strong { font-size: 14px; font-weight: 500; line-height: 1.8; }
    #theme-medium .medium-next-article { grid-column: 2; text-align: right; }

    /* Motion is limited to deliberate interaction and navigation. */
    #theme-medium .medium-route-content { animation: medium-page-enter 360ms cubic-bezier(.2,.7,.2,1) both; }
    #theme-medium .medium-route-progress { position: fixed; inset: 0 0 auto; height: 2px; z-index: 100; pointer-events: none; overflow: hidden; }
    #theme-medium .medium-route-progress::after { content: ''; display: block; width: 100%; height: 100%; background: var(--accent); transform-origin: left; animation: medium-route-progress 8s cubic-bezier(.1,.8,.1,1) both; }
    #theme-medium :is(.medium-post h2 a, .medium-back-link, .medium-topics a, .notion-link) { background-image: linear-gradient(var(--accent), var(--accent)); background-position: 0 100%; background-size: 0% 1px; background-repeat: no-repeat; transition: background-size 240ms ease, color 180ms ease; box-decoration-break: clone; }
    #theme-medium :is(.medium-post h2 a, .medium-back-link, .medium-topics a, .notion-link):is(:hover, :focus-visible) { background-size: 100% 1px; text-decoration: none; }
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

    #theme-medium .medium-footer { max-width: 960px; margin: 0 auto; padding: 26px 0 100px; border-top: 1px solid var(--line); color: var(--muted); background: var(--paper); box-shadow: 0 0 0 24px var(--paper); font-size: 12px; }
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
      #theme-medium .medium-masthead { padding: 36px 0 28px; }
      #theme-medium .medium-avatar { width: 48px; height: 48px; }
      #theme-medium .medium-topics { gap: 12px 18px; }
      #theme-medium .medium-topics-label { width: 100%; }
      #theme-medium .medium-archive-link { margin-left: 0; }
      #theme-medium .medium-post { gap: 18px; padding: 24px 0; }
      #theme-medium .medium-post-with-cover { grid-template-columns: minmax(0, 1fr) 96px; }
      #theme-medium .medium-post h2 { font-size: 19px; }
      #theme-medium .medium-post-cover { width: 96px; aspect-ratio: 1; align-self: start; margin-top: 28px; }
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
      #theme-medium .medium-nav, #theme-medium .medium-desktop-toc, #theme-medium .medium-mobile-toc, #theme-medium .medium-mobile-top, #theme-medium .medium-desktop-top, #theme-medium .medium-footer, #theme-medium .medium-article-end { display: none; }
      #theme-medium { --paper: white; --ink: black; }
      #theme-medium #container-inner { max-width: none; box-shadow: none; }
      body:has(#theme-medium) #canvasRibbon { display: none; }
    }
  `}</style>
)

export { Style }
