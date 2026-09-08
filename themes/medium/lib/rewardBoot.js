import { REWARD_KEY } from './rewardState'

export const REWARD_BOOT_ATTRIBUTE = 'data-new-game-boot'
export const REWARD_BOOT_TIMEOUT = 8000

// Only the small boot shell is sent to everyone. Artwork and game code remain
// optional chunks; the saved theme is read before the browser paints the body.
export function rewardBootScript(configTheme) {
  const theme = JSON.stringify(configTheme).replace(/</g, '\\u003c')
  return `(function(){try{
    var theme=new URLSearchParams(location.search).get('theme')||${theme};
    if(typeof theme!=='string'||theme.split(',')[0].trim()!=='medium')return;
    var saved=JSON.parse(localStorage.getItem('${REWARD_KEY}'));
    if(!saved||saved.unlocked!==true||saved.enabled!==true)return;
    var root=document.documentElement;
    root.setAttribute('${REWARD_BOOT_ATTRIBUTE}','loading');
    setTimeout(function(){
      if(root.getAttribute('${REWARD_BOOT_ATTRIBUTE}')==='loading')
        root.setAttribute('${REWARD_BOOT_ATTRIBUTE}','expired');
    },${REWARD_BOOT_TIMEOUT});
  }catch(e){}})();`
}

export const rewardBootStyle = `
  html[data-new-game-boot="loading"],
  html[data-new-game-boot="loading"] body {
    background: #b9a9e7 !important;
  }
  html[data-new-game-boot="loading"] #__next {
    visibility: hidden !important;
  }
  html[data-new-game-boot="loading"] body::before {
    content: '';
    position: fixed;
    top: calc(50% - 18px);
    left: calc(50% - 18px);
    width: 36px;
    height: 36px;
    box-sizing: border-box;
    border: 3px solid #ffffff55;
    border-top-color: white;
    border-radius: 50%;
    animation: new-game-boot-spin .8s linear infinite;
    pointer-events: none;
  }
  @keyframes new-game-boot-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    html[data-new-game-boot="loading"] body::before { animation: none; }
  }
`
