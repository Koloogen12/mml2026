package service

import (
	"context"
	"encoding/json"
	"fmt"

	"mml-saas-backend/internal/dto"
	"mml-saas-backend/internal/model"
	"mml-saas-backend/internal/repository"
	"mml-saas-backend/pkg/logger"
	"mml-saas-backend/pkg/util"

	"github.com/google/uuid"
)

type WidgetEventService struct {
	repos *repository.Repositories
}

func NewWidgetEvent(repos *repository.Repositories) *WidgetEventService {
	return &WidgetEventService{repos: repos}
}

func (s *WidgetEventService) TrackEvents(ctx context.Context, req *dto.WidgetEventRequest, ip, userAgent string) error {
	projectPublicID, err := uuid.Parse(req.ProjectID)
	if err != nil {
		logger.Error("widget_event", "invalid project_id", "project_id", req.ProjectID, "error", err)
		return fmt.Errorf("invalid project_id: %w", err)
	}

	project, err := s.repos.Project.GetByPublicID(ctx, projectPublicID)
	if err != nil {
		logger.Error("widget_event", "get project failed", "project_id", req.ProjectID, "error", err)
		return fmt.Errorf("get project: %w", err)
	}
	if project == nil {
		logger.Warn("widget_event", "project not found", "project_id", req.ProjectID)
		return ErrProjectNotFound
	}

	// Resolve lead_id from session_token if possible
	var leadID *int64
	sessionToken, err := uuid.Parse(req.SessionToken)
	if err == nil {
		lead, err := s.repos.Lead.GetBySessionToken(ctx, sessionToken)
		if err != nil {
			logger.Warn("widget_event", "resolve lead failed", "session_token", req.SessionToken, "error", err)
		}
		if lead != nil {
			leadID = &lead.ID
		}
	}

	events := make([]*model.WidgetEvent, 0, len(req.Events))
	for _, e := range req.Events {
		eventData, _ := json.Marshal(e.EventData)

		events = append(events, &model.WidgetEvent{
			ProjectID:    project.ID,
			LeadID:       leadID,
			SessionToken: req.SessionToken,
			EventType:    e.EventType,
			EventData:    eventData,
			PageURL:      util.StrPtr(e.PageURL),
			IP:           ip,
			UserAgent:    userAgent,
		})
	}

	if err := s.repos.WidgetEvent.CreateBatch(ctx, events); err != nil {
		return err
	}
	return nil
}
