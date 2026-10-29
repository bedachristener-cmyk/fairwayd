import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from '../auth/admin.guard';
import { CourseSubmissionsController } from './course-submissions.controller';

function guardsFor(methodName: keyof CourseSubmissionsController) {
  return Reflect.getMetadata(
    GUARDS_METADATA,
    CourseSubmissionsController.prototype[methodName],
  ) as unknown[];
}

describe('CourseSubmissionsController admin protection', () => {
  it('keeps submission creation available to authenticated users', () => {
    expect(guardsFor('create')).not.toContain(AdminGuard);
  });

  it('requires admin authorization to list submissions', () => {
    expect(guardsFor('list')).toContain(AdminGuard);
  });

  it('requires admin authorization to approve submissions', () => {
    expect(guardsFor('approve')).toContain(AdminGuard);
  });

  it('requires admin authorization to reject submissions', () => {
    expect(guardsFor('reject')).toContain(AdminGuard);
  });
});
