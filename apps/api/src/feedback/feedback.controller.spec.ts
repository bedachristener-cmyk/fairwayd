import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from '../auth/admin.guard';
import { FeedbackController } from './feedback.controller';

function guardsFor(methodName: keyof FeedbackController) {
  return Reflect.getMetadata(
    GUARDS_METADATA,
    FeedbackController.prototype[methodName],
  ) as unknown[];
}

describe('FeedbackController admin protection', () => {
  it('requires admin authorization to list feedback', () => {
    expect(guardsFor('list')).toContain(AdminGuard);
  });

  it('keeps feedback creation available to authenticated users', () => {
    expect(guardsFor('create')).not.toContain(AdminGuard);
  });
});
