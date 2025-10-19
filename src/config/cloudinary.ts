import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param file - File buffer, base64 string, or file path
 * @param userId - User ID for creating unique filename
 * @returns Cloudinary upload result with URL
 */
export async function uploadProfilePhoto(file: string | Buffer, userId: string) {
  try {
    // Convert buffer to base64 if needed
    let uploadData: string;
    if (Buffer.isBuffer(file)) {
      uploadData = `data:image/png;base64,${file.toString('base64')}`;
    } else {
      uploadData = file;
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: 'campus-connect/profiles',
      public_id: `user_${userId}`,
      overwrite: true, // This will replace existing photo with same public_id
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' } // Automatic optimization
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export async function deleteProfilePhoto(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
    return { success: true };
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export function extractPublicId(url: string): string | null {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v123456/campus-connect/profiles/user_abc123.jpg
    const match = url.match(/\/([^\/]+)\.(jpg|jpeg|png|webp|gif)$/);
    if (match) {
      // Extract the folder path and filename
      const pathMatch = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (pathMatch) {
        return pathMatch[1]; // Returns "campus-connect/profiles/user_abc123"
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}

export default cloudinary;
