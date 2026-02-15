import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class S3Client:
    """Client for MinIO/S3 recording storage."""

    def __init__(self):
        import boto3

        self.client = boto3.client(
            "s3",
            endpoint_url=getattr(settings, "MINIO_ENDPOINT_URL", "http://minio:9000"),
            aws_access_key_id=getattr(settings, "MINIO_ACCESS_KEY", ""),
            aws_secret_access_key=getattr(settings, "MINIO_SECRET_KEY", ""),
            region_name="us-east-1",
        )
        self.bucket = getattr(settings, "RECORDINGS_BUCKET", "call-recordings")

    def upload_recording(self, local_path, s3_key):
        """Upload a recording file to S3/MinIO."""
        try:
            self.client.upload_file(
                local_path,
                self.bucket,
                s3_key,
                ExtraArgs={"ContentType": "audio/wav"},
            )
            logger.info(f"Uploaded recording to s3://{self.bucket}/{s3_key}")
            return True
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            return False

    def generate_presigned_url(self, s3_key, expiration=3600):
        """Generate a pre-signed URL for recording playback."""
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": s3_key},
                ExpiresIn=expiration,
            )
            return url
        except Exception as e:
            logger.error(f"Pre-signed URL generation failed: {e}")
            return None

    def delete_recording(self, s3_key):
        """Delete a recording from S3/MinIO."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=s3_key)
            logger.info(f"Deleted recording s3://{self.bucket}/{s3_key}")
            return True
        except Exception as e:
            logger.error(f"S3 delete failed: {e}")
            return False
