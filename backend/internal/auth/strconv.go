package auth

import "strconv"

func itoa(n int64) string         { return strconv.FormatInt(n, 10) }
func atoi(s string) (int64, error) { return strconv.ParseInt(s, 10, 64) }
