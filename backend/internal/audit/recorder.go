// Package audit writes immutable mutation records into audit_logs.
//
// Every employee/org/customfield mutation in the service layer must call
// Recorder.Record so we have a tamper-evident trail per tenant.
package audit

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/sodium-labs/hrms/backend/internal/auth"
)

// Action is the kind of mutation being recorded.
type Action string

const (
	ActionCreate       Action = "create"
	ActionUpdate       Action = "update"
	ActionDelete       Action = "delete"
	ActionStatusChange Action = "status_change"
)

// Recorder appends rows to audit_logs.
type Recorder struct {
	pool *pgxpool.Pool
}

func NewRecorder(pool *pgxpool.Pool) *Recorder { return &Recorder{pool: pool} }

// Record persists a single audit row. tenantID and changedBy come from the
// request principal in ctx; entity/action describe the mutated row; old/new
// are arbitrary marshalable structs (pass nil to skip).
func (r *Recorder) Record(ctx context.Context, entityType string, entityID int64, action Action, oldData, newData any) error {
	if r == nil || r.pool == nil {
		return errors.New("audit: nil recorder")
	}
	p, ok := auth.FromContext(ctx)
	if !ok {
		return errors.New("audit: no principal in context")
	}
	oldJSON, err := marshalNullable(oldData)
	if err != nil {
		return err
	}
	newJSON, err := marshalNullable(newData)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
        INSERT INTO audit_logs (tenant_id, entity_type, entity_id, action, changed_by, old_data, new_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, p.TenantID, entityType, entityID, string(action), p.UserID, oldJSON, newJSON)
	return err
}

func marshalNullable(v any) ([]byte, error) {
	if v == nil {
		return nil, nil
	}
	return json.Marshal(v)
}
