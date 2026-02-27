import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Role } from '../common/types/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMINISTRADOR)
  findAll(@CurrentUser() user: RequestUser) {
    return this.usersService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMINISTRADOR)
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  @Post()
  @Roles(Role.ADMINISTRADOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRADOR)
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRADOR)
  softDelete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.usersService.softDelete(user, id);
  }
}

