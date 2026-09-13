import Config from '@/config/config';
const apiServer = Config.apiServer;

// Helper function to compress and resize image with progressive compression
const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, initialQuality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;

      // More aggressive resizing for large images
      const maxDimension = Math.max(width, height);
      if (maxDimension > 2048) {
        // For very large images, reduce max size
        maxWidth = 1600;
        maxHeight = 1200;
      }

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the image
      ctx?.drawImage(img, 0, 0, width, height);

      // Progressive compression - try different quality levels
      let quality = initialQuality;
      let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

      // If still too large, try more aggressive compression
      const targetSizeMB = 5; // Target 5MB per image
      const targetSize = targetSizeMB * 1024 * 1024 * (4 / 3); // Base64 is ~33% larger

      while (compressedBase64.length > targetSize && quality > 0.1) {
        quality -= 0.1;
        compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      }

      // If still too large, try reducing dimensions further
      if (compressedBase64.length > targetSize && (width > 800 || height > 600)) {
        canvas.width = Math.min(width * 0.7, 800);
        canvas.height = Math.min(height * 0.7, 600);
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      }

      resolve(compressedBase64);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};


// Helper function to convert File to base64 (with compression)
const fileToBase64 = async (file: File): Promise<string> => {
  // Check if it's an image file
  if (file.type.startsWith('image/')) {
    try {
      return await compressImage(file);
    } catch (error) {
      console.error('Image compression failed, using original file:', error);
      // Fallback to original file conversion
    }
  }

  // For non-images or if compression fails, use original method
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

async function uploadPlatformEvidence(
  jwt: string,
  caseId: number,
  platform: string,
  files: File[] | null,
  description: string | null,
  deleteImageIndices: number[] | null = null
) {
  try {
    const requestBody: any = {
      platform: platform,
    };

    // Convert files to base64 if provided
    if (files && files.length > 0) {
      const base64Images = await Promise.all(
        files.map(async (file, index) => {
          const base64 = await fileToBase64(file);

          // Calculate base64 size in MB
          const base64SizeMB = (base64.length * 0.75) / 1024 / 1024; // base64 is ~33% larger than binary

          // Warn if still large
          if (base64SizeMB > 10) {
            console.error(`Warning: Image ${index + 1} is still ${base64SizeMB.toFixed(2)}MB after compression`);
          }

          return base64;
        })
      );

      // Calculate total payload size
      const totalPayloadSize = JSON.stringify({ images: base64Images }).length / 1024 / 1024;

      if (totalPayloadSize > 45) {
        // Leave some buffer below 50MB limit
        throw new Error(
          `Payload too large: ${totalPayloadSize.toFixed(2)}MB. Please reduce image size or number of images.`
        );
      }

      requestBody.evidenceImageUrls = base64Images;
    }

    if (description !== null) {
      requestBody.evidenceDescription = description;
    }

    if (deleteImageIndices && deleteImageIndices.length > 0) {
      requestBody.deleteImageIndices = deleteImageIndices;
    }

    const url = `${apiServer}/cases/${caseId}/platform-evidence/${platform}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('Images are too large. Please compress your images or upload fewer images at once.');
      }

      const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

      // Provide more helpful error messages
      if (errorMessage.includes('Payload too large')) {
        throw new Error('Images are too large. Please compress your images or upload fewer images at once.');
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error: any) {
    console.error('Error updating platform evidence:', error);
    throw error;
  }
}

export { uploadPlatformEvidence };
