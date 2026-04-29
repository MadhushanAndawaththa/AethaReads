package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"aetha-backend/internal/middleware"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	reportRepo    *repository.ReportRepository
	userRepo      *repository.UserRepository
	communityRepo *repository.CommunityRepository
	auditRepo     *repository.AuditRepository
}

func NewAdminHandler(rr *repository.ReportRepository, ur *repository.UserRepository, cr *repository.CommunityRepository, ar *repository.AuditRepository) *AdminHandler {
	return &AdminHandler{reportRepo: rr, userRepo: ur, communityRepo: cr, auditRepo: ar}
}

func (h *AdminHandler) GetReports(c *fiber.Ctx) error {
	status := strings.TrimSpace(c.Query("status", "pending"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	reports, err := h.reportRepo.ListReports(c.Context(), status, limit)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch reports"})
	}
	return c.JSON(fiber.Map{"data": reports})
}

func (h *AdminHandler) UpdateReport(c *fiber.Ctx) error {
	adminID := middleware.GetUserID(c)
	reportID := c.Params("id")
	report, err := h.reportRepo.GetReportByID(c.Context(), reportID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "Report not found"})
	}

	var req models.UpdateReportStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	action := strings.ToLower(strings.TrimSpace(req.Action))
	reason := strings.TrimSpace(req.Reason)
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		if action == "dismiss" {
			status = "dismissed"
		} else {
			status = "resolved"
		}
	}

	switch action {
	case "", "resolve", "dismiss":
	case "hide":
		if err := h.hideTarget(c.Context(), report.TargetType, report.TargetID, reason); err != nil {
			return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
		}
	case "unhide":
		if err := h.unhideTarget(c.Context(), report.TargetType, report.TargetID); err != nil {
			return c.Status(400).JSON(models.ErrorResponse{Error: err.Error()})
		}
	case "suspend":
		if report.TargetType != "user" {
			return c.Status(400).JSON(models.ErrorResponse{Error: "Suspend is only supported for user reports"})
		}
		if err := h.userRepo.SuspendUser(c.Context(), report.TargetID, reason); err != nil {
			return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to suspend user"})
		}
	case "unsuspend":
		if report.TargetType != "user" {
			return c.Status(400).JSON(models.ErrorResponse{Error: "Unsuspend is only supported for user reports"})
		}
		if err := h.userRepo.UnsuspendUser(c.Context(), report.TargetID); err != nil {
			return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to unsuspend user"})
		}
	default:
		return c.Status(400).JSON(models.ErrorResponse{Error: "Unsupported moderation action"})
	}

	if err := h.reportRepo.UpdateReportStatus(c.Context(), reportID, status, adminID); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to update report"})
	}
	h.audit(adminID, "moderation.report_updated", "report", reportID, map[string]any{"status": status, "action": action, "target_type": report.TargetType, "target_id": report.TargetID})

	return c.JSON(fiber.Map{"message": "Report updated"})
}

func (h *AdminHandler) GetAuditLogs(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	logs, err := h.auditRepo.ListAuditLogs(c.Context(), limit)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch audit logs"})
	}
	return c.JSON(fiber.Map{"data": logs})
}

func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	user, err := h.userRepo.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "User not found"})
	}
	return c.JSON(user)
}

func (h *AdminHandler) SuspendUser(c *fiber.Ctx) error {
	adminID := middleware.GetUserID(c)
	userID := c.Params("id")
	var req models.SuspendUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if err := h.userRepo.SuspendUser(c.Context(), userID, req.Reason); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to suspend user"})
	}
	h.audit(adminID, "moderation.user_suspended", "user", userID, map[string]any{"reason": req.Reason})
	return c.JSON(fiber.Map{"message": "User suspended"})
}

func (h *AdminHandler) UnsuspendUser(c *fiber.Ctx) error {
	adminID := middleware.GetUserID(c)
	userID := c.Params("id")
	if err := h.userRepo.UnsuspendUser(c.Context(), userID); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to unsuspend user"})
	}
	h.audit(adminID, "moderation.user_unsuspended", "user", userID, nil)
	return c.JSON(fiber.Map{"message": "User unsuspended"})
}

func (h *AdminHandler) hideTarget(ctx context.Context, targetType, targetID, reason string) error {
	switch targetType {
	case "comment":
		return h.communityRepo.HideComment(ctx, targetID, reason)
	case "review":
		return h.communityRepo.HideReview(ctx, targetID, reason)
	default:
		return fmt.Errorf("hide is only supported for comment and review reports")
	}
}

func (h *AdminHandler) unhideTarget(ctx context.Context, targetType, targetID string) error {
	switch targetType {
	case "comment":
		return h.communityRepo.UnhideComment(ctx, targetID)
	case "review":
		return h.communityRepo.UnhideReview(ctx, targetID)
	default:
		return fmt.Errorf("unhide is only supported for comment and review reports")
	}
}

func (h *AdminHandler) audit(actorID, action, resourceType, resourceID string, details map[string]any) {
	if h.auditRepo == nil {
		return
	}
	var actorPtr *string
	var resourcePtr *string
	if actorID != "" {
		actorPtr = &actorID
	}
	if resourceID != "" {
		resourcePtr = &resourceID
	}
	_ = h.auditRepo.LogAction(context.Background(), actorPtr, action, resourceType, resourcePtr, details)
}