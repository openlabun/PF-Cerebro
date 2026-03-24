import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const MATCH_STATUSES = ['WAITING', 'ACTIVE', 'FINISHED', 'FORFEIT'] as const;
const MATCH_MODES = ['standalone', 'torneo'] as const;

export class SyncPvpHistoryPlayerDto {
  @IsString()
  userId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  slot!: number;

  @IsString()
  result!: string;

  @Type(() => Number)
  @IsInt()
  finalScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  mistakes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  correctCells!: number;

  @IsBoolean()
  finished!: boolean;

  @IsOptional()
  @IsISO8601()
  finishedAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eloBefore?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eloAfter?: number | null;
}

export class SyncPvpHistoryDto {
  @IsString()
  externalMatchId!: string;

  @Type(() => Number)
  @IsInt()
  seed!: number;

  @IsString()
  difficultyKey!: string;

  @IsString()
  @IsIn(MATCH_MODES)
  mode!: (typeof MATCH_MODES)[number];

  @IsOptional()
  @IsString()
  torneoId?: string | null;

  @IsString()
  @IsIn(MATCH_STATUSES)
  status!: (typeof MATCH_STATUSES)[number];

  @IsOptional()
  @IsString()
  winnerUserId?: string | null;

  @IsISO8601()
  createdAt!: string;

  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;

  @IsOptional()
  @IsISO8601()
  finishedAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @IsOptional()
  @IsString()
  endedReason?: string | null;

  @IsOptional()
  @IsString()
  forfeitedByUserId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncPvpHistoryPlayerDto)
  players!: SyncPvpHistoryPlayerDto[];
}
