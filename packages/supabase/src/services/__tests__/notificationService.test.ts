import { describe, it, expect, vi } from 'vitest'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  notificationService,
} from '../notificationService'

function createChainableBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'head']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return builder
}

function createMockClient(builderOrBuilders: any) {
  if (Array.isArray(builderOrBuilders)) {
    let callIndex = 0
    return {
      from: vi.fn().mockImplementation(() => {
        const builder = builderOrBuilders[callIndex] || createChainableBuilder()
        callIndex++
        return builder
      }),
    } as any
  }
  return { from: vi.fn().mockReturnValue(builderOrBuilders) } as any
}

describe('getNotifications', () => {
  it('should return notifications for a user', async () => {
    const mockNotifications = [
      { id: 'n1', user_id: 'u1', type: 'booking', title: 'New Booking', message: 'You have a new booking', is_read: false },
      { id: 'n2', user_id: 'u1', type: 'review', title: 'New Review', message: 'A review was posted', is_read: true },
    ]
    const builder = createChainableBuilder({ data: mockNotifications, error: null })
    const client = createMockClient(builder)

    const result = await getNotifications(client, 'u1')
    expect(result).toEqual(mockNotifications)
    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('should return empty array when no data', async () => {
    const builder = createChainableBuilder({ data: null, error: null })
    const client = createMockClient(builder)

    const result = await getNotifications(client, 'u1')
    expect(result).toEqual([])
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'DB error' } })
    const client = createMockClient(builder)

    await expect(getNotifications(client, 'u1')).rejects.toEqual({ message: 'DB error' })
  })

  it('should filter by unreadOnly when option is set', async () => {
    const builder = createChainableBuilder({ data: [], error: null })
    const client = createMockClient(builder)

    await getNotifications(client, 'u1', { unreadOnly: true })
    // eq should be called twice: once for user_id, once for is_read
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('should apply limit when option is set', async () => {
    const builder = createChainableBuilder({ data: [], error: null })
    const client = createMockClient(builder)

    await getNotifications(client, 'u1', { limit: 10 })
    expect(builder.limit).toHaveBeenCalledWith(10)
  })
})

describe('getUnreadCount', () => {
  it('should return unread count', async () => {
    const builder: any = {}
    const methods = ['select', 'eq']
    methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
    builder.then = (resolve: any) => Promise.resolve({ count: 5, error: null }).then(resolve)
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getUnreadCount(client, 'u1')
    expect(result).toBe(5)
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('should return 0 when count is null', async () => {
    const builder: any = {}
    const methods = ['select', 'eq']
    methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
    builder.then = (resolve: any) => Promise.resolve({ count: null, error: null }).then(resolve)
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getUnreadCount(client, 'u1')
    expect(result).toBe(0)
  })

  it('should throw on error', async () => {
    const builder: any = {}
    const methods = ['select', 'eq']
    methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
    builder.then = (resolve: any) => Promise.resolve({ count: null, error: { message: 'DB error' } }).then(resolve)
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    await expect(getUnreadCount(client, 'u1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('markAsRead', () => {
  it('should mark a notification as read', async () => {
    const mockUpdated = { id: 'n1', is_read: true, read_at: '2026-01-01T00:00:00Z' }
    const builder = createChainableBuilder({ data: mockUpdated, error: null })
    const client = createMockClient(builder)

    const result = await markAsRead(client, 'n1')
    expect(result).toEqual(mockUpdated)
    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ is_read: true }))
    expect(builder.eq).toHaveBeenCalledWith('id', 'n1')
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'Not found' } })
    const client = createMockClient(builder)

    await expect(markAsRead(client, 'bad-id')).rejects.toEqual({ message: 'Not found' })
  })
})

describe('markAllAsRead', () => {
  it('should mark all notifications as read for a user', async () => {
    const builder = createChainableBuilder({ error: null })
    const client = createMockClient(builder)

    await markAllAsRead(client, 'u1')
    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ is_read: true }))
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ error: { message: 'DB error' } })
    const client = createMockClient(builder)

    await expect(markAllAsRead(client, 'u1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('createNotification', () => {
  it('should create a new notification', async () => {
    const mockNotification = { id: 'n-new', user_id: 'u1', type: 'booking', title: 'New', message: 'Msg', is_read: false }
    const builder = createChainableBuilder({ data: mockNotification, error: null })
    const client = createMockClient(builder)

    const input = { user_id: 'u1', type: 'booking', title: 'New', message: 'Msg' }
    const result = await createNotification(client, input as any)

    expect(result).toEqual(mockNotification)
    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(builder.insert).toHaveBeenCalledWith(input)
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'Insert error' } })
    const client = createMockClient(builder)

    await expect(createNotification(client, {} as any)).rejects.toEqual({ message: 'Insert error' })
  })
})

describe('deleteNotification', () => {
  it('should delete a notification', async () => {
    const builder = createChainableBuilder({ error: null })
    const client = createMockClient(builder)

    await deleteNotification(client, 'n1')
    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'n1')
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ error: { message: 'Delete error' } })
    const client = createMockClient(builder)

    await expect(deleteNotification(client, 'n1')).rejects.toEqual({ message: 'Delete error' })
  })
})

describe('notificationService object', () => {
  it('should export all service methods', () => {
    expect(notificationService.getNotifications).toBe(getNotifications)
    expect(notificationService.getUnreadCount).toBe(getUnreadCount)
    expect(notificationService.markAsRead).toBe(markAsRead)
    expect(notificationService.markAllAsRead).toBe(markAllAsRead)
    expect(notificationService.createNotification).toBe(createNotification)
    expect(notificationService.deleteNotification).toBe(deleteNotification)
  })
})
