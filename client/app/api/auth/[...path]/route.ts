import { getAuth } from '@/lib/neon-auth/server'

type RouteContext = { params: Promise<{ path: string[] }> }

const handle = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  request: Request,
  context: RouteContext
) => getAuth().handler()[method](request, context)

export const GET = (request: Request, context: RouteContext) =>
  handle('GET', request, context)
export const POST = (request: Request, context: RouteContext) =>
  handle('POST', request, context)
export const PUT = (request: Request, context: RouteContext) =>
  handle('PUT', request, context)
export const DELETE = (request: Request, context: RouteContext) =>
  handle('DELETE', request, context)
export const PATCH = (request: Request, context: RouteContext) =>
  handle('PATCH', request, context)
