import { Injectable } from '@nestjs/common';
import { RobleService } from 'src/roble/roble.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { CreateResultadoDto } from './dto/create-resultado.dto';
import { EstadoTorneo } from './enums/estado-torneo.enum';
import { generarCodigoAcceso } from 'src/common/utils/codigo-acceso.util';
import { UpdateTorneoDto } from './dto/update-torneo.dto';

type TorneoRecord = {
  _id?: string;
  nombre: string;
  descripcion: string;
  creadorId: string;
  codigoAcceso: string | null;
  esPublico: boolean;
  estado: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  recurrencia: string | null;
  configuracion: Record<string, unknown> | null;
  fechaCreacion: string;
};

type ParticipanteRecord = {
  _id?: string;
  torneoId: string;
  usuarioId: string;
  fechaUnion: string;
};

type ResultadoRecord = {
  _id?: string;
  torneoId: string;
  usuarioId: string;
  puntaje: number;
  tiempo: number;
  fechaRegistro: string;
};

@Injectable()
export class TorneosService {
  private readonly TABLE_TORNEOS = 'Torneos';
  private readonly TABLE_PARTICIPANTES = 'Participantes';
  private readonly TABLE_RESULTADOS = 'ResultadosTorneo';

  constructor(private readonly roble: RobleService) {}

  private toEstadoTorneo(value: string): EstadoTorneo | null {
    // Si el string coincide con algún valor del enum, lo devolvemos como enum
    if ((Object.values(EstadoTorneo) as string[]).includes(value)) {
      return value as EstadoTorneo;
    }
    return null;
  }
  private calcularEstadoAutomatico(torneo: TorneoRecord): EstadoTorneo | null {
    const estado = this.toEstadoTorneo(torneo.estado);

    // Si no coincide con el enum (estado raro), no tocamos nada
    if (!estado) return null;

    // Estados que NO deben ser sobre-escritos por fechas
    if (estado === EstadoTorneo.CANCELADO) return null;
    if (estado === EstadoTorneo.PAUSADO) return null;
    if (estado === EstadoTorneo.BORRADOR) return null;

    const inicio = new Date(torneo.fechaInicio);
    const fin = new Date(torneo.fechaFin);
    const ahora = new Date();

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return null;
    }

    if (ahora > fin) return EstadoTorneo.FINALIZADO;
    if (ahora >= inicio && ahora <= fin) return EstadoTorneo.ACTIVO;

