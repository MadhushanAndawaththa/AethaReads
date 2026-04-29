package repository

import (
	"context"

	"aetha-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ReportRepository struct {
	db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) CreateReport(ctx context.Context, reporterID string, req *models.CreateReportRequest) (*models.Report, error) {
	id := uuid.New().String()
	report := &models.Report{}
	err := r.db.GetContext(ctx, report, `
		INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *`,
		id, reporterID, req.TargetType, req.TargetID, req.Reason, req.Details)
	return report, err
}

func (r *ReportRepository) GetReportByID(ctx context.Context, reportID string) (*models.Report, error) {
	report := &models.Report{}
	err := r.db.GetContext(ctx, report, "SELECT * FROM reports WHERE id = $1", reportID)
	return report, err
}

func (r *ReportRepository) ListReports(ctx context.Context, status string, limit int) ([]models.ReportWithReporter, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT r.*, u.username AS reporter_username, u.display_name AS reporter_display_name
		FROM reports r
		JOIN users u ON r.reporter_id = u.id`
	args := []any{}
	if status != "" && status != "all" {
		query += " WHERE r.status = $1"
		args = append(args, status)
	}
	query += " ORDER BY r.created_at DESC LIMIT $" + func() string {
		if len(args) == 0 {
			return "1"
		}
		return "2"
	}()
	args = append(args, limit)

	var reports []models.ReportWithReporter
	err := r.db.SelectContext(ctx, &reports, query, args...)
	return reports, err
}

func (r *ReportRepository) UpdateReportStatus(ctx context.Context, reportID, status, reviewedBy string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE reports
		SET status = $2,
			reviewed_by = $3,
			resolved_at = CASE WHEN $2 IN ('resolved', 'dismissed') THEN NOW() ELSE resolved_at END
		WHERE id = $1`, reportID, status, reviewedBy)
	return err
}