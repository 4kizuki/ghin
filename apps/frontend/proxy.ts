import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const hostname = host?.replace(/:\d+$/, '') ?? '';

  if (!ALLOWED_HOSTS.has(hostname)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}
