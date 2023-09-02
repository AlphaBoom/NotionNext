import LayoutBase from './LayoutBase'

export const Layout404 = props => {
  return <LayoutBase {...props}>
    <div className='w-full h-96 py-80 flex flex-col justify-center items-center'>未找到页面，不过别灰心这可能是由于网络问题导致
    <div>
        您可以尝试直接访问本站的
        <a href='https://alphaboom.notion.site/alphaboom/32c16f6bb85e4e949eba49dee2d73a5c?v=e7c99abff7b6444683b94893a4f838a1' target="_blank" className='text-blue-600 hover:underline underline-offset-4'>原始资源网点</a>
        来寻早原始内容
    </div>
    </div>
  </LayoutBase>
}
