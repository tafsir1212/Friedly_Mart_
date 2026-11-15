import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { basename, extname, resolve } from 'path';
import type { Response } from 'express';
import {
  createUploadStorage,
  productionImageLimits,
} from '../storage/multer-storage';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

import { ManagerJwtAuthGuard } from './manager-jwt-auth.guard';
import { ManagerService } from './manager.service';

import {
  CreateManagerDto,
  ManagerLoginDto,
  ManagerChangePasswordDto,
  UpdateManagerProfileDto,
  UpdateComplaintStatusDto,
  CreateComplaintDto,
  UpdateOrderStatusDto,
} from './manager.dto';

@Controller('manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly imageStorage: SupabaseStorageService,
  ) {}

  // =============================================
  // REGISTER MANAGER (with profile image upload)
  // =============================================
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @UseInterceptors(
    FileInterceptor('profile_image', {
      limits: productionImageLimits(),
      storage: createUploadStorage({
        destination: './uploads/managers',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async registerManager(
    @Body() dto: CreateManagerDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const storedImage = profileImage
      ? await this.imageStorage.storeImage(profileImage, 'managers')
      : undefined;
    return this.managerService.createManager(dto, storedImage?.filename);
  }

  // =============================================
  // LOGIN
  // =============================================
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  login(@Body() dto: ManagerLoginDto) {
    return this.managerService.login(dto);
  }

  // =============================================
  // DASHBOARD STATS
  // =============================================
  @Get('dashboard')
  @UseGuards(ManagerJwtAuthGuard)
  getDashboard(@Req() req: any) {
    return this.managerService.getDashboardStats(req.user.id);
  }

  // =============================================
  // PROFILE
  // =============================================
  @Get('profile')
  @UseGuards(ManagerJwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.managerService.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(ManagerJwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      limits: productionImageLimits(),
      storage: createUploadStorage({
        destination: './uploads/managers',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateManagerProfileDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const storedImage = profileImage
      ? await this.imageStorage.storeImage(profileImage, 'managers')
      : undefined;
    return this.managerService.updateProfile(
      req.user.id,
      dto,
      storedImage?.filename,
    );
  }

  @Patch('change-password')
  @UseGuards(ManagerJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  changePassword(@Req() req: any, @Body() dto: ManagerChangePasswordDto) {
    return this.managerService.changePassword(req.user.id, dto);
  }

  // =============================================
  // CUSTOMER MANAGEMENT
  // =============================================
  @Get('customers')
  @UseGuards(ManagerJwtAuthGuard)
  getAllCustomers() {
    return this.managerService.getAllCustomers();
  }

  @Get('customers/:id')
  @UseGuards(ManagerJwtAuthGuard)
  getCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.getCustomerById(id);
  }

  @Patch('customers/:id/block')
  @UseGuards(ManagerJwtAuthGuard)
  blockCustomer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.managerService.blockCustomer(id, req.user.id, req.user.email);
  }

  @Patch('customers/:id/activate')
  @UseGuards(ManagerJwtAuthGuard)
  activateCustomer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.managerService.activateCustomer(
      id,
      req.user.id,
      req.user.email,
    );
  }

  // =============================================
  // SELLER MANAGEMENT
  // =============================================
  @Get('sellers')
  @UseGuards(ManagerJwtAuthGuard)
  getAllSellers() {
    return this.managerService.getAllSellers();
  }

  @Get('sellers/:id')
  @UseGuards(ManagerJwtAuthGuard)
  getSellerById(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.getSellerById(id);
  }

  @Get('sellers/:id/nid-image')
  @UseGuards(ManagerJwtAuthGuard)
  async getSellerNidImage(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const filename = await this.managerService.getSellerNidImageFilename(id);
    if (
      basename(filename) !== filename ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new NotFoundException('Seller NID image not found');
    }

    const localPath = resolve(process.cwd(), 'uploads', filename);
    response.setHeader('Cache-Control', 'private, no-store');
    if (existsSync(localPath)) {
      return response.sendFile(localPath);
    }

    return response.redirect(
      302,
      await this.imageStorage.getNidSignedUrl(filename),
    );
  }

  @Patch('sellers/:id/block')
  @UseGuards(ManagerJwtAuthGuard)
  blockSeller(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.managerService.blockSeller(id, req.user.id, req.user.email);
  }

  @Patch('sellers/:id/activate')
  @UseGuards(ManagerJwtAuthGuard)
  activateSeller(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.managerService.activateSeller(id, req.user.id, req.user.email);
  }

  // =============================================
  // COMPLAINT MANAGEMENT
  // =============================================
  @Get('complaints')
  @UseGuards(ManagerJwtAuthGuard)
  getAllComplaints() {
    return this.managerService.getAllComplaints();
  }

  @Get('complaints/:id')
  @UseGuards(ManagerJwtAuthGuard)
  getComplaintById(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.getComplaintById(id);
  }

  @Post('complaints')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createComplaint(@Body() dto: CreateComplaintDto) {
    return this.managerService.createComplaint(dto);
  }

  @Get('complaints/by-customer/:customerId')
  getComplaintsByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.managerService.getComplaintsByCustomer(customerId);
  }

  @Patch('complaints/:id/status')
  @UseGuards(ManagerJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateComplaintStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
    @Req() req: any,
  ) {
    return this.managerService.updateComplaintStatus(
      id,
      dto,
      req.user.id,
      req.user.email,
    );
  }



  // =============================================
  // ORDER MANAGEMENT
  // =============================================
  @Get('orders')
  @UseGuards(ManagerJwtAuthGuard)
  getAllOrders() {
    return this.managerService.getAllOrders();
  }

  @Get('orders/:id')
  @UseGuards(ManagerJwtAuthGuard)
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.getOrderById(id);
  }

  @Patch('orders/:id/status')
  @UseGuards(ManagerJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.managerService.updateOrderStatus(
      id,
      dto.status,
      req.user.id,
      req.user.email,
    );
  }

  // =============================================
  // NOTIFICATIONS
  // =============================================
  @Get('notifications')
  @UseGuards(ManagerJwtAuthGuard)
  getNotifications(@Req() req: any) {
    return this.managerService.getNotifications(req.user.id);
  }

  @Patch('notifications/read')
  @UseGuards(ManagerJwtAuthGuard)
  markNotificationsRead(@Req() req: any) {
    return this.managerService.markNotificationsRead(req.user.id);
  }

  // =============================================
  // ACTIVITY LOGS
  // =============================================
  @Get('activity-logs')
  @UseGuards(ManagerJwtAuthGuard)
  getActivityLogs(@Req() req: any) {
    return this.managerService.getActivityLogs(req.user.id);
  }
}
