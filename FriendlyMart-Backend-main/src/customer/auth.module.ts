import { getJwtSecret } from '../auth/jwt-secret';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CustomerService } from './customer.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [CustomerService, JwtStrategy],
  // exports: [JwtModule, PassportModule],
})
export class AuthModule {}
