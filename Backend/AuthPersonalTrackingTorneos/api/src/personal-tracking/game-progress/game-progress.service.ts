import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RobleService } from 'src/roble/roble.service';
import { UpsertSudokuProgressDto } from './dto/upsert-sudoku-progress.dto';
import type {
  SudokuActiveProgressRecord,
  SudokuProgressSnapshot,
} from './interfaces/sudoku-active-progress.interface';

@Injectable()
export class GameProgressService {
  private readonly logger = new Logger(GameProgressService.name);
  private readonly tableName = 'PartidaSudokuActiva';
  private readonly gameIdSudoku = 'uVsB-k2rjora';

  constructor(private readonly robleService: RobleService) {}

  private normalizeSessionId(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized || undefined;
  }

  private getRowTimestamp(row: SudokuActiveProgressRecord): number {
    const candidates = [
      row?.ultimaActividadEn,
      row?.ultimaActi,
      row?.actualizadoEn,
      row?.createdAt,
      row?.updatedAt,
      row?.lastActivityAt,
      row?.cerradoEn,
      row?.closedAt,
      row?.creadaEn,
      row?.creadoEn,
    ];

    for (const candidate of candidates) {
      const parsed = new Date(String(candidate || ''));
      const time = parsed.getTime();
      if (!Number.isNaN(time)) return time;
    }

    return 0;
  }

  private getSortedRows(
    rows: SudokuActiveProgressRecord[],
  ): SudokuActiveProgressRecord[] {
    return (Array.isArray(rows) ? rows : [])
      .sort((a, b) => {
        const left = this.getRowTimestamp(a);
        const right = this.getRowTimestamp(b);
        return right - left;
      });
  }

  private validateSnapshotShape(snapshot: SudokuProgressSnapshot): void {
    if (!Array.isArray(snapshot.board) || !Array.isArray(snapshot.puzzle)) {
      throw new HttpException(
        'El estado de la partida es invalido: board/puzzle requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private extractSkippedReason(
    inserted:
      | {
          skipped?: Array<{ reason?: unknown }>;
        }
      | undefined,
  ): string {
    return String(
      inserted?.skipped?.[0]?.reason || 'No se pudo guardar la partida activa.',
    );
  }

  private isInvalidColumnError(reason: string, columnName: string): boolean {
    const normalizedReason = String(reason || '').toLowerCase();
    return (
      normalizedReason.includes('columna') &&
      normalizedReason.includes('inval') &&
      normalizedReason.includes(columnName.toLowerCase())
    );
  }

  private async updateWithActivityFallback(
    accessToken: string,
    id: string,
    updates: Record<string, unknown>,
    now: string,
  ): Promise<void> {
    try {
      await this.robleService.update(
        accessToken,
        this.tableName,
        '_id',
        id,
        { ...updates, ultimaActividadEn: now },
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('ultimaactividaden')) {
        throw error;
      }
    }

    await this.robleService.update(
      accessToken,
      this.tableName,
      '_id',
      id,
      { ...updates, ultimaActi: now },
    );
  }

  private buildSnapshot(dto: UpsertSudokuProgressDto): SudokuProgressSnapshot {
    const snapshot: SudokuProgressSnapshot = {
      difficultyKey: String(dto.difficultyKey || '').trim(),
      difficultyLabel: String(dto.difficultyLabel || '').trim(),
      board: dto.board,
      puzzle: dto.puzzle,
      solution: dto.solution,
      notes: dto.notes,
      selectedCell: dto.selectedCell ?? null,
      noteMode: Boolean(dto.noteMode),
      highlightEnabled: Boolean(dto.highlightEnabled),
      paused: Boolean(dto.paused),
      completed: Boolean(dto.completed),
      seconds: Number(dto.seconds || 0),
      errorCount: Number(dto.errorCount || 0),
      hintsUsed: Number(dto.hintsUsed || 0),
      hintsRemaining: Number(dto.hintsRemaining || 0),
      hintLimit: Number(dto.hintLimit || 0),
      seed: dto.seed ?? null,
      seedId: dto.seedId ?? null,
      statusMessage: String(dto.statusMessage || ''),
    };

    this.validateSnapshotShape(snapshot);
    return snapshot;
  }

  async getActiveSudokuProgress(
    usuarioID: string,
    accessToken: string,
  ): Promise<SudokuActiveProgressRecord | null> {
    const rows = await this.robleService.read<SudokuActiveProgressRecord>(
      accessToken,
      this.tableName,
      { usuarioID, juegoId: this.gameIdSudoku },
    );

    const latest = this.getSortedRows(rows)[0] ?? null;
    if (!latest) return null;
    if (latest.estado !== 'activa') return null;
    return latest;
  }

  async upsertActiveSudokuProgress(
    usuarioID: string,
    dto: UpsertSudokuProgressDto,
    accessToken: string,
  ): Promise<SudokuActiveProgressRecord> {
    const now = new Date().toISOString();
    const snapshot = this.buildSnapshot(dto);
    const existing = await this.getActiveSudokuProgress(usuarioID, accessToken);

    if (existing?._id) {
      const updates: Partial<SudokuActiveProgressRecord> = {
        estado: 'activa',
        snapshot,
      };

      await this.updateWithActivityFallback(
        accessToken,
        existing._id,
        updates,
        now,
      );

      return {
        ...existing,
        ...updates,
        ultimaActividadEn: now,
      } as SudokuActiveProgressRecord;
    }

    const record: SudokuActiveProgressRecord = {
      usuarioID,
      juegoId: this.gameIdSudoku,
      estado: 'activa',
      snapshot,
      ultimaActividadEn: now,
      creadaEn: now,
      cerradoEn: now,
    };

    let inserted = await this.robleService.insert<SudokuActiveProgressRecord>(
      accessToken,
      this.tableName,
      [record],
    );

    let insertedRow = inserted?.inserted?.[0];
    if (!insertedRow) {
      const reason = this.extractSkippedReason(inserted);
      if (this.isInvalidColumnError(reason, 'ultimaActividadEn')) {
        inserted = await this.robleService.insert<SudokuActiveProgressRecord>(
          accessToken,
          this.tableName,
          [{ ...record, ultimaActividadEn: undefined, ultimaActi: now }],
        );
        insertedRow = inserted?.inserted?.[0];
      }
    }

    if (!insertedRow) {
      const reason = this.extractSkippedReason(inserted);
      this.logger.warn(`No se inserto partida activa de Sudoku: ${reason}`);
      throw new HttpException(reason, HttpStatus.BAD_REQUEST);
    }

    return insertedRow;
  }

  async closeActiveSudokuProgress(
    usuarioID: string,
    estado: 'completada' | 'descartada',
    accessToken: string,
  ): Promise<{ updated: boolean }> {
    const active = await this.getActiveSudokuProgress(usuarioID, accessToken);
    if (!active?._id) {
      return { updated: false };
    }

    const now = new Date().toISOString();
    await this.updateWithActivityFallback(
      accessToken,
      active._id,
      {
        estado,
        cerradoEn: now,
      },
      now,
    );

    return { updated: true };
  }
}
