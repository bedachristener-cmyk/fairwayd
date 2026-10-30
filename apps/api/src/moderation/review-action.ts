import { SetMetadata } from '@nestjs/common';
export type ReviewAction =
  | 'AVATAR'
  | 'PROFILE'
  | 'POST_EDIT'
  | 'COMMENT_CREATE'
  | 'COMMENT_EDIT'
  | 'TRIP_COVER'
  | 'TIP_CREATE'
  | 'COURSE_CREATE';
export const REVIEW_ACTION = 'fairwayd.review-action';
export const Reviewable = (action: ReviewAction) =>
  SetMetadata(REVIEW_ACTION, action);
