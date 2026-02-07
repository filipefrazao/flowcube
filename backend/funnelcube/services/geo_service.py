"""
GeoIP service for FunnelCube analytics.
Uses MaxMind GeoLite2-City database for IP-to-location resolution.

The GeoLite2 database is downloaded on first use and cached on disk.
A Celery task refreshes it weekly.
"""

import logging
import os
import tarfile
import shutil
import tempfile
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

# GeoLite2 download URL (license-free mirror via db-ip.com)
# This is a free alternative that doesn't require MaxMind account
GEOIP_DB_URL = "https://download.db-ip.com/free/dbip-city-lite-2026-02.mmdb.gz"
GEOIP_DB_DIR = Path("/app/geoip")
GEOIP_DB_PATH = GEOIP_DB_DIR / "GeoLite2-City.mmdb"

_reader = None


def _download_db():
    """Download the GeoIP database if not present."""
    if GEOIP_DB_PATH.exists():
        return True

    GEOIP_DB_DIR.mkdir(parents=True, exist_ok=True)

    # Try db-ip.com free database first (no account required)
    urls = [
        "https://download.db-ip.com/free/dbip-city-lite-2026-02.mmdb.gz",
        "https://download.db-ip.com/free/dbip-city-lite-2026-01.mmdb.gz",
        "https://download.db-ip.com/free/dbip-city-lite-2025-12.mmdb.gz",
    ]

    for url in urls:
        try:
            logger.info("Downloading GeoIP database from %s", url)
            resp = requests.get(url, timeout=60, stream=True)
            if resp.status_code != 200:
                continue

            # Download gzipped file
            import gzip
            gz_path = GEOIP_DB_DIR / "dbip-city.mmdb.gz"
            with open(gz_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Decompress
            with gzip.open(gz_path, "rb") as f_in:
                with open(GEOIP_DB_PATH, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)

            gz_path.unlink(missing_ok=True)
            logger.info("GeoIP database downloaded: %s (%d bytes)",
                       GEOIP_DB_PATH, GEOIP_DB_PATH.stat().st_size)
            return True
        except Exception as e:
            logger.warning("Failed to download GeoIP DB from %s: %s", url, e)
            continue

    logger.error("Could not download GeoIP database from any source")
    return False


def _get_reader():
    """Get or create a GeoIP reader instance."""
    global _reader

    if _reader is not None:
        return _reader

    try:
        import maxminddb
    except ImportError:
        logger.warning("maxminddb not installed, GeoIP disabled")
        return None

    if not GEOIP_DB_PATH.exists():
        if not _download_db():
            return None

    try:
        _reader = maxminddb.open_database(str(GEOIP_DB_PATH))
        logger.info("GeoIP reader initialized: %s", GEOIP_DB_PATH)
        return _reader
    except Exception as e:
        logger.error("Failed to open GeoIP database: %s", e)
        return None


def resolve_ip(ip_address: str) -> dict:
    """
    Resolve an IP address to geographic location.

    Returns dict with keys: country, city, region, latitude, longitude
    All values default to empty string / None if resolution fails.
    """
    result = {
        "country": "",
        "city": "",
        "region": "",
        "latitude": None,
        "longitude": None,
    }

    if not ip_address or ip_address in ("127.0.0.1", "::1", "localhost"):
        return result

    # Skip private IPs
    if ip_address.startswith(("10.", "172.16.", "172.17.", "172.18.", "172.19.",
                               "172.20.", "172.21.", "172.22.", "172.23.",
                               "172.24.", "172.25.", "172.26.", "172.27.",
                               "172.28.", "172.29.", "172.30.", "172.31.",
                               "192.168.", "fd", "fe80")):
        return result

    reader = _get_reader()
    if reader is None:
        return result

    try:
        data = reader.get(ip_address)
        if not data:
            return result

        # Extract country (ISO 3166-1 alpha-2)
        country_data = data.get("country", {})
        result["country"] = country_data.get("iso_code", "")

        # Extract city
        city_data = data.get("city", {})
        city_names = city_data.get("names", {})
        result["city"] = city_names.get("en", city_names.get("pt-BR", ""))

        # Extract region/subdivision
        subdivisions = data.get("subdivisions", [])
        if subdivisions:
            subdiv_names = subdivisions[0].get("names", {})
            result["region"] = subdiv_names.get("en", subdiv_names.get("pt-BR", ""))

        # Extract coordinates
        location = data.get("location", {})
        result["latitude"] = location.get("latitude")
        result["longitude"] = location.get("longitude")

    except Exception as e:
        logger.debug("GeoIP lookup failed for %s: %s", ip_address, e)

    return result


def refresh_database():
    """Force re-download the GeoIP database. Called by weekly Celery task."""
    global _reader

    if _reader is not None:
        try:
            _reader.close()
        except Exception:
            pass
        _reader = None

    if GEOIP_DB_PATH.exists():
        GEOIP_DB_PATH.unlink()

    return _download_db()
