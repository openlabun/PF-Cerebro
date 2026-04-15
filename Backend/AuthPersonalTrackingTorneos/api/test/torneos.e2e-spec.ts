import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PersonalTrackingBootstrapService } from '../src/personal-tracking/bootstrap/personal-tracking-bootstrap.service';
import { RobleAuthGuard } from '../src/common/guards/roble-auth.guard';
import { TorneosController } from '../src/torneos/torneos.controller';
import { TorneosService } from '../src/torneos/torneos.service';

class TestRobleAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.accessToken = 'token-test';
    req.robleUser = {
      sub: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'player',
    };
    return true;
  }
}

describe('TorneosController (e2e)', () => {
  let app: INestApplication;
  const torneosService = {
    listarTorneosPublicos: jest.fn(),
    obtenerTorneoDetallePublico: jest.fn(),
    obtenerRankingPublico: jest.fn(),
    crearTorneo: jest.fn(),
    unirseATorneo: jest.fn(),
    actualizarEstadoTorneo: jest.fn(),
  };
  const bootstrapService = {
    ensureInitialized: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TorneosController],
      providers: [
        {
          provide: TorneosService,
          useValue: torneosService,
        },
        {
          provide: PersonalTrackingBootstrapService,
          useValue: bootstrapService,
        },
      ],
    })
      .overrideGuard(RobleAuthGuard)
      .useClass(TestRobleAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns public tournaments without authentication', async () => {
    torneosService.listarTorneosPublicos.mockResolvedValue([
      { _id: 'torneo-publico' },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/torneos/public')
      .expect(200);

    expect(response.body).toEqual([{ _id: 'torneo-publico' }]);
    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
  });

  it('returns public tournament detail without authentication', async () => {
    torneosService.obtenerTorneoDetallePublico.mockResolvedValue({
      _id: 'torneo-publico',
      nombre: 'Serie abierta',
    });

    const response = await request(app.getHttpServer())
      .get('/api/torneos/public/torneo-publico')
      .expect(200);

    expect(response.body).toEqual({
      _id: 'torneo-publico',
      nombre: 'Serie abierta',
    });
    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
  });

  it('returns public ranking without authentication', async () => {
    torneosService.obtenerRankingPublico.mockResolvedValue([
      { usuarioId: 'user-1', puntaje: 100 },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/torneos/public/torneo-publico/ranking')
      .expect(200);

    expect(response.body).toEqual([{ usuarioId: 'user-1', puntaje: 100 }]);
    expect(bootstrapService.ensureInitialized).not.toHaveBeenCalled();
  });

  it('rejects invalid tournament creation payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/torneos')
      .set('Authorization', 'Bearer token-test')
      .send({
        descripcion: 'Sin nombre',
      })
      .expect(400);

    expect(torneosService.crearTorneo).not.toHaveBeenCalled();
  });

  it('creates tournaments with a valid payload and bootstraps the current user', async () => {
    torneosService.crearTorneo.mockResolvedValue({ _id: 'torneo-1' });

    const payload = {
      nombre: 'Serie de prueba',
      descripcion: 'Torneo de integracion',
      esPublico: true,
      tipo: 'SERIE',
      fechaInicio: '2026-03-28T14:00:00.000Z',
      fechaFin: '2026-03-29T14:00:00.000Z',
      recurrencia: 'NINGUNA',
      configuracion: {
        duracionMaximaMin: 20,
        dificultad: 'Intermedio',
        numeroTableros: 3,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/torneos')
      .set('Authorization', 'Bearer token-test')
      .send(payload)
      .expect(201);

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-test',
      'user-1',
      'Alice',
      'alice@example.com',
    );
    expect(torneosService.crearTorneo).toHaveBeenCalledWith(
      'token-test',
      'user-1',
      expect.objectContaining(payload),
    );
    expect(response.body).toEqual({ _id: 'torneo-1' });
  });

  it('joins a tournament with an access code and bootstraps the current user', async () => {
    torneosService.unirseATorneo.mockResolvedValue({ ok: true });

    const response = await request(app.getHttpServer())
      .post('/api/torneos/torneo-1/unirse')
      .set('Authorization', 'Bearer token-test')
      .send({
        codigoAcceso: 'ABC123',
      })
      .expect(201);

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-test',
      'user-1',
      'Alice',
      'alice@example.com',
    );
    expect(torneosService.unirseATorneo).toHaveBeenCalledWith(
      'token-test',
      'torneo-1',
      'user-1',
      'ABC123',
    );
    expect(response.body).toEqual({ ok: true });
  });

  it('rejects invalid state transitions before reaching the service', async () => {
    await request(app.getHttpServer())
      .patch('/api/torneos/torneo-1/estado')
      .set('Authorization', 'Bearer token-test')
      .send({
        estado: 'DESCONOCIDO',
      })
      .expect(400);

    expect(torneosService.actualizarEstadoTorneo).not.toHaveBeenCalled();
  });

  it('updates tournament state with a valid payload and the current role', async () => {
    torneosService.actualizarEstadoTorneo.mockResolvedValue({
      _id: 'torneo-1',
      estado: 'ACTIVO',
    });

    const response = await request(app.getHttpServer())
      .patch('/api/torneos/torneo-1/estado')
      .set('Authorization', 'Bearer token-test')
      .send({
        estado: 'ACTIVO',
      })
      .expect(200);

    expect(bootstrapService.ensureInitialized).toHaveBeenCalledWith(
      'token-test',
      'user-1',
      'Alice',
      'alice@example.com',
    );
    expect(torneosService.actualizarEstadoTorneo).toHaveBeenCalledWith(
      'token-test',
      'torneo-1',
      'user-1',
      'player',
      'ACTIVO',
    );
    expect(response.body).toEqual({
      _id: 'torneo-1',
      estado: 'ACTIVO',
    });
  });
});
