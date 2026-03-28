import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LiveHeartbeatDto {
  @IsString()
  @MaxLength(80)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  matchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tournamentId?: string;
}
