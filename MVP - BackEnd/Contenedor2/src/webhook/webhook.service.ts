import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RobleService } from '../roble/roble.service';
import { firstValueFrom } from 'rxjs';

interface WebhookSuscripcionRecord {
  _id?: string;
  usuarioId: string;
  url: string;
  eventos: string;
  fechaCreacion: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly TABLE = 'WebhookSuscripciones';

  constructor(
    private readonly roble: RobleService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async subscribe(usuarioId: string, url: string, eventos: string[], token: string) {
    const result = await this.roble.insert<WebhookSuscripcionRecord>(
      token,
      this.TABLE,
      [
        {
          usuarioId,
          url,
          eventos: JSON.stringify(eventos),
          fechaCreacion: new Date().toISOString(),
        },
      ],
    );

    const inserted = result.inserted[0];
    if (!inserted) throw new Error('No se pudo crear la suscripción');

    return { _id: inserted._id, usuarioId, url, eventos };
  }

  async unsubscribe(id: string, usuarioId: string, token: string) {
    const subs = await this.roble.read<WebhookSuscripcionRecord>(token, this.TABLE, { _id: id });
    const sub = subs[0];

    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    if (sub.usuarioId !== usuarioId) throw new NotFoundException('Suscripción no encontrada');

    const dbBase = this.config.getOrThrow<string>('ROBLE_DB_BASE');
    const dbName = this.config.getOrThrow<string>('ROBLE_DBNAME');
    const url = `${dbBase}/${dbName}/delete`;

    await firstValueFrom(
      this.http.post(
        url,
        { tableName: this.TABLE, idColumn: '_id', idValue: id },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    return { deleted: true };
  }

  async getMisSuscripciones(usuarioId: string, token: string) {
    const all = await this.roble.read<WebhookSuscripcionRecord>(
      token,
      this.TABLE,
    );
    const subs = all.filter((s) => s.usuarioId === usuarioId);

    return subs.map((s) => ({
      ...s,
      eventos: JSON.parse(s.eventos) as string[],
    }));
  }

  async emit(
    evento: string,
    usuarioIds: string[],
    payload: object,
    token: string,
  ) {
    for (const usuarioId of usuarioIds) {
      try {
        const allSubs = await this.roble.read<WebhookSuscripcionRecord>(
          token,
          this.TABLE,
        );
        const subs = allSubs.filter((s) => s.usuarioId === usuarioId);

        for (const sub of subs) {
          const eventosArr: string[] = JSON.parse(sub.eventos);
          if (!eventosArr.includes(evento)) continue;

          firstValueFrom(this.http.post(sub.url, { evento, ...payload })).catch(
            (err) =>
              this.logger.warn(`Webhook failed → ${sub.url}: ${err.message}`),
          );
        }
      } catch (err) {
        this.logger.warn(
          `Error leyendo suscripciones de ${usuarioId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
