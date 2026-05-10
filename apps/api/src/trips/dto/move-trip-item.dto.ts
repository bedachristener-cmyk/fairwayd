import { IsIn } from 'class-validator';

export class MoveTripItemDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
