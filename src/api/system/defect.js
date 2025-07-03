import request from '@/utils/request.js'

// 查询缺陷记录列表
export function listDefect(query) {
  return request({
    url: '/system/defect/list',
    method: 'get',
    params: query
  })
}

// 查询缺陷记录详细
export function getDefect(id) {
  return request({
    url: '/system/defect/' + id,
    method: 'get'
  })
}

// 新增缺陷记录
export function addDefect(data) {
  return request({
    url: '/system/defect',
    method: 'post',
    data: data
  })
}

// 修改缺陷记录
export function updateDefect(data) {
  return request({
    url: '/system/defect',
    method: 'put',
    data: data
  })
}

// 删除缺陷记录
export function delDefect(id) {
  return request({
    url: '/system/defect/' + id,
    method: 'delete'
  })
}
