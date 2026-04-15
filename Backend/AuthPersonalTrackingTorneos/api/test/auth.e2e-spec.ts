import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RobleAuthGuard } from '../src/common/guards/roble-auth.guard';
import { CanActivate, ExecutionContext } from '@nestjs/common';

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

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    signup: jest.fn(),
    signupDirect: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    listUsers: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
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

  it('rejects invalid login payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'correo-invalido' })
      .expect(400);
  });

  it('accepts valid login payloads and delegates to the service', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'Secret1!',
      })
      .expect(201);

    expect(authService.login).toHaveBeenCalledWith(
      'user@example.com',
      'Secret1!',
    );
    expect(response.body).toEqual({
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
    });
  });

  it('accepts valid refresh payloads and delegates to the service', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'token-next',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'refresh-123',
      })
      .expect(201);

    expect(authService.refresh).toHaveBeenCalledWith('refresh-123');
    expect(response.body).toEqual({
      accessToken: 'token-next',
    });
  });

  it('accepts valid signup payloads and delegates to the service', async () => {
    authService.signup.mockResolvedValue({
      userId: 'user-1',
    });

    const payload = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Secret1!',
    };

    const response = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send(payload)
      .expect(201);

    expect(authService.signup).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual({
      userId: 'user-1',
    });
  });

  it('validates verify-email payloads before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({
        email: 'user@example.com',
      })
      .expect(400);

    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('accepts valid verify-email payloads and delegates to the service', async () => {
    authService.verifyEmail.mockResolvedValue({ ok: true });

    const payload = {
      email: 'user@example.com',
      code: '123456',
    };

    const response = await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send(payload)
      .expect(201);

    expect(authService.verifyEmail).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual({ ok: true });
  });

  it('validates forgot-password payloads before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({
        email: 'correo-invalido',
      })
      .expect(400);

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('accepts forgot-password payloads and delegates to the service', async () => {
    authService.forgotPassword.mockResolvedValue({ ok: true });

    const response = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({
        email: 'user@example.com',
      })
      .expect(201);

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(response.body).toEqual({ ok: true });
  });

  it('validates reset-password payloads before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({
        token: '',
        newPassword: 'corta',
      })
      .expect(400);

    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('accepts valid reset-password payloads and delegates to the service', async () => {
    authService.resetPassword.mockResolvedValue({ ok: true });

    const payload = {
      token: 'reset-token',
      newPassword: 'NuevaClave1!',
    };

    const response = await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send(payload)
      .expect(201);

    expect(authService.resetPassword).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns the authenticated user on verify-token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-token')
      .set('Authorization', 'Bearer token-test')
      .expect(200);

    expect(response.body).toEqual({
      valid: true,
      user: {
        sub: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'player',
      },
    });
  });

  it('lists users with the authenticated access token', async () => {
    authService.listUsers.mockResolvedValue([{ id: 'user-1' }]);

    const response = await request(app.getHttpServer())
      .get('/api/auth/users')
      .set('Authorization', 'Bearer token-test')
      .expect(200);

    expect(authService.listUsers).toHaveBeenCalledWith('token-test');
    expect(response.body).toEqual([{ id: 'user-1' }]);
  });

  it('delegates logout with the authenticated access token', async () => {
    authService.logout.mockResolvedValue({ ok: true });

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer token-test')
      .expect(201);

    expect(authService.logout).toHaveBeenCalledWith('token-test');
    expect(response.body).toEqual({ ok: true });
  });
});
