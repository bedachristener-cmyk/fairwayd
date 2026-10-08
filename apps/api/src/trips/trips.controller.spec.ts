import { NotFoundException } from '@nestjs/common';
import { readStoredUpload } from '../storage/r2.service';
import { TripsController } from './trips.controller';

jest.mock('../storage/r2.service', () => ({
  readStoredUpload: jest.fn(),
  uploadPrivateToR2: jest.fn(),
  uploadToR2: jest.fn(),
}));

describe('TripsController document downloads', () => {
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
