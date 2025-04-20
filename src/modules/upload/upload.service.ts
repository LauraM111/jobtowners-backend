import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(UploadService.name);
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor(private configService: ConfigService) {
    this.endpoint = 'https://sfo3.digitaloceanspaces.com';
    this.bucketName = 'jobtowners-files';

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: 'sfo3',
      credentials: {
        accessKeyId: this.configService.get<string>('DO_SPACES_KEY'),
        secretAccessKey: this.configService.get<string>('DO_SPACES_SECRET'),
      },
    });
  }

  /**
   * Upload a file to DigitalOcean Spaces
   * @param file The file buffer
   * @param folder The folder to upload to (e.g., 'documents', 'images')
   * @param originalName Original filename
   */
  async uploadFile(
    file: Buffer,
    folder: string,
    originalName: string,
  ): Promise<string> {
    try {
      const fileExtension = path.extname(originalName);
      const fileName = `${folder}/${uuidv4()}${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file,
        ACL: 'public-read',
        ContentType: this.getContentType(fileExtension),
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return `https://${this.bucketName}.sfo3.digitaloceanspaces.com/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a base64 encoded file
   * @param base64Data Base64 encoded file data
   * @param folder The folder to upload to
   * @param fileType File type (e.g., 'jpg', 'pdf')
   */
  async uploadBase64File(
    base64Data: string,
    folder: string,
    fileType: string,
  ): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Content, 'base64');
      
      // Generate a unique filename
      const fileName = `${folder}/${uuidv4()}.${fileType}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ACL: 'public-read',
        ContentType: this.getContentType(`.${fileType}`),
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return `https://${this.bucketName}.sfo3.digitaloceanspaces.com/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload base64 file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload base64 file: ${error.message}`);
    }
  }

  /**
   * Delete a file from DigitalOcean Spaces
   * @param fileUrl The full URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const baseUrl = `https://${this.bucketName}.sfo3.digitaloceanspaces.com/`;
      const key = fileUrl.replace(baseUrl, '');

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(extension: string): string {
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
} 