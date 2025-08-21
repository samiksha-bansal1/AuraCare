const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const util = require('util');
const unlink = util.promisify(fs.unlink);

// GridFS bucket instance
let bucket;

/**
 * Initialize GridFS bucket
 */
function initGridFS() {
  if (!bucket) {
    const conn = mongoose.connection.db;
    bucket = new GridFSBucket(conn, { bucketName: 'media' });
  }
  return bucket;
}

/**
 * Upload a file to GridFS
 * @param {Object} file - Multer file object
 * @param {Object} metadata - Additional metadata to store with the file
 * @returns {Promise<{fileId: string, filename: string, size: number, mimeType: string}>}
 */
async function uploadFile(file, metadata = {}) {
  return new Promise((resolve, reject) => {
    const bucket = initGridFS();
    const filename = `${Date.now()}-${file.originalname.replace(/[^\w\d.-]/g, '')}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        ...metadata
      }
    });

    const readStream = fs.createReadStream(file.path);
    
    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      reject(new Error('Failed to upload file to storage'));
    });

    uploadStream.on('finish', async () => {
      try {
        // Delete the temp file after upload
        await unlink(file.path);
        
        resolve({
          fileId: uploadStream.id.toString(),
          filename: uploadStream.filename,
          size: uploadStream.length,
          mimeType: file.mimetype
        });
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
        reject(new Error('Failed to clean up temporary file'));
      }
    });

    readStream.pipe(uploadStream);
  });
}

/**
 * Get a read stream for a file
 * @param {string} fileId - The GridFS file ID
 * @returns {Promise<{stream: Readable, contentType: string, contentLength: number}>}
 */
async function getFileStream(fileId) {
  try {
    const bucket = initGridFS();
    const fileIdObj = new ObjectId(fileId);
    
    const files = await bucket.find({ _id: fileIdObj }).toArray();
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }
    
    const file = files[0];
    const stream = bucket.openDownloadStream(fileIdObj);
    
    return {
      stream,
      contentType: file.contentType || 'application/octet-stream',
      contentLength: file.length,
      metadata: file.metadata || {}
    };
  } catch (error) {
    console.error('Error getting file stream:', error);
    throw new Error('Failed to retrieve file');
  }
}

/**
 * Delete a file from GridFS
 * @param {string} fileId - The GridFS file ID
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileId) {
  try {
    const bucket = initGridFS();
    const fileIdObj = new ObjectId(fileId);
    
    await bucket.delete(fileIdObj);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Get file metadata
 * @param {string} fileId - The GridFS file ID
 * @returns {Promise<Object>}
 */
async function getFileMetadata(fileId) {
  try {
    const bucket = initGridFS();
    const fileIdObj = new ObjectId(fileId);
    
    const files = await bucket.find({ _id: fileIdObj }).toArray();
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }
    
    const { _id, filename, length, uploadDate, contentType, metadata } = files[0];
    
    return {
      id: _id,
      filename,
      size: length,
      uploadDate,
      contentType,
      originalName: metadata?.originalName || filename,
      ...metadata
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to retrieve file metadata');
  }
}

module.exports = {
  initGridFS,
  uploadFile,
  getFileStream,
  deleteFile,
  getFileMetadata
};
