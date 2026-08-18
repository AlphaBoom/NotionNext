import CONFIG from '../config'
import { siteConfig } from '@/lib/config'

/**
 * 跳转到网页顶部
 * 当屏幕下滑500像素后会出现该控件
 * @param inline 是否作为底部菜单中的内联按钮显示
 * @param className 附加样式
 * @returns {JSX.Element}
 * @constructor
 */
const JumpToTopButton = ({ inline = false, className = '' }) => {
  if (!siteConfig('MEDIUM_WIDGET_TO_TOP', null, CONFIG)) {
    return <></>
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (inline) {
    return (
      <button
        type='button'
        aria-label='Scroll to top'
        className={className}
        onClick={scrollToTop}>
        <i className='fas fa-chevron-up' aria-hidden='true' />
      </button>
    )
  }

  return (
    <button
      type='button'
      aria-label='Scroll to top'
      id='jump-to-top'
      data-aos='fade-up'
      data-aos-duration='300'
      data-aos-once='false'
      data-aos-anchor-placement='top-center'
      className={`fixed xl:right-80 right-2 mr-10 bottom-24 z-20 w-9 h-9 items-center justify-center cursor-pointer rounded-full border bg-white dark:bg-hexo-black-gray ${className}`}
      onClick={scrollToTop}>
      <i className='fas fa-chevron-up' aria-hidden='true' />
    </button>
  )
}

export default JumpToTopButton
