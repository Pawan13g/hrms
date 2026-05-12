package jwt

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Principal struct {
	UserID uint64
}

type Claims struct {
	TenantID uint64   `json:"tid"`
	Roles    []int64  `json:"roles,omitempty"`
	Perms    []string `json:"perms,omitempty"`
	JTI      string   `json:"jti,omitempty"`
	jwt.RegisteredClaims
}

type Issuer struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewIssuer(secret string, accessTTL, refreshTTL time.Duration) *Issuer {
	return &Issuer{secret: []byte(secret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

type TokenPair struct {
	Access     string
	Refresh    string
	RefreshJTI string
	AccessExp  time.Time
	RefreshExp time.Time
}

func (i *Issuer) Issue(userID uint64, refreshJTI string) (TokenPair, error) {
	now := time.Now().UTC()
	access, accessExp, err := i.signed(userID, "", now, i.accessTTL)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, refreshExp, err := i.signed(userID, refreshJTI, now, i.refreshTTL)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		Access:     access,
		Refresh:    refresh,
		RefreshJTI: refreshJTI,
		AccessExp:  accessExp,
		RefreshExp: refreshExp,
	}, nil
}

func (i *Issuer) signed(userID uint64, jti string, now time.Time, ttl time.Duration) (string, time.Time, error) {
	exp := now.Add(ttl)
	claims := Claims{
		JTI: jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   itoa(userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString(i.secret)
	return s, exp, err
}

func (i *Issuer) Parse(token string) (*Claims, error) {
	if token == "" {
		return nil, errors.New("empty token")
	}
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return i.secret, nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

// PrincipalFromClaims projects JWT claims into the request-scoped Principal.
func PrincipalFromClaims(c *Claims) (*Principal, error) {
	uid, err := atoi(c.Subject)
	if err != nil {
		return nil, err
	}
	perms := make(map[string]struct{}, len(c.Perms))
	for _, p := range c.Perms {
		perms[p] = struct{}{}
	}
	return &Principal{
		UserID: uid,
	}, nil
}

func itoa(n uint64) string          { return strconv.FormatUint(n, 10) }
func atoi(s string) (uint64, error) { return strconv.ParseUint(s, 10, 64) }
