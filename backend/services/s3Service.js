const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const crypto = require('crypto');

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const uploadToS3 = async (filePath, mimetype, options = {}) => {
    const objectPrefix = String(options.prefix || 'videos').replace(/^\/+|\/+$/g, '') || 'videos';
    // Generate unique file name
    const ext = filePath.split('.').pop() || 'mp4';
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

    const fileStream = fs.createReadStream(filePath);

    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${objectPrefix}/${fileName}`,
        Body: fileStream,
        ContentType: mimetype,
        // Optional: ACL: 'public-read' depends on bucket policies
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Return CloudFront URL if configured, otherwise fallback to raw S3 URL
        const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectPrefix}/${fileName}`;
        const finalUrl = process.env.AWS_CLOUDFRONT_URL
            ? `${process.env.AWS_CLOUDFRONT_URL}/${objectPrefix}/${fileName}`
            : s3Url;

        return finalUrl;
    } catch (err) {
        console.error("Error uploading to S3:", err);
        throw err;
    }
};

module.exports = {
    uploadToS3,
    s3Client
};
