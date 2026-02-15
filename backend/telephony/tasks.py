import logging
import os
import tempfile
from datetime import date, timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_call_recording(self, call_record_id, local_recording_path):
    """
    Upload call recording from FreePBX local storage to MinIO/S3,
    then update the CallRecord and clean up the local file.
    """
    from .models import CallRecord
    from .services.s3_client import S3Client

    try:
        call = CallRecord.objects.get(id=call_record_id)
    except CallRecord.DoesNotExist:
        logger.error(f"CallRecord {call_record_id} not found")
        return

    date_prefix = call.start_time.strftime("%Y/%m/%d")
    filename = f"{call.pabx_call_id}.wav"
    s3_key = f"recordings/{date_prefix}/{filename}"

    try:
        s3 = S3Client()
        success = s3.upload_recording(local_recording_path, s3_key)

        if success:
            call.recording_s3_key = s3_key
            call.save(update_fields=["recording_s3_key"])

            if os.path.exists(local_recording_path):
                os.remove(local_recording_path)
                logger.info(f"Deleted local recording: {local_recording_path}")

            if getattr(settings, "AUTO_TRANSCRIBE_CALLS", False):
                transcribe_recording.delay(str(call.id))

            logger.info(f"Recording processed for call {call_record_id}")
        else:
            raise Exception("S3 upload returned False")

    except Exception as e:
        logger.error(f"Recording processing failed: {e}")
        self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def transcribe_recording(self, call_record_id):
    """
    Transcribe a call recording using OpenAI Whisper API.
    """
    from .models import CallRecord
    from .services.s3_client import S3Client

    try:
        call = CallRecord.objects.get(id=call_record_id)
    except CallRecord.DoesNotExist:
        logger.error(f"CallRecord {call_record_id} not found")
        return

    if not call.recording_s3_key:
        logger.warning(f"No recording for call {call_record_id}")
        return

    call.transcription_status = "processing"
    call.save(update_fields=["transcription_status"])

    try:
        s3 = S3Client()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            s3.client.download_file(
                getattr(settings, "RECORDINGS_BUCKET", "call-recordings"),
                call.recording_s3_key,
                tmp.name,
            )
            tmp_path = tmp.name

        import openai

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="pt",
                response_format="text",
            )

        call.transcription = transcript
        call.transcription_status = "completed"
        call.save(update_fields=["transcription", "transcription_status"])

        os.unlink(tmp_path)
        logger.info(f"Transcription completed for call {call_record_id}")

    except Exception as e:
        logger.error(f"Transcription failed for call {call_record_id}: {e}")
        call.transcription_status = "failed"
        call.save(update_fields=["transcription_status"])
        self.retry(exc=e)


@shared_task
def generate_daily_stats(target_date=None):
    """
    Aggregate call data into daily statistics per agent.
    Run via Celery Beat at end of day (e.g., 23:55).
    """
    from django.contrib.auth import get_user_model

    from .models import CallRecord, CallStats

    User = get_user_model()

    if target_date is None:
        target_date = date.today()
    elif isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)

    day_start = timezone.make_aware(
        timezone.datetime.combine(target_date, timezone.datetime.min.time())
    )
    day_end = day_start + timedelta(days=1)

    agents = User.objects.filter(extension__isnull=False).distinct()

    for agent in agents:
        calls = CallRecord.objects.filter(
            agent=agent,
            start_time__gte=day_start,
            start_time__lt=day_end,
        )

        stats_data = calls.aggregate(
            total=Count("id"),
            answered=Count("id", filter=Q(status="COMPLETED")),
            missed=Count(
                "id",
                filter=Q(status__in=["NO_ANSWER", "BUSY", "FAILED"]),
            ),
            outbound=Count("id", filter=Q(direction="OUTBOUND")),
            avg_dur=Avg("duration_seconds"),
            total_talk=Sum("duration_seconds"),
        )

        CallStats.objects.update_or_create(
            date=target_date,
            agent=agent,
            defaults={
                "total_calls": stats_data["total"] or 0,
                "answered_calls": stats_data["answered"] or 0,
                "missed_calls": stats_data["missed"] or 0,
                "outbound_calls": stats_data["outbound"] or 0,
                "avg_duration": round(stats_data["avg_dur"] or 0, 2),
                "total_talk_time": stats_data["total_talk"] or 0,
            },
        )

    logger.info(f"Daily stats generated for {target_date}")


@shared_task
def cleanup_old_recordings(retention_days=None):
    """
    LGPD Compliance: Delete recordings older than retention period.
    Run via Celery Beat (e.g., weekly).
    """
    from .models import CallRecord
    from .services.s3_client import S3Client

    if retention_days is None:
        retention_days = getattr(settings, "RECORDING_RETENTION_DAYS", 180)

    cutoff = timezone.now() - timedelta(days=retention_days)

    old_calls = CallRecord.objects.filter(
        recording_s3_key__isnull=False,
        start_time__lt=cutoff,
    )

    s3 = S3Client()
    deleted = 0

    for call in old_calls.iterator():
        success = s3.delete_recording(call.recording_s3_key)
        if success:
            call.recording_s3_key = None
            call.transcription = None
            call.transcription_status = "skipped"
            call.save(
                update_fields=[
                    "recording_s3_key",
                    "transcription",
                    "transcription_status",
                ]
            )
            deleted += 1

    logger.info(
        f"LGPD cleanup: deleted {deleted} recordings "
        f"older than {retention_days} days"
    )
