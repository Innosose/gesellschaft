/**
 * todo.ts — zod 스키마 검증 로직 단위 테스트
 */
import { z } from 'zod'

// todo.ts 내부 스키마와 동일
const TodoAddSchema = z.object({
  text:     z.string().min(1).max(1000),
  done:     z.boolean(),
  priority: z.enum(['high', 'normal']),
  dueDate:  z.string().optional(),
})

const TodoUpdateSchema = z.object({
  id:       z.string().min(1),
  text:     z.string().min(1).max(1000),
  priority: z.enum(['high', 'normal']),
  dueDate:  z.string().optional(),
})

describe('TodoAddSchema', () => {
  it('유효한 todo 추가 데이터 통과', () => {
    const result = TodoAddSchema.safeParse({
      text: '프로젝트 보고서 작성',
      done: false,
      priority: 'high',
    })
    expect(result.success).toBe(true)
  })

  it('dueDate 없어도 통과', () => {
    const result = TodoAddSchema.safeParse({ text: 'hello', done: false, priority: 'normal' })
    expect(result.success).toBe(true)
  })

  it('빈 text 거부', () => {
    const result = TodoAddSchema.safeParse({ text: '', done: false, priority: 'normal' })
    expect(result.success).toBe(false)
  })

  it('1000자 초과 text 거부', () => {
    const result = TodoAddSchema.safeParse({ text: 'a'.repeat(1001), done: false, priority: 'normal' })
    expect(result.success).toBe(false)
  })

  it('잘못된 priority 거부', () => {
    const result = TodoAddSchema.safeParse({ text: 'hello', done: false, priority: 'urgent' })
    expect(result.success).toBe(false)
  })

  it('boolean이 아닌 done 거부', () => {
    const result = TodoAddSchema.safeParse({ text: 'hello', done: 'no', priority: 'normal' })
    expect(result.success).toBe(false)
  })
})

describe('TodoUpdateSchema', () => {
  it('유효한 업데이트 데이터 통과', () => {
    const result = TodoUpdateSchema.safeParse({
      id: '1234567890',
      text: '업데이트된 텍스트',
      priority: 'normal',
      dueDate: '2024-12-31',
    })
    expect(result.success).toBe(true)
  })

  it('빈 id 거부', () => {
    const result = TodoUpdateSchema.safeParse({ id: '', text: 'hello', priority: 'normal' })
    expect(result.success).toBe(false)
  })

  it('누락된 id 거부', () => {
    const result = TodoUpdateSchema.safeParse({ text: 'hello', priority: 'normal' })
    expect(result.success).toBe(false)
  })
})
