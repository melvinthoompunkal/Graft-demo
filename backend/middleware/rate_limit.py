import asyncio
import time
import json
from pathlib import Path
from collections import defaultdict


class RateLimiter:
    """In-memory, per-IP rate limiter with a rolling time window, persisted to disk."""

    def __init__(self, max_requests: int = 3, window_seconds: int = 86400, persist_file: str = "rate_limits.json"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.persist_file = Path(__file__).resolve().parent.parent / "data" / persist_file
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._load()

    def _load(self):
        if self.persist_file.exists():
            try:
                with open(self.persist_file, "r") as f:
                    data = json.load(f)
                    for ip, ts in data.items():
                        self._requests[ip] = ts
            except Exception:
                pass

    def _save(self):
        try:
            self.persist_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.persist_file, "w") as f:
                json.dump(self._requests, f)
        except Exception:
            pass

    def _prune(self, ip: str) -> None:
        cutoff = time.time() - self.window_seconds
        original_len = len(self._requests[ip]) if ip in self._requests else 0
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]
        if not self._requests[ip]:
            if ip in self._requests:
                del self._requests[ip]
        if original_len > 0 and (ip not in self._requests or len(self._requests.get(ip, [])) != original_len):
            self._save()

    def check(self, ip: str) -> tuple[bool, dict]:
        """Check and consume a request. Returns (allowed, info_dict)."""
        self._prune(ip)
        timestamps = self._requests.get(ip, [])
        remaining = max(0, self.max_requests - len(timestamps))

        if len(timestamps) >= self.max_requests:
            oldest = timestamps[0]
            reset_in = int(oldest + self.window_seconds - time.time())
            return False, {
                "remaining": 0,
                "limit": self.max_requests,
                "reset_in": max(0, reset_in),
            }

        self._requests[ip].append(time.time())
        self._save()
        return True, {
            "remaining": remaining - 1,
            "limit": self.max_requests,
            "reset_in": self.window_seconds,
        }

    def get_info(self, ip: str) -> dict:
        """Get quota info without consuming a request."""
        self._prune(ip)
        timestamps = self._requests.get(ip, [])
        remaining = max(0, self.max_requests - len(timestamps))

        reset_in = self.window_seconds
        if timestamps:
            oldest = timestamps[0]
            reset_in = int(oldest + self.window_seconds - time.time())

        return {
            "remaining": remaining,
            "limit": self.max_requests,
            "reset_in": max(0, reset_in),
        }

    async def cleanup_loop(self, interval: int = 3600) -> None:
        """Periodically remove stale entries."""
        while True:
            await asyncio.sleep(interval)
            now = time.time()
            cutoff = now - self.window_seconds
            stale_ips = [
                ip for ip, ts in self._requests.items()
                if all(t <= cutoff for t in ts)
            ]
            changed = False
            for ip in stale_ips:
                del self._requests[ip]
                changed = True
            if changed:
                self._save()

rate_limiter = RateLimiter(max_requests=3, window_seconds=86400)
