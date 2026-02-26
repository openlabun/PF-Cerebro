import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from 'src/roble/roble.service';
import type { Title } from './interfaces/title.interface';

@Injectable()
export class TitlesService {
  private readonly tableName: string = 'Titulo';

  constructor(private readonly roble: RobleService) {}

  async getAll(accessToken: string): Promise<Title[]> {
    try {
      const resp = await this.roble.read<Title>(accessToken, this.tableName);
      return resp;
    } catch {
      throw new HttpException(
        'Error consultando títulos en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getById(accessToken: string, id: string): Promise<Title | null> {
    try {
      const rows = await this.roble.read<Title>(accessToken, this.tableName, {
        _id: id,
      });

      if (rows.length === 0) return null;
      return rows[0];
    } catch {
      throw new HttpException(
        'Error consultando título por id en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    accessToken: string,
    payload: Omit<Title, '_id'>,
  ): Promise<Title> {
    try {
      const resp = await this.roble.insert<Omit<Title, '_id'>>(
        accessToken,
        this.tableName,
        [payload],
      );

      if (!resp.inserted || resp.inserted.length === 0) {
        throw new HttpException(
          'ROBLE no devolvió el registro insertado',
          HttpStatus.BAD_REQUEST,
        );
      }

      const created = resp.inserted[0] as unknown as Title;
      return created;
    } catch {
      throw new HttpException(
        'Error creando título en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    accessToken: string,
    id: string,
    updates: Partial<Omit<Title, '_id'>>,
  ): Promise<Title> {
    try {
      const resp = await this.roble.update<Title>(
        accessToken,
        this.tableName,
        '_id',
        id,
        updates as Record<string, unknown>,
      );

      return resp;
    } catch {
      throw new HttpException(
        'Error actualizando título en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
