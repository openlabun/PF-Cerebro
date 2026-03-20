import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as robleAuthGuard from 'src/common/guards/roble-auth.guard';
import { TitlesService } from './tittles.service';
import { CreateTitleDto } from './dto/create-title.dto';
import { UpdateTitleDto } from './dto/update-title.dto';
import type { Title } from './interfaces/title.interface';

@ApiTags('personal-tracking/titles')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('personal-tracking/titles')
export class TitlesController {
  constructor(private readonly service: TitlesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los títulos' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getAll(@Req() req: robleAuthGuard.RobleRequest): Promise<Title[]> {
    const resp = await this.service.getAll(req.accessToken);
    return resp;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener título por id' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getById(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') id: string,
  ): Promise<Title | null> {
    const resp = await this.service.getById(req.accessToken, id);
    return resp;
  }

  @Post()
  @ApiOperation({ summary: 'Crear título' })
  @ApiResponse({ status: 201, description: 'Creado' })
  async create(
    @Req() req: robleAuthGuard.RobleRequest,
    @Body() dto: CreateTitleDto,
  ): Promise<Title> {
    const payload: Omit<Title, '_id'> = {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      rareza: dto.rareza,
    };

    const resp = await this.service.create(req.accessToken, payload);
    return resp;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar título' })
  @ApiResponse({ status: 200, description: 'Actualizado' })
  async update(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTitleDto,
  ): Promise<Title> {
    const updates: Partial<Omit<Title, '_id'>> = {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      rareza: dto.rareza,
    };

    // limpiar undefined
    Object.keys(updates).forEach((k) => {
      const key = k as keyof typeof updates;
      if (updates[key] === undefined) delete updates[key];
    });

    const resp = await this.service.update(req.accessToken, id, updates);
    return resp;
  }
}
