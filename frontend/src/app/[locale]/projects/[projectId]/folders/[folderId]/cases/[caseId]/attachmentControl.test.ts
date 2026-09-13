import { test, expect, describe } from 'vitest';
import { isImage } from './isImage';
import { AttachmentType } from '@/types/case';

describe('attachment control', () => {
  describe('isImage', () => {
    test('should return true for image files', () => {
      const imageAttachment: AttachmentType = {
        id: 1,
        title: 'image.jpg',
        detail: 'Test image',
        path: '/path/to/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        caseAttachments: {
          caseId: 1,
          attachmentId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(isImage(imageAttachment)).toBe(true);
    });

    test('should return false for non-image files', () => {
      const sampleAttachment: AttachmentType = {
        id: 1,
        title: 'document.pdf',
        detail: 'Test document',
        path: '/path/to/document.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
        caseAttachments: {
          caseId: 1,
          attachmentId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(isImage(sampleAttachment)).toBe(false);
    });
  });
});
