import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';
import { PersonalTrackingBootstrapService } from 'src/personal-tracking/bootstrap/personal-tracking-bootstrap.service';

describe('TorneosController', () => {
  let controller: TorneosController;
  let service: jest.Mocked<
    Pick<
      TorneosService,
      | 'listarTorneos'
      | 'crearTorneo'
      | 'obtenerTorneoDetalle'
      | 'listarTorneosPublicos'
      | 'obtenerTorneoDetallePublico'
      | 'unirseATorneo'
      | 'actualizarEstadoTorneo'
      | 'listarParticipantes'
      | 'obtenerRanking'
      | 'obtenerRankingPublico'
    >
  >;
  let bootstrapService: jest.Mocked<
    Pick<PersonalTrackingBootstrapService, 'ensureInitialized'>
  >;

  beforeEach(() => {
    service = {
      listarTorneos: jest.fn(),
      crearTorneo: jest.fn(),
      obtenerTorneoDetalle: jest.fn(),
      listarTorneosPublicos: jest.fn(),
      obtenerTorneoDetallePublico: jest.fn(),
      unirseATorneo: jest.fn(),
      actualizarEstadoTorneo: jest.fn(),
      listarParticipantes: jest.fn(),
      obtenerRanking: jest.fn(),
      obtenerRankingPublico: jest.fn(),
    };

    bootstrapService = {
      ensureInitialized: jest.fn(),
    };

    controller = new TorneosController(
      service as unknown as TorneosService,
      bootstrapService as unknown as PersonalTrackingBootstrapService,
    );
  });

  it('ensures profile bootstrap and delegates listing for authenticated users', async () => {
    service.listarTorneos.mockResolvedValue([{ _id: 'torneo-1' }] as never);

    const req = {
      accessToken: 'token-123',
      robleUser: {
        sub: 'user-1',
        role: 'player',
        name: 'Alice',
        email: 'alice@example.com',
      },
    } as never;

    const result = await controller.listar(req);

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-123',
      'user-1',
      'Alice',
      'alice@example.com',
    );
    expect(service.listarTorneos).toHaveBeenCalledWith(
      'token-123',
      'user-1',
      'player',
    );
    expect(result).toEqual([{ _id: 'torneo-1' }]);
  });

  it('falls back to email prefix when bootstrapping a user without display name', async () => {
    service.crearTorneo.mockResolvedValue({ _id: 'torneo-1' } as never);

    const req = {
      accessToken: 'token-xyz',
      robleUser: {
        sub: 'user-2',
        role: 'player',
        email: 'fallback@example.com',
      },
    } as never;
    const dto = {
      nombre: 'Serie oficial',
      descripcion: 'Torneo de prueba',
      esPublico: true,
      tipo: 'SERIE',
      fechaInicio: '2026-03-28T14:00:00.000Z',
      fechaFin: '2026-03-29T14:00:00.000Z',
      configuracion: {
        duracionMaximaMin: 20,
        dificultad: 'Intermedio',
        numeroTableros: 3,
      },
    };

    await controller.crear(req, dto);

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-xyz',
      'user-2',
      'fallback',
      'fallback@example.com',
    );
    expect(service.crearTorneo).toHaveBeenCalledWith('token-xyz', 'user-2', dto);
  });

  it('delegates public listing without bootstrap', async () => {
    service.listarTorneosPublicos.mockResolvedValue([{ _id: 'public-1' }] as never);

    const result = await controller.listarPublico();

    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
    expect(service.listarTorneosPublicos).toHaveBeenCalled();
    expect(result).toEqual([{ _id: 'public-1' }]);
  });

  it('delegates public detail without bootstrap', async () => {
    service.obtenerTorneoDetallePublico.mockResolvedValue({ _id: 'public-1' } as never);

    const result = await controller.obtenerPublico('public-1');

    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
    expect(service.obtenerTorneoDetallePublico).toHaveBeenCalledWith('public-1');
    expect(result).toEqual({ _id: 'public-1' });
  });

  it('delegates private join with bootstrap and access code', async () => {
    service.unirseATorneo.mockResolvedValue({ ok: true } as never);

    const req = {
      accessToken: 'token-join',
      robleUser: {
        sub: 'user-3',
        role: 'player',
        name: 'Bob',
        email: 'bob@example.com',
      },
    } as never;

    const result = await controller.unirse(req, 'torneo-9', {
      codigoAcceso: 'ABC123',
    });

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-join',
      'user-3',
      'Bob',
      'bob@example.com',
    );
    expect(service.unirseATorneo).toHaveBeenCalledWith(
      'token-join',
      'torneo-9',
      'user-3',
      'ABC123',
    );
    expect(result).toEqual({ ok: true });
  });

  it('delegates state transitions with the current user role', async () => {
    service.actualizarEstadoTorneo.mockResolvedValue({ estado: 'ACTIVO' } as never);

    const req = {
      accessToken: 'token-state',
      robleUser: {
        sub: 'manager-1',
        role: 'admin',
        name: 'Admin',
        email: 'admin@example.com',
      },
    } as never;

    const result = await controller.cambiarEstado(req, 'torneo-1', {
      estado: 'ACTIVO' as never,
    });

    expect(service.actualizarEstadoTorneo).toHaveBeenCalledWith(
      'token-state',
      'torneo-1',
      'manager-1',
      'admin',
      'ACTIVO',
    );
    expect(result).toEqual({ estado: 'ACTIVO' });
  });

  it('delegates public ranking without bootstrap', async () => {
    service.obtenerRankingPublico.mockResolvedValue([{ usuarioId: 'user-1' }] as never);

    const result = await controller.rankingPublico('torneo-publico');

    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
    expect(service.obtenerRankingPublico).toHaveBeenCalledWith('torneo-publico');
    expect(result).toEqual([{ usuarioId: 'user-1' }]);
  });

  it('delegates authenticated participants with current user context', async () => {
    service.listarParticipantes.mockResolvedValue([{ usuarioId: 'user-1' }] as never);

    const req = {
      accessToken: 'token-participants',
      robleUser: {
        sub: 'creator-1',
        role: 'player',
        name: 'Creator',
        email: 'creator@example.com',
      },
    } as never;

    const result = await controller.participantes(req, 'torneo-finalizado');

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-participants',
      'creator-1',
      'Creator',
      'creator@example.com',
    );
    expect(service.listarParticipantes).toHaveBeenCalledWith(
      'token-participants',
      'torneo-finalizado',
      'creator-1',
      'player',
    );
    expect(result).toEqual([{ usuarioId: 'user-1' }]);
  });

  it('delegates authenticated ranking with current user context', async () => {
    service.obtenerRanking.mockResolvedValue([{ usuarioId: 'user-1', puntaje: 50 }] as never);

    const req = {
      accessToken: 'token-ranking',
      robleUser: {
        sub: 'creator-1',
        role: 'player',
        name: 'Creator',
        email: 'creator@example.com',
      },
    } as never;

    const result = await controller.ranking(req, 'torneo-finalizado');

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-ranking',
      'creator-1',
      'Creator',
      'creator@example.com',
    );
    expect(service.obtenerRanking).toHaveBeenCalledWith(
      'token-ranking',
      'torneo-finalizado',
      'creator-1',
      'player',
    );
    expect(result).toEqual([{ usuarioId: 'user-1', puntaje: 50 }]);
  });

});
