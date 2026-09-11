import { NextResponse } from 'next/server';

import { mimeForFile, readMedia } from '@/lib/media';

// Отдача картинок, залитых через админку. Они лежат в томе /app/data/media,
// а не в public/, поэтому статикой Next их не увидит — нужен свой маршрут.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const buf = await readMedia(params.file);
  if (!buf) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(buf, {
    headers: {
      'Content-Type': mimeForFile(params.file) ?? 'application/octet-stream',
      'Content-Length': String(buf.length),
      // Имя файла — хеш его содержимого, поэтому по этому адресу никогда не
      // окажется другая картинка. Значит можно кэшировать навсегда.
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
