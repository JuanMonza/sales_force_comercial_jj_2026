import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { ImportsService } from './imports.service';

@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('sales-csv')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR)
  @UseInterceptors(FileInterceptor('file'))
  importSalesCsv(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes enviar un archivo CSV');
    }
    return this.importsService.importSalesCsv(user, file.buffer);
  }

  @Post('sales-xlsx')
  @Roles(Role.ADMINISTRADOR, Role.DIRECTOR, Role.COORDINADOR)
  @UseInterceptors(FileInterceptor('file'))
  importSalesXlsx(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes enviar un archivo XLSX');
    }
    return this.importsService.importSalesXlsx(user, file.buffer);
  }
}
