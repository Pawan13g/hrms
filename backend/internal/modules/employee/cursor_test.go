package employee

import (
	"testing"
	"time"
)

func TestCursorRoundTrip(t *testing.T) {
	cases := []cursor{
		{K: "", I: 1},
		{K: "alice doe", I: 42},
		{K: "2026-05-04", I: 99},
	}
	for _, want := range cases {
		got, err := decodeCursor(want.encode())
		if err != nil {
			t.Fatalf("decode(%v): %v", want, err)
		}
		if got != want {
			t.Fatalf("got %+v, want %+v", got, want)
		}
	}
}

func TestDecodeCursorRejectsGarbage(t *testing.T) {
	for _, in := range []string{"", "not-base64!", "!!!"} {
		if _, err := decodeCursor(in); err == nil {
			t.Fatalf("decode(%q) should have failed", in)
		}
	}
}

func TestCursorForByCreated(t *testing.T) {
	e := Employee{ID: 7}
	c := cursorFor(e, SortCreatedDesc)
	if c.I != 7 || c.K != "7" {
		t.Fatalf("created cursor: got %+v", c)
	}
}

func TestCursorForByName(t *testing.T) {
	first, last := "Ada", "Lovelace"
	e := Employee{ID: 11, FirstName: &first, LastName: &last}
	c := cursorFor(e, SortNameAsc)
	if c.I != 11 || c.K != "ada lovelace" {
		t.Fatalf("name cursor: got %+v", c)
	}
}

func TestCursorForByJoining(t *testing.T) {
	e := Employee{ID: 5, JoiningDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)}
	c := cursorFor(e, SortJoiningDesc)
	if c.I != 5 || c.K != "2026-01-15" {
		t.Fatalf("joining cursor: got %+v", c)
	}
}

func TestSortSQLShape(t *testing.T) {
	for s := Sort(0); s <= SortJoiningAsc; s++ {
		ord, cmp, _ := sortSQL(s)
		if ord == "" || cmp == "" {
			t.Fatalf("sort %d returned empty SQL: ord=%q cmp=%q", s, ord, cmp)
		}
	}
}
