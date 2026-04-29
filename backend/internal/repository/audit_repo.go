package repository

import (
	"context"
	"encoding/json"

	"aetha-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AuditRepository struct {
	db *sqlx.DB
}

func NewAuditRepository(db *sqlx.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) LogAction(ctx context.Context, actorID *string, action, resourceType string, resourceID *string, details any) error {
	encoded := []byte(`{}`)
	if details != nil {
		if payload, err := json.Marshal(details); err == nil {
			encoded = payload
		}
	}

	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, details)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
		id, actorID, action, resourceType, resourceID, string(encoded))
	return err
}

func (r *AuditRepository) ListAuditLogs(ctx context.Context, limit int) ([]models.AuditLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var logs []models.AuditLog
	err := r.db.SelectContext(ctx, &logs, `
		SELECT id, actor_id, action, resource_type, resource_id, details::text AS details, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT $1`, limit)
	return logs, err
}