import SteamFillIcon from 'remixicon-react/SteamFillIcon'

// Accept Steam app links and the official embeddable store widget.
export const getSteamAppId = source => {
  if (typeof source !== 'string') return null
  try {
    const url = new URL(source)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'store.steampowered.com' ||
      url.port ||
      url.username ||
      url.password
    ) return null
    return url.pathname.match(/^\/(?:app|widget)\/([1-9]\d*)(?:\/.*)?$/)?.[1] || null
  } catch {
    return null
  }
}

const SteamGameCard = ({ appId, title }) => (
  <a
    className='notion-steam-card'
    href={`https://store.steampowered.com/app/${appId}/`}
    target='_blank'
    rel='noopener noreferrer'>
    <span className='notion-steam-card-art' aria-hidden='true'>
      <SteamFillIcon size={28} />
      <img
        src={`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`}
        alt=''
        width={460}
        height={215}
        loading='lazy'
        decoding='async'
        onError={event => { event.currentTarget.hidden = true }}
      />
    </span>
    <span className='notion-steam-card-info'>
      <span className='notion-steam-card-title'>{title || 'Steam'}</span>
      <span className='notion-steam-card-provider'>Steam ↗</span>
    </span>
  </a>
)

export default SteamGameCard
