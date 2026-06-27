package controllers

import (
	"errors"
	"net/http"

	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// AISuggest handles POST /flows/ai — generate a flow graph from a prompt via LLM.
// Not implemented in FASE 0: the endpoint exists so the route is reserved and the
// frontend gets a deterministic 501 instead of a 404. The graph-generation logic
// lands in a later phase (LLM via tenant settings, per PipelineController.AISuggest).
//
// @Summary      Sugerir flow via IA (não implementado)
// @Tags         flows
// @Produce      json
// @Success      501  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/ai [post]
func (fc *FlowController) AISuggest(c *gin.Context) {
	if _, _, ok := auth.GetScoped(c, "Flows"); !ok {
		return
	}
	utils.RespondWithServiceError(c, http.StatusNotImplemented,
		errors.New("flows AI suggest not implemented"),
		"Flow AI suggestion is not implemented yet")
}

// Simulate handles POST /flows/:id/simulate — dry-run the graph in no-op mode and
// return the simulated trail. Not implemented in FASE 0 (no node execution this
// phase); returns 501 with the canonical error body.
//
// @Summary      Simular flow (não implementado)
// @Tags         flows
// @Produce      json
// @Param        flowId  path      int  true  "ID do flow"
// @Success      501     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/{flowId}/simulate [post]
func (fc *FlowController) Simulate(c *gin.Context) {
	if _, _, ok := auth.GetScoped(c, "Flows"); !ok {
		return
	}
	utils.RespondWithServiceError(c, http.StatusNotImplemented,
		errors.New("flows simulate not implemented"),
		"Flow simulation is not implemented yet")
}
