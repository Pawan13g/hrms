package employee

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
)

// cursor is the opaque pagination token. `K` is the sort key value as text
// (empty for id-only sorts); `I` is the row id used as the deterministic
// tiebreaker. Encoded as base64-JSON so the wire format stays small but
// inspectable in tests.
type cursor struct {
	K string `json:"k,omitempty"`
	I int64  `json:"i"`
}

func (c cursor) encode() string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeCursor(s string) (cursor, error) {
	var c cursor
	if s == "" {
		return c, errors.New("empty cursor")
	}
	raw, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return c, errors.New("malformed cursor")
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return c, errors.New("malformed cursor payload")
	}
	return c, nil
}

// cursorFor builds the cursor that points just past `e` for the given sort.
func cursorFor(e Employee, s Sort) cursor {
	switch s {
	case SortNameAsc, SortNameDesc:
		return cursor{K: nameKey(e.FirstName, e.LastName), I: e.ID}
	case SortJoiningAsc, SortJoiningDesc:
		return cursor{K: e.JoiningDate.UTC().Format("2006-01-02"), I: e.ID}
	default: // SortCreatedDesc / SortCreatedAsc — id is the natural key
		return cursor{K: strconv.FormatInt(e.ID, 10), I: e.ID}
	}
}

func nameKey(first, last *string) string {
	var f, l string
	if first != nil {
		f = *first
	}
	if last != nil {
		l = *last
	}
	return lowerASCII(f) + " " + lowerASCII(l)
}

// lowerASCII matches LOWER() in Postgres for ASCII inputs (the only locale
// our test fixtures cover today). For non-ASCII collations we'd need to
// align this with the collation Postgres uses on the column.
func lowerASCII(s string) string {
	out := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		out[i] = c
	}
	return string(out)
}

// sortSQL returns the ORDER BY clause and the cursor-comparison expression
// for the given sort. The comparison expression takes two placeholders that
// the caller binds in order: $kPos, $iPos.
//
// Outputs:
//   - orderBy: e.g. "ORDER BY id DESC"
//   - cmpExpr: e.g. "id < $5" or "(joining_date, id) > ($5::date, $6)"
//   - bindKey: whether $kPos is needed (false for id-only sorts)
func sortSQL(s Sort) (orderBy, cmpExpr string, bindKey bool) {
	switch s {
	case SortCreatedAsc:
		return "ORDER BY id ASC", "id > $%d", false
	case SortNameAsc:
		expr := "(COALESCE(LOWER(first_name),'') || ' ' || COALESCE(LOWER(last_name),''))"
		return "ORDER BY " + expr + " ASC, id ASC",
			"(" + expr + ", id) > ($%d, $%d)", true
	case SortNameDesc:
		expr := "(COALESCE(LOWER(first_name),'') || ' ' || COALESCE(LOWER(last_name),''))"
		return "ORDER BY " + expr + " DESC, id DESC",
			"(" + expr + ", id) < ($%d, $%d)", true
	case SortJoiningAsc:
		return "ORDER BY joining_date ASC, id ASC",
			"(joining_date, id) > ($%d::date, $%d)", true
	case SortJoiningDesc:
		return "ORDER BY joining_date DESC, id DESC",
			"(joining_date, id) < ($%d::date, $%d)", true
	default: // SortCreatedDesc
		return "ORDER BY id DESC", "id < $%d", false
	}
}

