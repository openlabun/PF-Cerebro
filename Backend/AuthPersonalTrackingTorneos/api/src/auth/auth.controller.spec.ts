import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<
    Pick<
      AuthService,
      | 'login'
      | 'refresh'
      | 'signup'
      | 'signupDirect'
      | 'verifyEmail'
      | 'forgotPassword'
      | 'resetPassword'
      | 'logout'
      | 'listUsers'
    >
  >;

  beforeEach(() => {
    service = {
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

    controller = new AuthController(service as unknown as AuthService);
  });

  it('delegates login credentials to the service', async () => {
    service.login.mockResolvedValue({ accessToken: 'token' } as never);

    const result = await controller.login({
      email: 'user@example.com',
      password: 'Secret1!',
    });

    expect(service.login).toHaveBeenCalledWith('user@example.com', 'Secret1!');
    expect(result).toEqual({ accessToken: 'token' });
  });

  it('delegates refresh tokens to the service', async () => {
    service.refresh.mockResolvedValue({ accessToken: 'next-token' } as never);

    const result = await controller.refresh({
      refreshToken: 'refresh-123',
    });

    expect(service.refresh).toHaveBeenCalledWith('refresh-123');
    expect(result).toEqual({ accessToken: 'next-token' });
  });

  it('forwards signup payload to the service', async () => {
    service.signup.mockResolvedValue({ session: null } as never);

    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Secret1!',
    };

    const result = await controller.signup(dto);

    expect(service.signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ session: null });
  });

  it('forwards signup-direct payload to the service', async () => {
    service.signupDirect.mockResolvedValue({ id: 'user-1' } as never);

    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Secret1!',
    };

    const result = await controller.signupDirect(dto);

    expect(service.signupDirect).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'user-1' });
  });

  it('forwards verify-email payload to the service', async () => {
    service.verifyEmail.mockResolvedValue({ ok: true } as never);

    const dto = {
      email: 'user@example.com',
      code: '123456',
    };

    const result = await controller.verifyEmail(dto);

    expect(service.verifyEmail).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ ok: true });
  });

  it('forwards forgot-password payload to the service', async () => {
    service.forgotPassword.mockResolvedValue({ ok: true } as never);

    const dto = {
      email: 'user@example.com',
    };

    const result = await controller.forgotPassword(dto);

    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ ok: true });
  });

  it('forwards reset-password payload to the service', async () => {
    service.resetPassword.mockResolvedValue({ ok: true } as never);

    const dto = {
      token: 'reset-token',
      newPassword: 'NuevaClave1!',
    };

    const result = await controller.resetPassword(dto);

    expect(service.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ ok: true });
  });

  it('uses the request access token on logout', async () => {
    service.logout.mockResolvedValue({ ok: true } as never);

    const req = { accessToken: 'token-logout' } as never;
    const result = await controller.logout(req);

    expect(service.logout).toHaveBeenCalledWith('token-logout');
    expect(result).toEqual({ ok: true });
  });

  it('returns the authenticated user on verify-token', () => {
    const req = {
      robleUser: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
      },
    } as never;

    expect(controller.verifyToken(req)).toEqual({
      valid: true,
      user: req.robleUser,
    });
  });

  it('uses the request access token when listing users', async () => {
    service.listUsers.mockResolvedValue([{ id: 'user-1' }] as never);

    const req = { accessToken: 'token-123' } as never;
    const result = await controller.listUsers(req);

    expect(service.listUsers).toHaveBeenCalledWith('token-123');
    expect(result).toEqual([{ id: 'user-1' }]);
  });
});
