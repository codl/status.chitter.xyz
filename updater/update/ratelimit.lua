-- keys:
-- KEYS[1] key for token count
-- KEYS[2] key for last token add time

-- args:
-- ARGV[1] bucket size
-- ARGV[2] time between granting tokens
-- ARGV[3] current time
-- ARGV[4] if set, will fill up the bucket

-- returns how many tokens remain
-- or -1 if the bucket was already empty

-- all times are in seconds

if ARGV[4] then
    redis.call('del', KEYS[1], KEYS[2])
    return ARGV[1]
end

local bucket = redis.call('mget', KEYS[1], KEYS[2])
local token_count = tonumber(bucket[1])
local last_add = tonumber(bucket[2])
local bucket_size = tonumber(ARGV[1])
local period = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

if not token_count or not last_add then
    token_count = ARGV[1]
    last_add = now
end

local periods_passed = math.floor((now - last_add) / period)
last_add = last_add + period * periods_passed
token_count = math.min(50, token_count + periods_passed)

local successful

if token_count > 0 then
    token_count = token_count - 1
    successful = true
end

redis.call('setex', KEYS[1], ARGV[1] * ARGV[2], token_count)
redis.call('setex', KEYS[2], ARGV[1] * ARGV[2], last_add)

if successful then
    return token_count
else
    return -1
end
