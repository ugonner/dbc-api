import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserProfileDTO } from '../shared/dtos/user.dto';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AuthDTO, OtpAuthDTO } from '../shared/dtos/auth.dto';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

@ApiTags("Auth")
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // TODO: add permission guard to this route
  @ApiCreatedResponse()
  @HttpCode(HttpStatus.CREATED)
  @Post('/register-admin')
  async registerAdminAccount(@Body() payload: UserProfileDTO, @Req() req) {
    const authUser = await this.authService.createAccount(payload);
    ApiResponse.success('User Account Created Successfully', authUser);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async login(
    @Body() payload: AuthDTO,
    @Req() req,
    @Ip() ip: string,
  ): Promise<ApiResponse> {
    const refreshTokenData = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    };
    const user = await this.authService.login(payload, refreshTokenData);
    //TODO - Set Tokens Cookie

    // Return the API response
    return ApiResponse.success('Login successful', user);
  }

  @Post('/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Body() payload: OtpAuthDTO,
    @Req() req,
    @Ip() ip: string,
  ) {
    const refreshTokenData = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    };

    const user = await this.authService.verifyAccount(
      payload,
      refreshTokenData,
    );

    // TODO - Set Token Cookies
    return ApiResponse.success('Verification successsful', user);
  }

  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() payload: OtpAuthDTO) {
    const user = await this.authService.requestResetPassword(payload);
    return ApiResponse.success('Forgot Password Link Sent', user);
  }

  @Post('/request-reset-password')
  @HttpCode(HttpStatus.OK)
  async requestResetPassword(@Body() payload: OtpAuthDTO) {
    const user = await this.authService.requestResetPassword(payload);
    return ApiResponse.success('Forgot Password Link Sent', user);
  }

  @Post('/reset-password')
  async resetPassword(@Body() payload: OtpAuthDTO) {
    const user = await this.authService.resetPassword(payload);
    return ApiResponse.success('Password Reset Successfull', user);
  }

  @Post('/resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() payload: OtpAuthDTO) {
    const user = await this.authService.resendOtp(payload);
    return ApiResponse.success('Successfully sent verification code', user);
  }
}
