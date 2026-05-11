package auth

import "strconv"

func itoa(n uint64) string          { return strconv.FormatUint(n, 10) }
func atoi(s string) (uint64, error) { return strconv.ParseUint(s, 10, 64) }
