import { NotFoundException } from '@nestjs/common';
import {
  deletePrivateUpload,
  readStoredUpload,
  uploadPrivateToR2,
} from '../storage/r2.service';
import { TripsController } from './trips.controller';

jest.mock('../storage/r2.service', () => ({
  deletePrivateUpload: jest.fn(),
  readStoredUpload: jest.fn(),
  uploadPrivateToR2: jest.fn(),
  uploadToR2: jest.fn(),
}));

describe('TripsController document downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cleans up the private object when document creation fails', async () => {
    const createError = new Error('Database write failed');
    const fileUrl =
      'r2://private-trip-documents/trips/trip-1/documents/private.pdf';
    const tripsService = {
      assertCanManageDocuments: jest.fn().mockResolvedValue(undefined),
      createDocument: jest.fn().mockRejectedValue(createError),
    };
    const controller = new TripsController(tripsService as any);
    (uploadPrivateToR2 as jest.Mock).mockResolvedValue(fileUrl);
    (deletePrivateUpload as jest.Mock).mockResolvedValue(true);

    await expect(
      controller.createDocument(
        'trip-1',
        { user: { id: 'user-1' } },
        { title: 'Booking confirmation' },
        {
          originalname: 'booking.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('pdf'),
          size: 3,
        } as Express.Multer.File,
      ),
    ).rejects.toBe(createError);

    expect(deletePrivateUpload).toHaveBeenCalledWith(fileUrl);
  });

  it('removes the private object after document deletion without exposing its reference', async () => {
    const fileUrl =
      'r2://private-trip-documents/trips/trip-1/documents/private.pdf';
    const tripsService = {
      deleteDocument: jest.fn().mockResolvedValue({
        ok: true,
        deletedFileUrl: fileUrl,
      }),
    };
    const controller = new TripsController(tripsService as any);
    (deletePrivateUpload as jest.Mock).mockResolvedValue(true);

    await expect(
      controller.deleteDocument('trip-1', 'document-1', {
        user: { id: 'user-1' },
      }),
    ).resolves.toEqual({ ok: true });

    expect(deletePrivateUpload).toHaveBeenCalledWith(fileUrl);
  });

  it('does not read storage bytes when document authorization fails', async () => {
    const tripsService = {
      findDocumentFile: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Trip document not found')),
    };
    const controller = new TripsController(tripsService as any);
    const response = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await expect(
      controller.downloadDocument(
        'trip-1',
        'private-document',
        { user: { id: 'unselected-user' } },
        response as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tripsService.findDocumentFile).toHaveBeenCalledWith(
      'trip-1',
      'private-document',
      'unselected-user',
    );
    expect(readStoredUpload).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });
});
