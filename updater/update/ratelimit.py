from redis import StrictRedis as Redis
from pathlib import Path
import hashlib
import time

lua_script_path = Path(__file__).parent / 'ratelimit.lua'

with open(lua_script_path) as f:
    LUA_SCRIPT = f.read()

del lua_script_path  # don't want it polluting the module


class RateLimit(object):
    def __init__(self,
                 redis_url='redis://',
                 redis_key_prefix='ratelimit',
                 bucket_size=50,
                 bucket_period=30):
        self.redis = Redis.from_url(redis_url)
        self.script = self.redis.register_script(LUA_SCRIPT)
        self.redis_key_prefix = redis_key_prefix
        self.bucket_size = bucket_size
        self.bucket_period = bucket_period

    def _exec(self, identifier, clear=False):
        identifier_h = hashlib.blake2s(
            identifier.encode('utf-8'), digest_size=6).hexdigest()

        token_count_key = "{}:{}:count".format(self.redis_key_prefix,
                                               identifier_h)
        token_last_add_key = "{}:{}:last-add".format(self.redis_key_prefix,
                                                     identifier_h)

        keys = [token_count_key, token_last_add_key]
        argv = [self.bucket_size, self.bucket_period, int(time.time())]
        if clear:
            argv += [True]
        return self.script(keys, argv)

    def hit(self, identifier):
        return int(self._exec(identifier))

    def clear(self, identifier):
        self._exec(identifier, clear=True)
