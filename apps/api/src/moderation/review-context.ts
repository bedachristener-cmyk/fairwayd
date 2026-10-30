import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
export const reviewDigest = (userId: string, scope: string, bytes: Buffer) =>
  createHash('sha256')
    .update(JSON.stringify([userId, scope]))
    .update(bytes)
    .digest('hex');
export const approvedReview = new AsyncLocalStorage<Set<string>>();
export const reviewStorage = new AsyncLocalStorage<{
  uploads: string[];
  deletions: string[];
}>();
