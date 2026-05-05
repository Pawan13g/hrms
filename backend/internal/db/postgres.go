package db

import (
	"context"
	"errors"
	"io/fs"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool = pgxpool.Pool

func Connect(ctx context.Context, dsn string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// Migrate runs all up migrations from the supplied FS against dsn.
func Migrate(dsn string, srcFS fs.FS) error {
	src, err := iofs.New(srcFS, ".")
	if err != nil {
		return err
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, "pgx5://"+stripScheme(dsn))
	if err != nil {
		return err
	}
	defer func() { _, _ = m.Close() }()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func stripScheme(dsn string) string {
	for _, p := range []string{"postgres://", "postgresql://"} {
		if len(dsn) >= len(p) && dsn[:len(p)] == p {
			return dsn[len(p):]
		}
	}
	return dsn
}

func Ping(ctx context.Context, p *Pool) error {
	if p == nil {
		return errors.New("pg pool is nil")
	}
	return p.Ping(ctx)
}
