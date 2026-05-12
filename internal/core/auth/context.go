package auth

// import "context"

// type ctxKey struct{}

// // Principal is the authenticated caller's identity carried through ctx.
// type Principal struct {
// 	UserID   uint64
// }

// func (p *Principal) HasPerm(key string) bool {
// 	if p == nil || p.Perms == nil {
// 		return false
// 	}
// 	_, ok := p.Perms[key]
// 	return ok
// }

// func WithPrincipal(ctx context.Context, p *Principal) context.Context {
// 	return context.WithValue(ctx, ctxKey{}, p)
// }

// func FromContext(ctx context.Context) (*Principal, bool) {
// 	p, ok := ctx.Value(ctxKey{}).(*Principal)
// 	return p, ok && p != nil
// }
