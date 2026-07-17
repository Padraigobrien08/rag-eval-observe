"""Tests for the Redis-backed distributed rate limiter.

docs/HARDENING.md names this as the multi-instance answer to the in-memory
limiter's per-process state, so its two security-relevant properties are worth
pinning: it must actually deny past the limit, and — because it deliberately
fails *open* — it must never turn a Redis outage into an outage of the API.

Redis is mocked. The sliding-window arithmetic is what is under test here; the
`redis-py` client itself is not this repo's code.
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core import rate_limit_redis
from app.core.rate_limit_redis import RedisRateLimiter, get_redis_rate_limiter

MODULE = "app.core.rate_limit_redis"


def _mock_redis(zcard_result: int = 0):
    """A redis client whose pipeline().execute() reports `zcard_result`.

    Mirrors the real pipeline shape: buffered commands are sync, execute is async,
    and results come back positionally — zcard is index 1.
    """
    pipe = MagicMock()
    pipe.zremrangebyscore = MagicMock()
    pipe.zcard = MagicMock()
    pipe.zadd = MagicMock()
    pipe.expire = MagicMock()
    pipe.execute = AsyncMock(return_value=[0, zcard_result, 1, True])

    client = MagicMock()
    client.pipeline = MagicMock(return_value=pipe)
    client.delete = AsyncMock()
    client.keys = AsyncMock(return_value=[])
    client.close = AsyncMock()
    return client, pipe


@pytest.fixture(autouse=True)
def _reset_singleton():
    """`get_redis_rate_limiter` memoises into a module global."""
    rate_limit_redis._redis_rate_limiter = None
    yield
    rate_limit_redis._redis_rate_limiter = None


class TestIsAllowed:
    @pytest.mark.asyncio
    async def test_allows_and_reports_remaining_when_under_the_limit(self):
        client, _ = _mock_redis(zcard_result=2)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            allowed, remaining = await limiter.is_allowed("1.2.3.4")

        assert allowed is True
        # 2 already in the window + this one = 3 used, 7 left.
        assert remaining == 7

    @pytest.mark.asyncio
    async def test_denies_once_the_window_is_full(self):
        client, _ = _mock_redis(zcard_result=10)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            allowed, remaining = await limiter.is_allowed("1.2.3.4")

        assert allowed is False
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_last_request_in_the_window_is_allowed_with_zero_remaining(self):
        """Boundary: count == max - 1 is the final allowed request, not the first
        denied one. An off-by-one here silently costs every client one request.
        """
        client, _ = _mock_redis(zcard_result=9)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            allowed, remaining = await limiter.is_allowed("1.2.3.4")

        assert allowed is True
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_evicts_entries_older_than_the_window_before_counting(self):
        client, pipe = _mock_redis(zcard_result=0)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        before = time.time()
        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.is_allowed("1.2.3.4")
        after = time.time()

        key, low, high = pipe.zremrangebyscore.call_args[0]
        assert key == "rate_limit:1.2.3.4"
        assert low == 0
        # Everything older than (now - window) is dropped — that is what makes the
        # window sliding rather than fixed.
        assert before - 60 <= high <= after - 60

    @pytest.mark.asyncio
    async def test_key_expires_just_past_the_window_so_idle_clients_are_reaped(self):
        client, pipe = _mock_redis(zcard_result=0)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.is_allowed("1.2.3.4")

        assert pipe.expire.call_args[0] == ("rate_limit:1.2.3.4", 61)

    @pytest.mark.asyncio
    async def test_identifiers_get_their_own_key(self):
        client, pipe = _mock_redis(zcard_result=0)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.is_allowed("10.0.0.1")
            await limiter.is_allowed("10.0.0.2")

        keys = [call[0][0] for call in pipe.zcard.call_args_list]
        assert keys == ["rate_limit:10.0.0.1", "rate_limit:10.0.0.2"]

    @pytest.mark.asyncio
    async def test_denied_requests_still_count_against_the_window(self):
        """Documenting deliberate-looking behaviour: `zadd` is buffered before the
        count is inspected, so a request that gets denied is *still* recorded.

        A client that keeps hammering while blocked therefore keeps its own window
        full and extends its own lockout. That is defensible as backpressure, but
        it is a real behaviour rather than an obvious one — pin it so a future
        refactor has to choose it on purpose.
        """
        client, pipe = _mock_redis(zcard_result=99)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            allowed, _ = await limiter.is_allowed("1.2.3.4")

        assert allowed is False
        pipe.zadd.assert_called_once()

    @pytest.mark.asyncio
    async def test_redis_outage_fails_open(self):
        """A Redis outage must not become an API outage.

        The module comments call this out as a conscious choice ("fail open"), so
        the test states it explicitly: an unreachable Redis allows the request.
        """
        client, pipe = _mock_redis()
        pipe.execute = AsyncMock(side_effect=ConnectionError("redis is down"))
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            allowed, remaining = await limiter.is_allowed("1.2.3.4")

        assert allowed is True
        assert remaining == 9

    @pytest.mark.asyncio
    async def test_client_is_created_once_and_reused(self):
        client, _ = _mock_redis(zcard_result=0)
        limiter = RedisRateLimiter("redis://x", max_requests=10, window_seconds=60)

        with patch(f"{MODULE}.redis.from_url", return_value=client) as from_url:
            await limiter.is_allowed("a")
            await limiter.is_allowed("b")

        # Reconnecting per request would defeat the connect timeouts entirely.
        from_url.assert_called_once()


class TestReset:
    @pytest.mark.asyncio
    async def test_reset_with_identifier_deletes_only_that_key(self):
        client, _ = _mock_redis()
        limiter = RedisRateLimiter("redis://x")

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.reset("1.2.3.4")

        client.delete.assert_awaited_once_with("rate_limit:1.2.3.4")
        client.keys.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_reset_without_identifier_clears_every_rate_limit_key(self):
        client, _ = _mock_redis()
        client.keys = AsyncMock(return_value=["rate_limit:a", "rate_limit:b"])
        limiter = RedisRateLimiter("redis://x")

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.reset()

        client.keys.assert_awaited_once_with("rate_limit:*")
        client.delete.assert_awaited_once_with("rate_limit:a", "rate_limit:b")

    @pytest.mark.asyncio
    async def test_reset_with_no_keys_present_issues_no_delete(self):
        client, _ = _mock_redis()
        limiter = RedisRateLimiter("redis://x")

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.reset()

        # `delete(*[])` is an error in redis-py, so the empty case must short-circuit.
        client.delete.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_reset_swallows_redis_errors(self):
        client, _ = _mock_redis()
        client.delete = AsyncMock(side_effect=ConnectionError("down"))
        limiter = RedisRateLimiter("redis://x")

        with patch(f"{MODULE}.redis.from_url", return_value=client):
            await limiter.reset("1.2.3.4")  # must not raise


class TestClose:
    @pytest.mark.asyncio
    async def test_close_releases_the_client_and_allows_reconnect(self):
        client, _ = _mock_redis(zcard_result=0)
        limiter = RedisRateLimiter("redis://x")

        with patch(f"{MODULE}.redis.from_url", return_value=client) as from_url:
            await limiter.is_allowed("a")
            await limiter.close()
            await limiter.is_allowed("a")

        client.close.assert_awaited_once()
        assert from_url.call_count == 2

    @pytest.mark.asyncio
    async def test_close_without_a_client_is_a_no_op(self):
        await RedisRateLimiter("redis://x").close()


class TestGetRedisRateLimiter:
    def test_returns_none_when_redis_is_disabled(self):
        with patch.object(rate_limit_redis.settings, "REDIS_ENABLED", False, create=True):
            with patch.object(rate_limit_redis.settings, "REDIS_URL", "redis://x", create=True):
                assert get_redis_rate_limiter() is None

    def test_returns_none_when_enabled_but_no_url_is_configured(self):
        """Enabled-but-unconfigured must degrade to the in-memory limiter rather
        than construct a limiter that fails open on every request.
        """
        with patch.object(rate_limit_redis.settings, "REDIS_ENABLED", True, create=True):
            with patch.object(rate_limit_redis.settings, "REDIS_URL", None, create=True):
                assert get_redis_rate_limiter() is None

    def test_returns_a_memoised_instance_when_configured(self):
        with patch.object(rate_limit_redis.settings, "REDIS_ENABLED", True, create=True):
            with patch.object(rate_limit_redis.settings, "REDIS_URL", "redis://x", create=True):
                first = get_redis_rate_limiter()
                second = get_redis_rate_limiter()

        assert isinstance(first, RedisRateLimiter)
        assert first is second
        assert first.redis_url == "redis://x"
