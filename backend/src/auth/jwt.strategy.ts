import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { JwtPayload } from '../common/types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change_this_secret_in_production')
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      regionalId: payload.regionalId ?? null,
      zoneId: payload.zoneId ?? null
    };
  }
}

