import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { SellerService } from './seller.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createUploadStorage } from '../storage/multer-storage';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

import {
  SellerRegistrationDto,
  UpdateSellerDto,
  LoginDto,
} from './dtos/seller.dto';

import { CreateProductDto, UpdateProductDto } from './dtos/product.dto';
import { CreateSellerShopDto } from './dtos/seller-shop.dto';
import { SellerOrderItemStatus } from 'src/customer/order-item.entity';

@Controller('seller')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly imageStorage: SupabaseStorageService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseInterceptors(
    FileInterceptor('nidImage', {
      fileFilter: (req, file, cb) => {
        if (file.originalname.match(/^.*\.(jpg|webp|png|jpeg)$/i)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 2 * 1024 * 1024 },
      storage: createUploadStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, Date.now() + '-' + file.originalname);
        },
      }),
    }),
  )
  async createSeller(
    @Body() dto: SellerRegistrationDto,
    @UploadedFile() nidImage: Express.Multer.File,
  ) {
    const storedImage = nidImage
      ? await this.imageStorage.storeNidImage(nidImage)
      : undefined;
    return this.sellerService.createSeller(dto, storedImage?.filename);
  }

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  login(@Body() dto: LoginDto) {
    return this.sellerService.loginSeller(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllSellers() {
    return this.sellerService.getAllSellers();
  }

  @Get('products')
  getAllProducts() {
    return this.sellerService.getAllProducts();
  }

  @Get('products/:id')
  getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getProductById(id);
  }

  @Post(':sellerId/products')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseInterceptors(
    FileInterceptor('productImage', {
      fileFilter: (req, file, cb) => {
        if (file.originalname.match(/^.*\.(jpg|webp|png|jpeg)$/i)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 2 * 1024 * 1024 },
      storage: createUploadStorage({
        destination: './uploads/products',
        filename: (req, file, cb) => {
          cb(null, Date.now() + '-' + file.originalname);
        },
      }),
    }),
  )
  async createProductForSeller(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Body() dto: CreateProductDto,
    @UploadedFile() productImage: Express.Multer.File,
  ) {
    const storedImage = productImage
      ? await this.imageStorage.storeImage(productImage, 'products')
      : undefined;
    return this.sellerService.createProductForSeller(
      sellerId,
      dto,
      storedImage?.filename,
    );
  }

  @Get(':sellerId/products')
  getProductsBySeller(@Param('sellerId', ParseIntPipe) sellerId: number) {
    return this.sellerService.getProductsBySeller(sellerId);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseInterceptors(
    FileInterceptor('productImage', {
      fileFilter: (req, file, cb) => {
        if (file.originalname.match(/^.*\.(jpg|webp|png|jpeg)$/i)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 2 * 1024 * 1024 },
      storage: createUploadStorage({
        destination: './uploads/products',
        filename: (req, file, cb) => {
          cb(null, Date.now() + '-' + file.originalname);
        },
      }),
    }),
  )
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    const storedImage = productImage
      ? await this.imageStorage.storeImage(productImage, 'products')
      : undefined;
    return this.sellerService.updateProduct(
      id,
      dto,
      storedImage?.filename,
    );
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.deleteProduct(id);
  }

  @Post(':sellerId/shop')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createSellerShop(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Body() dto: CreateSellerShopDto,
  ) {
    return this.sellerService.createSellerShop(sellerId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseInterceptors(
    FileInterceptor('nidImage', {
      fileFilter: (req, file, cb) => {
        if (file.originalname.match(/^.*\.(jpg|webp|png|jpeg)$/i)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 2 * 1024 * 1024 },
      storage: createUploadStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, Date.now() + '-' + file.originalname);
        },
      }),
    }),
  )
  async updateSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSellerDto,
    @UploadedFile() nidImage?: Express.Multer.File,
  ) {
    const storedImage = nidImage
      ? await this.imageStorage.storeNidImage(nidImage)
      : undefined;
    return this.sellerService.updateSeller(id, dto, storedImage?.filename);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteSeller(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.deleteSeller(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getSellerById(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getSellerById(id);
  }

  //get orders

  @Get(':id/orders')
  @UseGuards(JwtAuthGuard)
  getOrdersBySeller(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getSellerOrders(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('order-items/:id/status')
  updateOrderItemStatus(
    @Param('id', ParseIntPipe) itemId: number,
    @Body('status') status: SellerOrderItemStatus,
    @Req() req: any,
  ) {
    const sellerId = req.user.id;

    return this.sellerService.updateOrderItemStatus(itemId, sellerId, status);
  }
}
