package employee

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

const selectCols = `id, tenant_id, employee_code, first_name, last_name, email, phone,
    date_of_birth, gender, joining_date, employment_type,
    department_id, designation_id, location_id, manager_id, user_id,
    status, created_at, updated_at`

func scan(row pgx.Row, e *Employee) error {
	return row.Scan(
		&e.ID, &e.TenantID, &e.EmployeeCode,
		&e.FirstName, &e.LastName, &e.Email, &e.Phone,
		&e.DateOfBirth, &e.Gender, &e.JoiningDate, &e.EmploymentType,
		&e.DepartmentID, &e.DesignationID, &e.LocationID, &e.ManagerID, &e.UserID,
		&e.Status, &e.CreatedAt, &e.UpdatedAt,
	)
}

func (r *Repo) Get(ctx context.Context, tenantID, id int64) (*Employee, error) {
	e := &Employee{}
	err := scan(r.Pool.QueryRow(ctx, `
        SELECT `+selectCols+`
        FROM employees
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `, tenantID, id), e)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return e, nil
}

// BatchByIDs returns the rows whose ids are in `ids` for this tenant. Order
// is unspecified — callers (dataloaders) must reindex by id.
func (r *Repo) BatchByIDs(ctx context.Context, tenantID int64, ids []int64) ([]Employee, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.Pool.Query(ctx, `
        SELECT `+selectCols+`
        FROM employees
        WHERE tenant_id = $1 AND id = ANY($2) AND status <> 'deleted'
    `, tenantID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Employee
	for rows.Next() {
		var e Employee
		if err := scan(rows, &e); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, tenantID int64, in CreateInput) (*Employee, error) {
	var id int64
	if err := r.Pool.QueryRow(ctx, `
        INSERT INTO employees (
            tenant_id, employee_code, first_name, last_name, email, phone,
            date_of_birth, gender, joining_date, employment_type,
            department_id, designation_id, location_id, manager_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14
        )
        RETURNING id
    `,
		tenantID, in.EmployeeCode, in.FirstName, in.LastName, in.Email, in.Phone,
		in.DateOfBirth, in.Gender, in.JoiningDate, in.EmploymentType,
		in.DepartmentID, in.DesignationID, in.LocationID, in.ManagerID,
	).Scan(&id); err != nil {
		return nil, err
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Employee, error) {
	res, err := r.Pool.Exec(ctx, `
        UPDATE employees
        SET employee_code   = COALESCE($3,  employee_code),
            first_name      = COALESCE($4,  first_name),
            last_name       = COALESCE($5,  last_name),
            email           = COALESCE($6,  email),
            phone           = COALESCE($7,  phone),
            date_of_birth   = COALESCE($8,  date_of_birth),
            gender          = COALESCE($9,  gender),
            joining_date    = COALESCE($10, joining_date),
            employment_type = COALESCE($11, employment_type),
            department_id   = COALESCE($12, department_id),
            designation_id  = COALESCE($13, designation_id),
            location_id     = COALESCE($14, location_id),
            manager_id      = COALESCE($15, manager_id),
            status          = COALESCE($16, status)
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `,
		tenantID, id,
		in.EmployeeCode, in.FirstName, in.LastName, in.Email, in.Phone,
		in.DateOfBirth, in.Gender, in.JoiningDate, in.EmploymentType,
		in.DepartmentID, in.DesignationID, in.LocationID, in.ManagerID,
		in.Status,
	)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, nil
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) SoftDelete(ctx context.Context, tenantID, id int64) error {
	_, err := r.Pool.Exec(ctx, `
        UPDATE employees SET status = 'deleted'
        WHERE tenant_id = $1 AND id = $2
    `, tenantID, id)
	return err
}

// FindUserByEmail looks up a user row by email within the same tenant.
// Returns 0 if not found.
func (r *Repo) FindUserByEmail(ctx context.Context, tenantID int64, email string) (int64, error) {
	var uid int64
	err := r.Pool.QueryRow(ctx, `
        SELECT id FROM users
        WHERE tenant_id = $1 AND email = $2 AND status = 'active'
    `, tenantID, email).Scan(&uid)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return uid, nil
}

// CreateUser inserts a new user row with a random temporary password hash.
// The user can reset their password via a future "invite" or "set password" flow.
// Returns the new user ID.
func (r *Repo) CreateUser(ctx context.Context, tenantID int64, email string) (int64, error) {
	var uid int64
	// Use a bcrypt hash of a random placeholder — the user cannot log in with
	// this; they will need a password-reset / invite flow. The placeholder
	// ensures the password_hash NOT NULL constraint is satisfied.
	placeholder := "$2a$10$placeholder.not.a.real.hash.000000000000000000000000"
	err := r.Pool.QueryRow(ctx, `
        INSERT INTO users (tenant_id, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
    `, tenantID, email, placeholder).Scan(&uid)
	return uid, err
}

// SetUserID links the employee to a user account.
func (r *Repo) SetUserID(ctx context.Context, tenantID, employeeID, userID int64) error {
	_, err := r.Pool.Exec(ctx, `
        UPDATE employees SET user_id = $3
        WHERE tenant_id = $1 AND id = $2
    `, tenantID, employeeID, userID)
	return err
}

// IsDescendant returns true if candidateID lives anywhere in the management
// subtree rooted at rootID (inclusive). Used by the service to reject
// manager assignments that would close a cycle in the reporting graph.
func (r *Repo) IsDescendant(ctx context.Context, tenantID, rootID, candidateID int64) (bool, error) {
	var exists bool
	err := r.Pool.QueryRow(ctx, `
        WITH RECURSIVE sub AS (
            SELECT id FROM employees WHERE tenant_id = $1 AND id = $2
            UNION
            SELECT e.id FROM employees e
            JOIN sub ON e.manager_id = sub.id
            WHERE e.tenant_id = $1
        )
        SELECT EXISTS (SELECT 1 FROM sub WHERE id = $3)
    `, tenantID, rootID, candidateID).Scan(&exists)
	return exists, err
}

// List runs the directory query: tenant + filter + cursor + sort. Returns
// at most `limit` rows plus a HasNext flag (we fetch limit+1 internally and
// drop the sentinel).
func (r *Repo) List(ctx context.Context, tenantID int64, f Filter, sort Sort, limit int, after string) (Page, error) {
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}

	conds := []string{"tenant_id = $1", "status <> 'deleted'"}
	args := []any{tenantID}

	addArg := func(v any) int {
		args = append(args, v)
		return len(args)
	}

	if f.Search != nil && *f.Search != "" {
		n := addArg("%" + *f.Search + "%")
		conds = append(conds, fmt.Sprintf(
			"(first_name ILIKE $%d OR last_name ILIKE $%d OR email ILIKE $%d OR employee_code ILIKE $%d)",
			n, n, n, n,
		))
	}
	if f.Status != nil {
		conds = append(conds, fmt.Sprintf("status = $%d", addArg(*f.Status)))
	}
	if f.DepartmentID != nil {
		conds = append(conds, fmt.Sprintf("department_id = $%d", addArg(*f.DepartmentID)))
	}
	if f.DesignationID != nil {
		conds = append(conds, fmt.Sprintf("designation_id = $%d", addArg(*f.DesignationID)))
	}
	if f.LocationID != nil {
		conds = append(conds, fmt.Sprintf("location_id = $%d", addArg(*f.LocationID)))
	}
	if f.ManagerID != nil {
		conds = append(conds, fmt.Sprintf("manager_id = $%d", addArg(*f.ManagerID)))
	}

	// Total count uses the same WHERE without the cursor predicate.
	totalSQL := "SELECT COUNT(*) FROM employees WHERE " + strings.Join(conds, " AND ")
	var total int
	if err := r.Pool.QueryRow(ctx, totalSQL, args...).Scan(&total); err != nil {
		return Page{}, err
	}

	// Cursor predicate, if any.
	if after != "" {
		c, err := decodeCursor(after)
		if err != nil {
			return Page{}, err
		}
		_, cmpExpr, bindKey := sortSQL(sort)
		if bindKey {
			kPos := addArg(c.K)
			iPos := addArg(c.I)
			conds = append(conds, fmt.Sprintf(cmpExpr, kPos, iPos))
		} else {
			iPos := addArg(c.I)
			conds = append(conds, fmt.Sprintf(cmpExpr, iPos))
		}
	}

	orderBy, _, _ := sortSQL(sort)
	limitArg := addArg(limit + 1) // fetch one extra to detect HasNext

	listSQL := "SELECT " + selectCols + " FROM employees WHERE " +
		strings.Join(conds, " AND ") + " " + orderBy + " LIMIT $" + strconv.Itoa(limitArg)

	rows, err := r.Pool.Query(ctx, listSQL, args...)
	if err != nil {
		return Page{}, err
	}
	defer rows.Close()

	items := make([]Employee, 0, limit+1)
	for rows.Next() {
		var e Employee
		if err := scan(rows, &e); err != nil {
			return Page{}, err
		}
		items = append(items, e)
	}
	if err := rows.Err(); err != nil {
		return Page{}, err
	}

	page := Page{TotalCount: total, HasPrev: after != ""}
	if len(items) > limit {
		page.HasNext = true
		items = items[:limit]
	}
	page.Items = items
	if len(items) > 0 {
		page.StartCursor = cursorFor(items[0], sort).encode()
		page.EndCursor = cursorFor(items[len(items)-1], sort).encode()
	}
	return page, nil
}
