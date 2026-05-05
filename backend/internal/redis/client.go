package redis

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"
)

type Client = redis.Client

func Connect(ctx context.Context, url string) (*Client, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	c := redis.NewClient(opts)
	if err := c.Ping(ctx).Err(); err != nil {
		_ = c.Close()
		return nil, err
	}
	return c, nil
}

func Ping(ctx context.Context, c *Client) error {
	if c == nil {
		return errors.New("redis client is nil")
	}
	return c.Ping(ctx).Err()
}
