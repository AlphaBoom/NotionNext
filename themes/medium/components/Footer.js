import { BeiAnGongAn } from '@/components/BeiAnGongAn'
import { siteConfig } from '@/lib/config'
import SocialButton from './SocialButton'

export default function Footer() {
  const year = new Date().getFullYear()
  const since = siteConfig('SINCE')
  return (
    <footer className='medium-footer'>
      <div className='medium-footer-main'>
        <span>© {Number(since) < year ? `${since}–${year}` : year} {siteConfig('AUTHOR')}</span>
        <SocialButton />
      </div>
      <div className='medium-footer-note'>
        <a href='https://github.com/notionnext-org/NotionNext' target='_blank' rel='noreferrer'>Powered by NotionNext</a>
        {siteConfig('BEI_AN') && <a href={siteConfig('BEI_AN_LINK')}>{siteConfig('BEI_AN')}</a>}
        <BeiAnGongAn />
        <span className='hidden busuanzi_container_site_pv'>阅读 <span className='busuanzi_value_site_pv' /></span>
        <span className='hidden busuanzi_container_site_uv'>访客 <span className='busuanzi_value_site_uv' /></span>
      </div>
    </footer>
  )
}
