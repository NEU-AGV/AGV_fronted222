import request from '@/utils/request.js'

// 查询task列表
export function listTask(query) {
  return request({
    url: '/system/task/list',
    method: 'get',
    params: query
  })
}

// 查询task详细
export function getTask(id) {
  return request({
    url: '/system/task/' + id,
    method: 'get'
  })
}

// 新增task
export function addTask(data) {
  return request({
    url: '/system/task',
    method: 'post',
    data: data
  })
}

// 修改task
export function updateTask(data) {
  return request({
    url: '/system/task',
    method: 'put',
    data: data
  })
}

// 删除task
export function delTask(id) {
  return request({
    url: '/system/task/' + id,
    method: 'delete'
  })
}
