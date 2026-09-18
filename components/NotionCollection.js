import { galleryVisibilityClassName } from '@/lib/notion/galleryVisibilityClassName'
import DatabaseBrowser from '@/components/database/DatabaseBrowser'
import { collectionIdFor, unwrapRecord } from '@/lib/notion/database/model'
import { Collection } from 'react-notion-x/build/third-party/collection'

export default function NotionCollection(props) {
  const { block, ctx } = props
  if (block?.type === 'page' && block.parent_table === 'collection') {
    return (
      <div className='notion-database-entry'>
        <Collection {...props} />
      </div>
    )
  }
  if (['collection_view', 'collection_view_page'].includes(block?.type)) {
    const collectionId = collectionIdFor(block, ctx?.recordMap)
    const collection = unwrapRecord(ctx?.recordMap?.collection?.[collectionId])
    if (collection?.schema && block.view_ids?.length) {
      return <DatabaseBrowser block={block} ctx={ctx} collection={collection} />
    }
  }
  const viewId = props.block?.view_ids?.[0]
  const collectionViewRecord = props.ctx?.recordMap?.collection_view?.[viewId]
  const collectionView = collectionViewRecord?.value || collectionViewRecord
  const className = galleryVisibilityClassName(collectionView)

  if (!className) return <Collection {...props} />

  return (
    <div className={className}>
      <Collection {...props} />
    </div>
  )
}
