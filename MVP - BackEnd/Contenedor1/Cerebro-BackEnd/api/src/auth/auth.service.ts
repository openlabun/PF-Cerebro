import { Injectable } from '@nestjs/common';
import { RobleService } from '../roble/roble.service';
import { RobleLoginResponse } from '../roble/roble.types';
import { PersonalTrackingBootstrapService } from '../personal-tracking/bootstrap/personal-tracking-bootstrap.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly robleService: RobleService,
    private readonly ptBootstrap: PersonalTrackingBootstrapService,
  ) {}

  async login(email: string, password: string): Promise<RobleLoginResponse> {
    const loginData = await this.robleService.login(email, password);

    //Aquí conectaremos bootstrap de PersonalTracking (AAron)
    await this.ptBootstrap.ensureInitialized(
      loginData.accessToken,
      loginData.user.id,
    );

    return loginData;
  }

  async refresh(refreshToken: string) {
    return this.robleService.refreshToken(refreshToken);
  }

  async signup(payload: unknown) {
    return this.robleService.signup(payload);
  }

  async signupDirect(payload: unknown) {
    return this.robleService.signupDirect(payload);
  }

  async logout(accessToken: string) {
    return this.robleService.logout(accessToken);
  }

  async verifyToken(authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid Authorization header');
    }

    const token = authHeader.substring(7).trim();

    return this.robleService.verifyToken(token);
  }
}
