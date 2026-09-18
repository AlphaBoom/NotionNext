import { useEffect, useState } from 'react'
import {
  filterOperators,
  MAX_FILTERS,
  MAX_SORTS
} from '@/lib/notion/database/model'

function initialFilter(schema, property) {
  const field = schema[property]
  return {
    property,
    operator: filterOperators(field.type)[0][0],
    value: field.type === 'checkbox' ? true : ''
  }
}

export default function DatabaseControls({ query, schema, onChange, id }) {
  const [search, setSearch] = useState(query.search)
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState(query.filters)
  const [sorts, setSorts] = useState(query.sorts)
  const [error, setError] = useState('')
  const fields = Object.entries(schema)
  const filterable = fields.filter(
    ([, field]) => filterOperators(field.type).length
  )
  useEffect(() => {
    setSearch(query.search)
    setFilters(query.filters)
    setSorts(query.sorts)
    setError('')
  }, [query])
  const changeFilter = (index, patch) =>
    setFilters(items =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  const apply = event => {
    event.preventDefault()
    try {
      onChange({ ...query, search, filters, sorts })
      setError('')
      setOpen(false)
    } catch {
      setError('请填写有效的筛选条件。')
    }
  }
  return (
    <form onSubmit={apply} className='database-controls'>
      <div className='database-toolbar'>
        <label className='database-search'>
          <span className='sr-only'>搜索条目名称</span>
          <input
            type='search'
            value={search}
            maxLength={200}
            placeholder='搜索条目名称…'
            onChange={event => setSearch(event.target.value)}
          />
        </label>
        <button type='submit'>搜索</button>
        <button
          type='button'
          aria-expanded={open}
          aria-controls={`${id}-conditions`}
          onClick={() => setOpen(value => !value)}
        >
          筛选与排序
          {query.filters.length + query.sorts.length > 0
            ? ` (${query.filters.length + query.sorts.length})`
            : ''}
        </button>
        {(query.search ||
          query.filters.length > 0 ||
          query.sorts.length > 0) && (
          <button
            type='button'
            onClick={() =>
              onChange({
                viewId: query.viewId,
                search: '',
                filters: [],
                sorts: []
              })
            }
          >
            重置
          </button>
        )}
      </div>
      {open && (
        <div id={`${id}-conditions`} className='database-conditions'>
          <p className='database-hint'>
            在当前 Notion 视图的范围内筛选。排序留空时使用视图原有顺序。
          </p>
          {filters.map((filter, index) => {
            const field = schema[filter.property]
            const noValue = ['is_empty', 'is_not_empty'].includes(
              filter.operator
            )
            return (
              <div className='database-condition' key={index}>
                <select
                  aria-label={`筛选字段 ${index + 1}`}
                  value={filter.property}
                  onChange={e =>
                    changeFilter(index, initialFilter(schema, e.target.value))
                  }
                >
                  {filterable.map(([key, field]) => (
                    <option key={key} value={key}>
                      {field.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`筛选方式 ${index + 1}`}
                  value={filter.operator}
                  onChange={e =>
                    changeFilter(index, { operator: e.target.value })
                  }
                >
                  {filterOperators(field.type).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {!noValue &&
                  (field.options?.length ? (
                    <select
                      aria-label={`筛选值 ${index + 1}`}
                      value={filter.value}
                      onChange={e =>
                        changeFilter(index, { value: e.target.value })
                      }
                    >
                      <option value=''>选择值</option>
                      {field.options.map(option => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <select
                      aria-label={`筛选值 ${index + 1}`}
                      value={String(filter.value)}
                      onChange={e =>
                        changeFilter(index, {
                          value: e.target.value === 'true'
                        })
                      }
                    >
                      <option value='true'>已勾选</option>
                      <option value='false'>未勾选</option>
                    </select>
                  ) : (
                    <input
                      aria-label={`筛选值 ${index + 1}`}
                      value={filter.value}
                      type={
                        field.type === 'number'
                          ? 'number'
                          : [
                                'date',
                                'created_time',
                                'last_edited_time'
                              ].includes(field.type)
                            ? 'date'
                            : 'text'
                      }
                      step='any'
                      maxLength={500}
                      onChange={e =>
                        changeFilter(index, { value: e.target.value })
                      }
                    />
                  ))}
                <button
                  type='button'
                  aria-label={`删除筛选 ${index + 1}`}
                  onClick={() =>
                    setFilters(items => items.filter((_, i) => i !== index))
                  }
                >
                  删除
                </button>
              </div>
            )
          })}
          {filterable.length > 0 && filters.length < MAX_FILTERS && (
            <button
              type='button'
              onClick={() =>
                setFilters(items => [
                  ...items,
                  initialFilter(schema, filterable[0][0])
                ])
              }
            >
              ＋ 添加筛选
            </button>
          )}
          {sorts.map((sort, index) => (
            <div className='database-condition' key={index}>
              <select
                aria-label={`排序字段 ${index + 1}`}
                value={sort.property}
                onChange={e =>
                  setSorts(items =>
                    items.map((item, i) =>
                      i === index ? { ...item, property: e.target.value } : item
                    )
                  )
                }
              >
                {fields.map(([key, field]) => (
                  <option key={key} value={key}>
                    {field.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={`排序方向 ${index + 1}`}
                value={sort.direction}
                onChange={e =>
                  setSorts(items =>
                    items.map((item, i) =>
                      i === index
                        ? { ...item, direction: e.target.value }
                        : item
                    )
                  )
                }
              >
                <option value='ascending'>升序</option>
                <option value='descending'>降序</option>
              </select>
              <button
                type='button'
                aria-label={`删除排序 ${index + 1}`}
                onClick={() =>
                  setSorts(items => items.filter((_, i) => i !== index))
                }
              >
                删除
              </button>
            </div>
          ))}
          {sorts.length < MAX_SORTS && (
            <button
              type='button'
              onClick={() =>
                setSorts(items => [
                  ...items,
                  { property: fields[0][0], direction: 'ascending' }
                ])
              }
            >
              ＋ 添加排序
            </button>
          )}
          <button type='submit' className='database-apply'>
            应用
          </button>
        </div>
      )}
      {error && <p role='alert'>{error}</p>}
    </form>
  )
}
