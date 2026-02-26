import type { Request } from 'express';
import type { RobleVerifyTokenResponse } from '../../roble/roble.types';

export interface RobleRequest extends Request {
  accessToken: string;
  robleUser: RobleVerifyTokenResponse;
}
