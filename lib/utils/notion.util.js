
/**
 * Notion 数据格式清理工具
 * 旧版 block:{ value:{}}
 * 新版 block:{ spaceId:{ id:{ value:{} } } }
 * 强制解包成旧版
 * @param {*} blockMap 
 * @returns 
 */
export function adapterNotionBlockMap(blockMap) {
  if (!blockMap) return blockMap;

  const cleanedBlocks = {};
  const cleanedCollection = {};

  for (const [id, block] of Object.entries(blockMap.block || {})) {
    cleanedBlocks[id] = { value: unwrapValue(block) };
  }

  for (const [id, collection] of Object.entries(blockMap.collection || {})) {
    cleanedCollection[id] = { value: unwrapValue(collection) };
  }

  const result = {
    ...blockMap,
    block: cleanedBlocks,
    collection: cleanedCollection,
  };

  if (blockMap.signed_urls) {
    // These images already render through mapImgUrl's stable Notion proxy.
    // Keep expiring signatures out of serialized page data so a signature
    // refresh alone does not cause an ISR write. Do not mutate the source cache.
    result.signed_urls = Object.fromEntries(
      Object.entries(blockMap.signed_urls).filter(([id, url]) =>
        getStableImageSource(url, cleanedBlocks[id]?.value) === url
      )
    );
  }

  return result;
}

/** Recognize original Notion uploads, including images uploaded before attachment:. */
export function isNotionImageSource(source) {
  if (typeof source !== 'string') return false
  if (source.startsWith('attachment:')) return true
  try {
    const url = new URL(source)
    if (url.protocol !== 'https:') return false
    return (
      url.hostname === 'secure.notion-static.com' ||
      /^prod-files-secure\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(url.hostname) ||
      (/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(url.hostname) &&
        url.pathname.startsWith('/secure.notion-static.com/'))
    )
  } catch {
    return false
  }
}

/** Share the renderer's original-source fallback with page-data normalization. */
export function getStableImageSource(imageUrl, block) {
  const source = block?.properties?.source?.[0]?.[0]
  if (
    block?.type === 'image' &&
    isNotionImageSource(source) &&
    !/\.gif(?:$|[?#])/i.test(source) &&
    (
      /^https:\/\/file\.notion\.(?:com|so)\//.test(imageUrl) ||
      // react-notion-x may append spaceId before calling mapImageUrl.
      (typeof imageUrl === 'string' && imageUrl.startsWith(`${source}?`))
    )
  ) {
    return source
  }
  return imageUrl
}

export function normalizeNotionBlockType(type) {
  switch (type) {
    case 'heading_1':
      return 'header'
    case 'heading_2':
      return 'sub_header'
    case 'heading_3':
      return 'sub_sub_header'
    case 'heading_4':
    case 'header_4':
      return 'header_4'
    default:
      return type
  }
}


function unwrapValue(obj) {
  if (!obj) return obj

  // 新格式特征：外层有 role 或 spaceId，value 里才是真实 block（有 id 和 type）
  // { spaceId, value: { value: { id, type, ... }, role } }
  if (obj?.value?.value?.id && obj?.value?.role) {
    return obj.value.value
  }

  // 次新格式：{ value: { id, type, ... }, role }
  if (obj?.value?.id && obj?.role !== undefined) {
    return obj.value
  }

  // 旧格式：{ value: { id, type, ... } } 直接取 value
  if (obj?.value?.id) {
    return obj.value
  }

  // 兜底：原样返回
  return obj?.value ?? obj
}
