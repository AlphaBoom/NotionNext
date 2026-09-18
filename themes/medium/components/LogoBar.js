import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'

export default function LogoBar(props) {
  return (
    <div id='top-wrapper' className='w-full flex items-center '>
      <SmartLink href='/' className='logo text-md md:text-xl dark:text-gray-200' analytics={{ event: 'navigation_click', placement: 'logo' }}>
        {siteConfig('TITLE')}
      </SmartLink>
    </div>
  )
}
