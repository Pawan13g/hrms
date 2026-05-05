package main

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"

	"github.com/sodium-labs/hrms/backend/internal/audit"
	"github.com/sodium-labs/hrms/backend/internal/auth"
	"github.com/sodium-labs/hrms/backend/internal/config"
	"github.com/sodium-labs/hrms/backend/internal/db"
	"github.com/sodium-labs/hrms/backend/internal/logger"
	"github.com/sodium-labs/hrms/backend/internal/rbac"
	rediscli "github.com/sodium-labs/hrms/backend/internal/redis"
	"github.com/sodium-labs/hrms/backend/internal/server"
	"github.com/sodium-labs/hrms/backend/migrations"
)

func main() {
	// Load .env from the current working directory if present. Missing file
	// is fine — shell-exported vars (CI, prod containers, `make backend`)
	// remain the source of truth. godotenv.Load does NOT overwrite vars
	// already set in the environment.
	if err := godotenv.Load(".env"); err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatal().Err(err).Msg("dotenv load failed")
	}
	cfg, err := config.Load()
	if err != nil {
		// logger isn't ready; emit and exit.
		log.Fatal().Err(err).Msg("config load failed")
	}
	logger.Init(cfg.LogLevel, cfg.Env)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	if err := db.Migrate(cfg.DatabaseURL, migrations.FS()); err != nil {
		log.Fatal().Err(err).Msg("migrations failed")
	}

	if err := rbac.Seed(ctx, pool); err != nil {
		log.Fatal().Err(err).Msg("rbac seed failed")
	}

	rds, err := rediscli.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("redis connect failed")
	}
	defer func() { _ = rds.Close() }()

	issuer := auth.NewIssuer(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	recorder := audit.NewRecorder(pool)

	r := server.New(server.Deps{Cfg: cfg, PG: pool, Redis: rds, Issuer: issuer, Audit: recorder})
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Str("env", cfg.Env).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server crashed")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Info().Msg("shutting down")

	shutdownCtx, sCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer sCancel()
	_ = srv.Shutdown(shutdownCtx)
}