    return EstadoTorneo.PROGRAMADO;
  }

  private async syncEstadoPorFecha(
    accessToken: string,
    torneo: TorneoRecord,
  ): Promise<TorneoRecord> {
    const nuevoEstado = this.calcularEstadoAutomatico(torneo);
    if (!nuevoEstado) return torneo;

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (estadoActual === nuevoEstado) return torneo;

    if (!torneo._id) return torneo;

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      {
        estado: nuevoEstado,
      },
    );

    return actualizado;
  }

  async obtenerTorneoDetalle(
    accessToken: string,
    torneoId: string,
  ): Promise<TorneoRecord> {
    const torneo = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneo) {
      throw new Error('Torneo no existe');
    }

    const sincronizado = await this.syncEstadoPorFecha(accessToken, torneo);
    return sincronizado;
  }

  async actualizarEstadoTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    nuevoEstado: EstadoTorneo,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) throw new Error('Torneo no existe');

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    // Solo el creador puede cambiar el estado del torneo
    if (torneo.creadorId !== usuarioId) {
      throw new Error('Solo el creador puede cambiar el estado del torneo.');
    }

    // No permitimos cambios de estado si el torneo ya está FINALIZADO o CANCELADO
    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) throw new Error('Estado actual inválido en torneo.');

    if (
      estadoActual === EstadoTorneo.FINALIZADO ||
      estadoActual === EstadoTorneo.CANCELADO
    ) {
      throw new Error(
        'No se puede cambiar el estado de un torneo FINALIZADO o CANCELADO.',
      );
    }

    // Validación de transiciones permitidas
    const allowed: Record<EstadoTorneo, EstadoTorneo[]> = {
      [EstadoTorneo.BORRADOR]: [
        EstadoTorneo.PROGRAMADO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.PROGRAMADO]: [
        EstadoTorneo.ACTIVO,
        EstadoTorneo.PAUSADO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.ACTIVO]: [EstadoTorneo.PAUSADO, EstadoTorneo.CANCELADO],
      [EstadoTorneo.PAUSADO]: [
        EstadoTorneo.PROGRAMADO,
        EstadoTorneo.ACTIVO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.FINALIZADO]: [],
      [EstadoTorneo.CANCELADO]: [],
    };

    const permitidos = allowed[estadoActual] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw new Error(`Transición inválida: ${estadoActual} -> ${nuevoEstado}`);
    }

    // Guardamos
    if (!torneo._id)
      throw new Error('Torneo sin _id (no se puede actualizar).');

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      { estado: nuevoEstado },
    );
    console.log('UPDATE ROBLE RESP:', actualizado);
    return actualizado;
  }

  async editarTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    dto: UpdateTorneoDto,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) throw new Error('Torneo no existe');

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    // Solo el creador puede editar el torneo
    if (torneo.creadorId !== usuarioId) {
      throw new Error('Solo el creador puede editar el torneo.');
    }

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) throw new Error('Estado actual inválido en torneo.');

    // No se puede editar si el torneo ya está FINALIZADO o CANCELADO
    if (
      estadoActual === EstadoTorneo.FINALIZADO ||
      estadoActual === EstadoTorneo.CANCELADO
    ) {
      throw new Error('No se puede editar un torneo FINALIZADO o CANCELADO.');
    }

    // Se bloquean cambios de fechas y tipo si el torneo ya está ACTIVO
    if (estadoActual === EstadoTorneo.ACTIVO) {
      throw new Error('No se puede editar un torneo ACTIVO (MVP).');
    }

    // Aqui armamos el objeto de updates dinámicamente para no sobre-escribir campos no enviados
    const updates: Record<string, unknown> = {};

    if (dto.nombre !== undefined) updates.nombre = dto.nombre;
    if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion;
    if (dto.tipo !== undefined) updates.tipo = dto.tipo;

    if (dto.fechaInicio !== undefined) updates.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) updates.fechaFin = dto.fechaFin;

    if (dto.recurrencia !== undefined) updates.recurrencia = dto.recurrencia;

    if (dto.configuracion !== undefined)
      updates.configuracion = dto.configuracion;

    // Aqui le damos manejo especial al campo esPublico y codigoAcceso,
    // porque están relacionados entre sí
    if (dto.esPublico !== undefined) {
      updates.esPublico = dto.esPublico;

      // Si el torneo se cambia a privado,
      // necesitamos asignarle un código de acceso
      if (dto.esPublico === false) {
        const codigoExistente = torneo.codigoAcceso;
        const codigo = codigoExistente ?? generarCodigoAcceso(6);
        updates.codigoAcceso = codigo;
      }

      // Si pasa a público, removemos código, como roble no acepta null,
      // entonces lo dejamos como está
    }

    if (!torneo._id) {
      throw new Error('Torneo sin _id (no se puede actualizar).');
    }

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      updates,
    );

    // re sincronizamos el estado por fecha, por si acaso el cambio de fechas hizo
    // que el estado tenga que cambiar
    const sincronizado = await this.syncEstadoPorFecha(
      accessToken,
      actualizado,
    );
    return sincronizado;
  }

  async cancelarTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) throw new Error('Torneo no existe');

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    // Solo el creador puede cancelar el torneo
    if (torneo.creadorId !== usuarioId) {
      throw new Error('Solo el creador puede cancelar el torneo.');
    }

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) throw new Error('Estado actual inválido en torneo.');

    // Si ya está cancelado, lo devolvemos tal cual
    if (estadoActual === EstadoTorneo.CANCELADO) {
      return torneo;
    }

    // No se puede cancelar si ya finalizó
    if (estadoActual === EstadoTorneo.FINALIZADO) {
      throw new Error('No se puede cancelar un torneo FINALIZADO.');
    }

    if (!torneo._id) {
      throw new Error('Torneo sin _id (no se puede actualizar).');
    }

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      { estado: EstadoTorneo.CANCELADO },
    );

    return actualizado;
  }

  async listarTorneos(accessToken: string): Promise<TorneoRecord[]> {
    const torneos = await this.roble.read<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
    );

    const sincronizados = await Promise.all(
      torneos.map(async (t) => {
        try {
          return await this.syncEstadoPorFecha(accessToken, t);
        } catch {
          return t;
        }
      }),
    );

    return sincronizados;
  }

  // Aqui crearíamos un nuevo torneo, insertando un nuevo registro en la tabla "Torneos" de ROBLE
  async crearTorneo(
    accessToken: string,
    creadorId: string,
    dto: CreateTorneoDto,
  ): Promise<TorneoRecord> {
    const esPublico = dto.esPublico;
    const codigoAcceso = esPublico ? undefined : generarCodigoAcceso(6);
    const torneo: TorneoRecord = {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      creadorId,
      codigoAcceso: dto.codigoAcceso ?? null,
      esPublico: dto.esPublico,
      estado: EstadoTorneo.BORRADOR,
      tipo: dto.tipo,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      recurrencia: dto.recurrencia ?? 'NINGUNA',
      configuracion: dto.configuracion ?? {},
      fechaCreacion: new Date().toISOString(),
    };

    if (!esPublico && codigoAcceso) {
      torneo.codigoAcceso = codigoAcceso;
    }

    const result = await this.roble.insert<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      [torneo],
    );

    const inserted = result.inserted[0];
    if (!inserted) {
      const reason =
        result.skipped?.[0]?.reason ?? 'Sin razón reportada por ROBLE';
      throw new Error(
        `No se pudo insertar el resultado por este motivo: ${reason}`,
      );
    }
    return inserted;
  }

  // Aqui obetenemos la información de un torneo específico
  async obtenerTorneoPorId(
    accessToken: string,
    torneoId: string,
  ): Promise<TorneoRecord | null> {
    const rows = await this.roble.read<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      { _id: torneoId },
    );
    return rows[0] ?? null;
  }

  // Aqui actualizamos la información de un torneo específico
  async usuarioYaInscrito(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
  ): Promise<boolean> {
    const rows = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { torneoId, usuarioId },
    );
    return rows.length > 0;
  }

  // Aqui unimos a un usuario a un torneo específico
  async unirseATorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    codigoAcceso?: string,
  ): Promise<ParticipanteRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) throw new Error('Este torneo no existe');

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estado = this.toEstadoTorneo(torneo.estado);
    if (
      estado === EstadoTorneo.FINALIZADO ||
      estado === EstadoTorneo.CANCELADO
    ) {
      throw new Error('No se puede unir a un torneo FINALIZADO o CANCELADO.');
    }

    // Evitamos duplicado de inscripción
    const ya = await this.usuarioYaInscrito(accessToken, torneoId, usuarioId);
    if (ya) throw new Error('El usuario ya está inscrito en este torneo');

    // Validamos el código de acceso si el torneo es privado
    if (torneo.esPublico === false) {
      if (!codigoAcceso)
        throw new Error(
          'Este torneo es privado y requiere un código de acceso valido',
        );
      if (!torneo.codigoAcceso || codigoAcceso !== torneo.codigoAcceso) {
        throw new Error('Código de acceso inválido');
      }
    }

    const participante: ParticipanteRecord = {
      torneoId,
      usuarioId,
      fechaUnion: new Date().toISOString(),
    };

    const result = await this.roble.insert<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      [participante],
    );

    const inserted = result.inserted[0];
    if (!inserted) {
      const reason =
        result.skipped?.[0]?.reason ?? 'Sin razón reportada por ROBLE';
      throw new Error(
        `No se pudo insertar el participante por este motivo: ${reason}`,
      );
    }

    return inserted;
  }

  // Aqui listamos los participantes de un torneo específico
  async listarParticipantes(
    accessToken: string,
    torneoId: string,
  ): Promise<ParticipanteRecord[]> {
    return this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { torneoId },
    );
  }

  // Aqui registramos el resultado de un participante en un torneo
  async registrarResultado(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    dto: CreateResultadoDto,
  ): Promise<ResultadoRecord> {
    // Verificamos que el usuario esté inscrito en el torneo
    const participantes = await this.roble.read<ParticipanteRecord>(
      accessToken,
      'Participantes',
      {
        torneoId,
        usuarioId,
      },
    );

    if (!participantes.length) {
      throw new Error('El usuario no está inscrito en este torneo.');
    }

    // Verificamos que el torneo esté ACTIVO
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) throw new Error('Torneo no existe');

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estado = this.toEstadoTorneo(torneo.estado);
    if (estado !== EstadoTorneo.ACTIVO) {
      throw new Error('Solo se pueden registrar resultados en torneos ACTIVO.');
    }

    // Buscamos el resultado existente
    const existentes = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { torneoId, usuarioId },
    );

    const nuevoResultado: ResultadoRecord = {
      torneoId,
      usuarioId,
      puntaje: dto.puntaje,
      tiempo: dto.tiempo,
      fechaRegistro: new Date().toISOString(),
    };

    // Si no existe lo instertamos insertar
    if (!existentes.length) {
      const result = await this.roble.insert<ResultadoRecord>(
        accessToken,
        this.TABLE_RESULTADOS,
        [nuevoResultado],
      );

      return result.inserted[0];
    }

    // Si existe verifiacamo si es mejor
    const actual = existentes[0];

    const esMejor =
      dto.puntaje > actual.puntaje ||
      (dto.puntaje === actual.puntaje && dto.tiempo < actual.tiempo);

    if (!esMejor) {
      return actual;
    }

    // Actaulizamos el resultado existente con el nuevo resultado
    if (!actual._id) {
      throw new Error(
        'El resultado existente no trae id (no se puede actualizar).',
      );
    }

    const actualizado = await this.roble.update<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      '_id',
      actual._id,
      {
        puntaje: nuevoResultado.puntaje,
        tiempo: nuevoResultado.tiempo,
        fechaRegistro: nuevoResultado.fechaRegistro,
      },
    );

    return actualizado;
  }

  // Aqui obtenemos el ranking del torneo, ordenado
  // por puntaje (desc), tiempo (asc) y fechaRegistro (asc)
  async obtenerRanking(
    accessToken: string,
    torneoId: string,
  ): Promise<ResultadoRecord[]> {
    const resultados = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { torneoId },
    );

    return resultados.sort((a, b) => {
      if (b.puntaje !== a.puntaje) {
        return b.puntaje - a.puntaje;
      }
      if (a.tiempo !== b.tiempo) {
        return a.tiempo - b.tiempo;
      }
      return (
        new Date(a.fechaRegistro).getTime() -
        new Date(b.fechaRegistro).getTime()
      );
    });
  }

  async obtenerResultadosPorUsuario(
    accessToken: string,
    usuarioId: string,
  ): Promise<ResultadoRecord[]> {
    return this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      {
        usuarioId,
      },
    );
  }
}
