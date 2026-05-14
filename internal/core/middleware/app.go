package middleware

import (
	"github.com/gin-gonic/gin"
)

func RegisterAppMiddleware(
	r *gin.Engine,
) {
	r.Use(gin.Recovery())
}
