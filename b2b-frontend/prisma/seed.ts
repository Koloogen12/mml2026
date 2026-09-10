// Seeds the local DB with:
//   1. A sample published blog post (so /ru/blog has something to render).
//   2. The initial admin user — credentials come from env vars:
//        ADMIN_EMAIL     — login email
//        ADMIN_PASSWORD  — plain-text password (hashed with bcrypt at seed time)
//        ADMIN_NAME      — optional display name
//      If those are missing the user step is skipped gracefully.
//
// Safe to run multiple times: all operations are upserts / existence checks.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSamplePost() {
  const existing = await prisma.blogPost.findUnique({
    where: { slug: 'kak-ai-primerochnaya-vliyaet-na-konversiyu' }
  });
  if (existing) {
    console.log('seed: sample post already exists, skipping');
    return;
  }

  await prisma.blogPost.create({
    data: {
      slug: 'kak-ai-primerochnaya-vliyaet-na-konversiyu',
      title: 'Как AI-примерочная влияет на конверсию fashion-ритейла',
      excerpt:
        'Разбираем, за счёт чего виртуальная примерка даёт +40% к конверсии ' +
        'в карточке товара и снижает возвраты на 25% — на данных пилотов ' +
        'с российскими магазинами одежды.',
      coverUrl: '/assets/images/og-ru.jpeg',
      contentHtml: `
        <h2>Почему примерочная важнее, чем кажется</h2>
        <p>Когда покупатель видит только фотомодель — ему сложно представить, как вещь сядет именно на него. Большая часть отказов происходит не из-за цены, а из-за неопределённости.</p>

        <h2>Что меняется с виртуальной примеркой</h2>
        <ul>
          <li>Клиент видит себя в вещи — без регистрации и приложения.</li>
          <li>Можно собрать полный образ: верх + низ + обувь + аксессуары.</li>
          <li>AI учитывает рост, вес и тип фигуры — и корректирует крой.</li>
        </ul>

        <h2>Цифры с наших пилотов</h2>
        <p>На пилотах с магазинами от 500 до 10 000 SKU мы стабильно видим:</p>
        <ul>
          <li><strong>+40%</strong> к конверсии карточки товара.</li>
          <li><strong>−25%</strong> возвратов по категориям верх/платья.</li>
          <li><strong>2–3×</strong> средний чек у пользователей, прошедших примерку.</li>
        </ul>

        <p>В следующих постах разберём тех. детали интеграции и сравнение с конкурентами.</p>
      `,
      status: 'published',
      publishedAt: new Date()
    }
  });

  console.log('seed: created sample blog post');
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();

  if (!email || !password) {
    console.log(
      'seed: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user.'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: name ?? undefined },
    create: {
      email,
      passwordHash,
      name: name ?? null,
      role: 'admin'
    }
  });

  console.log(`seed: admin user ready — id=${user.id} email=${user.email}`);
}

async function main() {
  await seedSamplePost();
  await seedAdminUser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
