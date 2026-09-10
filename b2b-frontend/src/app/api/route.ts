import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'node:fs';
import { InferType, object, string } from 'yup';

import { prisma } from '@/lib/db';

interface IFormInput {
  name: string;
  type: string;
  data: string;
  site?: string;
}

const validationSchema = object({
  name: string()
    .required({
      ru: 'Обязательно',
      en: 'Field is required'
    })
    .min(3, {
      ru: 'Не меньше 3 символов',
      en: 'At least 3 characters'
    })
    .max(30, {
      ru: 'Не больше 30 символов',
      en: 'Not more than 30 characters'
    }),
  type: string().required().oneOf(['email', 'tg', 'wb', 'tel']),
  data: string()
    .required({
      ru: 'Обязательно',
      en: 'Field is required'
    })
    .when('type', (data, schema) => {
      if (data[0] === 'email') {
        return schema.email({
          ru: 'E-mail введен некорректно',
          en: 'Email entered incorrectly'
        });
      }
      if (data[0] === 'tel') {
        return schema.matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
          message: {
            ru: 'Телефон введен некорректно',
            en: 'Phone entered incorrectly'
          }
        });
      }
      return schema;
    }),
  // Ссылка на каталог. Её спрашивает форма нового лендинга («Показать на моих
  // товарах»): без каталога заявку нечем обработать — по ней мы собираем
  // примерку на вещах клиента. Поле НЕобязательное, чтобы старые формы,
  // которые шлют только имя и контакт, продолжали работать без изменений.
  site: string().max(500).url({
    ru: 'Похоже, это не ссылка',
    en: 'This does not look like a link'
  })
});

type TValidationSchema = InferType<typeof validationSchema>;

// Build axios config for reaching api.telegram.org. In restricted networks
// (RU servers) direct egress is blocked — route through an HTTP proxy when
// TG_PROXY_URL is set (format: http://user:pass@host:port).
function buildTelegramAxiosConfig() {
  const proxyUrl = process.env.TG_PROXY_URL;
  const config: Record<string, unknown> = { timeout: 10000 };
  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    // axios's built-in `proxy` handling is buggy for HTTPS targets — disable
    // it so the httpsAgent above is actually used.
    config.proxy = false;
  }
  return config;
}

// eslint-disable-next-line import/no-unused-modules
export async function POST(request: NextRequest) {
  try {
    const data: IFormInput = await request.json();
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');
    const referer = headersList.get('referer');

    const res: TValidationSchema = await validationSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    const date = Date.now();

    // 1) Persist into DB (primary source of truth for /admin/leads).
    const lead = await prisma.leadRequest.create({
      data: {
        name: res.name,
        contactType: res.type,
        contactValue: res.data,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        referer: referer ?? null,
        notes: res.site ? `Каталог: ${res.site}` : null,
        read: false
      }
    });

    // 2) Also keep a filesystem backup under data/forms/ — cheap insurance
    //    in case the DB file is lost/corrupted. Non-fatal if the write fails.
    try {
      writeFileSync(
        `data/forms/request-widget-demo-${date}-${(
          String(Math.random()) + String(Math.random())
        ).replace(/\./g, '')}.json`,
        JSON.stringify({ ...res, ip, date, lead_id: lead.id })
      );
    } catch (err) {
      console.warn('[form] filesystem backup failed:', err);
    }

    // 3) Fire-and-forget Telegram notification via the proxy.
    const botToken = process.env.TG_NOTIFICATION_BOT_ID;
    const chatId = process.env.TG_NOTIFICATION_CHAT_ID;
    if (botToken && chatId) {
      axios
        .post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            chat_id: chatId,
            text:
              `[prod:MML] Request for demo\nName: ${res.name}\n${res.type}: ${res.data}` +
              (res.site ? `\nКаталог: ${res.site}` : '')
          },
          buildTelegramAxiosConfig()
        )
        .then(() => console.log('[telegram] notification sent', { leadId: lead.id }))
        .catch((err) =>
          console.log('[telegram] send failed:', err?.message || err)
        );
    }

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    return NextResponse.json(error, { status: 400 });
  }
}
