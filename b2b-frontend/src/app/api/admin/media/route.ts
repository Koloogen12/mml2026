import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { MAX_BYTES, extensionFor, publicUrl, saveMedia, sniffMime } from '@/lib/media';

// Приёмник картинок редактора: обложки постов и иллюстрации внутри текста.
// Только для авторизованных — это запись на диск сервера.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Нужна авторизация' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Файл больше ${Math.round(MAX_BYTES / 1024 / 1024)} МБ` },
      { status: 413 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Тип берём из содержимого, а не из заголовка формы: заголовок подставляет
  // браузер, и подменить его тривиально. Заявленный тип нужен только чтобы
  // не разойтись с тем, что видит редактор.
  const sniffed = sniffMime(buf);
  const ext = sniffed ? extensionFor(sniffed) : null;
  if (!sniffed || !ext) {
    return NextResponse.json(
      { error: 'Такой формат не принимаем. Нужен JPEG, PNG, WebP, AVIF или GIF.' },
      { status: 415 }
    );
  }

  const name = await saveMedia(buf, ext);
  const url = publicUrl(name);

  // Запись в БД — чтобы у загруженных файлов был владелец и дата. Файл
  // адресуется хешем, поэтому повторная заливка того же снимка находит
  // существующую строку, а не плодит дубли.
  await prisma.blogMedia.upsert({
    where: { objectKey: name },
    update: {},
    create: {
      url,
      objectKey: name,
      mime: sniffed,
      sizeBytes: buf.length,
      uploadedBy: Number((session.user as { id?: string }).id) || null
    }
  });

  return NextResponse.json({ url, mime: sniffed, size: buf.length });
}
