import time
from typing import Dict, List, Optional
from collections import defaultdict
from dataclasses import dataclass, field
import structlog

logger = structlog.get_logger()


@dataclass
class RouteMetrics:
    """Metrics for a specific route."""

    route: str
    request_count: int = 0
    status_counts: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    latency_buckets: Dict[str, int] = field(
        default_factory=lambda: {
            "<100ms": 0,
            "100-500ms": 0,
            "500ms-1s": 0,
            "1s-5s": 0,
            ">5s": 0,
        }
    )
    total_latency_ms: int = 0

    def record_request(self, status_code: int, latency_ms: int) -> None:
        """Record a request."""
        self.request_count += 1
        self.status_counts[status_code] += 1
        self.total_latency_ms += latency_ms

        # Bucket latency
        if latency_ms < 100:
            self.latency_buckets["<100ms"] += 1
        elif latency_ms < 500:
            self.latency_buckets["100-500ms"] += 1
        elif latency_ms < 1000:
            self.latency_buckets["500ms-1s"] += 1
        elif latency_ms < 5000:
            self.latency_buckets["1s-5s"] += 1
        else:
            self.latency_buckets[">5s"] += 1

    def get_avg_latency_ms(self) -> float:
        """Get average latency in milliseconds."""
        if self.request_count == 0:
            return 0.0
        return self.total_latency_ms / self.request_count


class MetricsCollector:
    """In-memory metrics collector."""

    def __init__(self):
        """Initialize metrics collector."""
        self.route_metrics: Dict[str, RouteMetrics] = {}
        self.token_usage: Dict[str, int] = {
            "embedding_prompt_tokens": 0,
            "embedding_total_tokens": 0,
            "chat_prompt_tokens": 0,
            "chat_completion_tokens": 0,
            "chat_total_tokens": 0,
        }
        self.start_time = time.time()

    def record_request(self, route: str, status_code: int, latency_ms: int) -> None:
        """
        Record an HTTP request.

        Args:
            route: API route path
            status_code: HTTP status code
            latency_ms: Request latency in milliseconds
        """
        if route not in self.route_metrics:
            self.route_metrics[route] = RouteMetrics(route=route)

        self.route_metrics[route].record_request(status_code, latency_ms)

    def record_embedding_tokens(self, prompt_tokens: int, total_tokens: int) -> None:
        """
        Record embedding token usage.

        Args:
            prompt_tokens: Prompt tokens used
            total_tokens: Total tokens used
        """
        self.token_usage["embedding_prompt_tokens"] += prompt_tokens
        self.token_usage["embedding_total_tokens"] += total_tokens

    def record_chat_tokens(
        self, prompt_tokens: int, completion_tokens: int, total_tokens: int
    ) -> None:
        """
        Record chat completion token usage.

        Args:
            prompt_tokens: Prompt tokens used
            completion_tokens: Completion tokens used
            total_tokens: Total tokens used
        """
        self.token_usage["chat_prompt_tokens"] += prompt_tokens
        self.token_usage["chat_completion_tokens"] += completion_tokens
        self.token_usage["chat_total_tokens"] += total_tokens

    def get_metrics(self) -> Dict:
        """
        Get all metrics as a dictionary.

        Returns:
            Dictionary with all metrics
        """
        routes = {}
        for route, metrics in self.route_metrics.items():
            routes[route] = {
                "request_count": metrics.request_count,
                "status_counts": dict(metrics.status_counts),
                "latency_buckets": dict(metrics.latency_buckets),
                "avg_latency_ms": round(metrics.get_avg_latency_ms(), 2),
                "total_latency_ms": metrics.total_latency_ms,
            }

        uptime_seconds = int(time.time() - self.start_time)

        return {
            "uptime_seconds": uptime_seconds,
            "routes": routes,
            "token_usage": dict(self.token_usage),
            "note": "Metrics are in-memory and reset on restart. Single instance only.",
        }

    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        self.route_metrics.clear()
        self.token_usage = {
            "embedding_prompt_tokens": 0,
            "embedding_total_tokens": 0,
            "chat_prompt_tokens": 0,
            "chat_completion_tokens": 0,
            "chat_total_tokens": 0,
        }
        self.start_time = time.time()


# Global metrics instance
_metrics: Optional[MetricsCollector] = None


def get_metrics() -> MetricsCollector:
    """Get or create global metrics collector."""
    global _metrics
    if _metrics is None:
        _metrics = MetricsCollector()
    return _metrics


def reset_metrics() -> None:
    """Reset global metrics (useful for testing)."""
    global _metrics
    if _metrics is not None:
        _metrics.reset()
