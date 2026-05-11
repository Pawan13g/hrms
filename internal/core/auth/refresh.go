package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RefreshStore persists refresh-token JTIs in Redis under
// `user:{id}:refresh:{jti}`. Storing the JTI (not the token) means we can
// revoke a single refresh token by deleting one key.
type RefreshStore struct {
	rds *redis.Client
}

func NewRefreshStore(rds *redis.Client) *RefreshStore { return &RefreshStore{rds: rds} }

func refreshKey(userID uint64, jti string) string {
	return fmt.Sprintf("user:%d:refresh:%s", userID, jti)
}

// Save records a JTI as valid until ttl elapses.
func (s *RefreshStore) Save(ctx context.Context, userID uint64, jti string, ttl time.Duration) error {
	if jti == "" {
		return errors.New("refresh: empty jti")
	}
	return s.rds.Set(ctx, refreshKey(userID, jti), "1", ttl).Err()
}

// IsActive reports whether a JTI is still listed as valid.
func (s *RefreshStore) IsActive(ctx context.Context, userID uint64, jti string) (bool, error) {
	v, err := s.rds.Get(ctx, refreshKey(userID, jti)).Result()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return v == "1", nil
}

// Revoke deletes a single refresh JTI.
func (s *RefreshStore) Revoke(ctx context.Context, userID uint64, jti string) error {
	return s.rds.Del(ctx, refreshKey(userID, jti)).Err()
}
