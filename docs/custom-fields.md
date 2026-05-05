# Custom Fields (EAV)

## Why
Tenants need to extend the `Employee` (and other) entities without DDL changes. The schema models this as a classic Entity-Attribute-Value (EAV) overlay.

## Tables (recap)
- `custom_forms` — a named group of fields per `module` (`employee`, `department`, ...).
- `custom_fields` — a field definition belonging to a form.
- `custom_field_options` — value/label pairs for `select`/`multiselect`.
- `custom_field_values` — actual values, polymorphic by `(entity_type, entity_id)`.
- `field_permissions` — per-role visibility/edit on a field.

## Data type handling
| `data_type` | Storage column | Notes |
|---|---|---|
| `text` | `value_text` | trimmed, validated by `validation.maxLen` |
| `number` | `value_number` | `validation.min/max` |
| `date` | `value_date` | ISO-8601 |
| `boolean` | `value_text` (`'true'`/`'false'`) | consider adding `value_bool` |
| `select` | `value_text` (= `option_value`) | enforced against `custom_field_options` |
| `multiselect` | `value_json` (string[]) | each entry must match `option_value` |
| `json` | `value_json` | validated against `validation.schema` (JSON Schema) |

`validation_json` shape examples:
```json
// text
{ "minLen": 1, "maxLen": 50, "pattern": "^[A-Z]{3}-[0-9]{4}$" }
// number
{ "min": 0, "max": 1000, "integer": true }
// json
{ "schema": { "type": "object", "required": ["a"], "properties": { "a": { "type": "string" } } } }
```

## Caching the form definition
- Key: `customforms:{tenantID}:{module}` → list of forms with fields, options.
- TTL 10m; invalidated on any write to forms/fields/options.
- Read-heavy: every employee profile load needs it.

## Reading values
1. Resolve the relevant `custom_form` for the entity's module.
2. Batch-load `custom_field_values` for `(entity_type, entity_id)` via a dataloader.
3. Filter fields the caller can't `view` (intersect with `field_permissions`).
4. Map storage column → `CustomFieldValue` GraphQL type.

## Writing values (`setCustomFieldValues`)
- Single mutation accepts an array — we replace or upsert per `(entity_id, field_id)`.
- Validate per `data_type` and `validation_json`.
- For `select`/`multiselect`, ensure every value is in `custom_field_options`.
- Perform inside a transaction; record one audit row with the diff of changed values.

## Permissions
- Coarse: caller must hold `employee.write` (or whichever resource owns the entity) to call `setCustomFieldValues`.
- Fine: skip fields where `field_permissions(role, field).can_edit = false`. Treat absence of a row as "default allowed" only for the system Admin role; for everyone else, default deny on edit.
- Reads: filter out fields where `can_view = false`.

## Frontend rendering
`<DynamicForm>`:
1. Fetch form definition (cached).
2. Fetch existing values.
3. For each field render the right ShadCN input by `dataType`.
4. Build a Zod schema dynamically:
   - merge `validation_json` constraints
   - require if `is_required`
5. Submit calls `setCustomFieldValues` with all current values; backend computes diff.

Field renderer hints for ShadCN:
- `text` → `<Input>` or `<Textarea>` if `maxLen > 200`.
- `select` → `<Select>` with options.
- `multiselect` → `<Combobox multiple>`.
- `boolean` → `<Switch>`.
- `date` → `<Popover>` + `<Calendar>` + `<Input readonly>`.
- `json` → `<Textarea>` with `try { JSON.parse } catch` validation on blur.

## Performance notes
- Page that lists 50 employees with 10 custom fields each = 500 value rows. Keep the dataloader batch wide (`IN (entity_ids)` with `field_id IN (...)`).
- Index `(tenant_id, entity_type, entity_id)` is critical.
- For very large tenants, consider denormalising "frequently filtered" custom fields into a JSONB column on `employees` — phase 3 optimisation, not M4.

## Migration / housekeeping
- Deactivating a field should set its `status = 'inactive'` and stop showing it on forms but **must not** delete values; allow restoration.
- Renaming `field_key` is forbidden once values exist — UI should disable the input. Rename `field_label` freely.
