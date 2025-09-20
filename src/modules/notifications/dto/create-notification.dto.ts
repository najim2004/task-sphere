import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import {
  NotificationEntityType,
  NotificationPriority,
} from '../schemas/notification.schema';

class RelatedEntityDto {
  @IsEnum(NotificationEntityType)
  @IsNotEmpty()
  entity: NotificationEntityType;

  @IsMongoId()
  @IsNotEmpty()
  entityId: Types.ObjectId;
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  recipients: Types.ObjectId[];

  @IsMongoId()
  @IsOptional()
  sender?: Types.ObjectId;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsArray()
  @IsOptional()
  relatedEntities?: RelatedEntityDto[];
}
