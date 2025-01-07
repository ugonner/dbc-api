import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Auth } from '../../entities/auth.entity';
import { IAuthTokens } from '../interfaces/auth.interface';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  private jwtService: JwtService;
  constructor() {
    super();
    this.jwtService = new JwtService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const tokens = this.extractTokenFromRequest(request);
    // log token and request url
    // If neither access nor refresh token is present, throw UnauthorizedException
    if (!tokens?.accessToken) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      const expiresin = process.env.JWT_ACCESS_TOKEN_EXPIRATION;
      console.log("secret", secret, "expires", expiresin);
      console.log("token", tokens)
        // Try to verify the access token
        const decodedAccessToken = this.jwtService.verify(tokens.accessToken, {
          secret: process.env.JWT_ACCESS_SECRET
        });
        (request as Request & {user: Auth}).user = decodedAccessToken.user;
        return true;
      
    } catch (error) {
      console.log("token error", error.message)
      if (error instanceof TokenExpiredError )  throw new UnprocessableEntityException("Token Expired");
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Verifies the refresh token, generates a new access token if valid, and sets it in cookies.
   */
  private async handleTokenRefresh(
    refreshToken: string,
    request: Request,
    response: Response,
  ): Promise<boolean> {
    try {
      const decodedRefreshToken = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Set user from the refresh token
      (request as Request & {user: Auth}).user = decodedRefreshToken.user;

      // Generate a new access token
      const newAccessToken = this.jwtService.sign(
        { user: decodedRefreshToken.user },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '1d' },
      );

      // Set the new access token in the response (via cookies)
      this.setAccessTokenInCookies(request, response, newAccessToken);

      return true;
    } catch (error) {
      throw new UnauthorizedException('We could not refresh your session');
    }
  }

  /**
   * Extracts JWT access and refresh tokens from cookies or headers.
   */
  private extractTokenFromRequest(request: Request): IAuthTokens | null {
    // Extract tokens from cookies
    if (
      request.cookies &&
      (request.cookies.hp_access_token || request.cookies.hp_refresh_token)
    ) {
      return {
        accessToken: request.cookies.hp_access_token,
        refreshToken: request.cookies.hp_refresh_token,
      };
    }

    // Extract tokens from Authorization header
    if (request.headers.authorization) {
      const authHeader = request.headers.authorization;
      const [bearer, accessToken] = authHeader.split(' ');
      if (bearer === 'Bearer' && accessToken) {
        return { accessToken };
      }
    }

    return null;
  }

  /**
   * Sets the new access token in the response cookies.
   */
  private setAccessTokenInCookies(
    req: Request,
    res: Response,
    accessToken: string,
  ) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('hp_access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/',
    });
  }
}
