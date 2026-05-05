CREATE TABLE "tenants" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(255) NOT NULL UNIQUE,
    "status" VARCHAR(255) DEFAULT 'active',
    "city_id" INTEGER,
    "legal_name" VARCHAR(255)
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_users_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN DEFAULT FALSE,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_roles_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "permissions" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(255) NOT NULL UNIQUE,
  "description" TEXT
);
CREATE TABLE "role_permissions" (
  "role_id" BIGINT PRIMARY KEY,
  "permission_id" BIGINT PRIMARY KEY,
  CONSTRAINT "fk_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id"),
  CONSTRAINT "fk_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id")
);
CREATE TABLE "user_roles" (
  "user_id" BIGINT PRIMARY KEY UNIQUE,
  "role_id" BIGINT PRIMARY KEY,
  CONSTRAINT "fk_user_roles_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id"),
  CONSTRAINT "fk_user_roles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
CREATE TABLE "departments" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(255),
  "parent_id" BIGINT,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_departments_parent_id" FOREIGN KEY ("parent_id") REFERENCES "departments"("id"),
  CONSTRAINT "fk_departments_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "designations" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "level" INTEGER,
  "department_id" BIGINT,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_designations_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id"),
  CONSTRAINT "fk_designations_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "countries" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "iso_code" VARCHAR(255) UNIQUE,
  "status" VARCHAR(255) DEFAULT 'active'
);
CREATE TABLE "states" (
  "id" SERIAL PRIMARY KEY,
  "country_id" BIGINT,
  "name" VARCHAR(255) NOT NULL,
  CONSTRAINT "fk_states_country_id" FOREIGN KEY ("country_id") REFERENCES "countries"("id")
);
CREATE TABLE "cities" (
  "id" SERIAL PRIMARY KEY,
  "state_id" BIGINT,
  "name" VARCHAR(255) NOT NULL,
  CONSTRAINT "fk_cities_state_id" FOREIGN KEY ("state_id") REFERENCES "states"("id"),
  CONSTRAINT "fk_cities_id" FOREIGN KEY ("id") REFERENCES "tenants"("city_id")
);
CREATE TABLE "locations" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "address_line1" TEXT,
  "address_line2" TEXT,
  "country_id" BIGINT,
  "state_id" BIGINT,
  "city_id" BIGINT,
  "pincode" VARCHAR(255),
  "timezone" VARCHAR(255),
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_locations_city_id" FOREIGN KEY ("city_id") REFERENCES "cities"("id"),
  CONSTRAINT "fk_locations_state_id" FOREIGN KEY ("state_id") REFERENCES "states"("id"),
  CONSTRAINT "fk_locations_country_id" FOREIGN KEY ("country_id") REFERENCES "countries"("id"),
  CONSTRAINT "fk_locations_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "employees" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "employee_code" VARCHAR(255) NOT NULL,
  "first_name" VARCHAR(255),
  "last_name" VARCHAR(255),
  "email" VARCHAR(255),
  "phone" VARCHAR(255),
  "date_of_birth" DATE,
  "gender" VARCHAR(255),
  "joining_date" DATE NOT NULL,
  "employment_type" VARCHAR(255),
  "department_id" BIGINT,
  "designation_id" BIGINT,
  "location_id" BIGINT,
  "manager_id" BIGINT,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_employees_manager_id" FOREIGN KEY ("manager_id") REFERENCES "employees"("id"),
  CONSTRAINT "fk_employees_location_id" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
  CONSTRAINT "fk_employees_designation_id" FOREIGN KEY ("designation_id") REFERENCES "designations"("id"),
  CONSTRAINT "fk_employees_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id"),
  CONSTRAINT "fk_employees_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "custom_forms" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "module" VARCHAR(255) NOT NULL,
  "display_order" INTEGER DEFAULT 0,
  "is_system" BOOLEAN DEFAULT FALSE,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_custom_forms_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "custom_fields" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "form_id" BIGINT NOT NULL,
  "field_key" VARCHAR(255) NOT NULL,
  "field_label" VARCHAR(255),
  "data_type" VARCHAR(255) NOT NULL,
  "is_required" BOOLEAN DEFAULT FALSE,
  "display_order" INTEGER DEFAULT 0,
  "status" VARCHAR(255) DEFAULT 'active',
  "validation_json" JSONB,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_custom_fields_form_id" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id"),
  CONSTRAINT "fk_custom_fields_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
);
CREATE TABLE "custom_field_options" (
  "id" SERIAL PRIMARY KEY,
  "field_id" BIGINT,
  "option_value" VARCHAR(255),
  "option_label" VARCHAR(255),
  "status" VARCHAR(255) DEFAULT 'active',
  CONSTRAINT "fk_custom_field_options_field_id" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id")
);
CREATE TABLE "custom_field_values" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "entity_type" VARCHAR(255) NOT NULL,
  "entity_id" BIGINT NOT NULL,
  "field_id" BIGINT,
  "value_text" TEXT,
  "value_number" NUMERIC,
  "value_date" DATE,
  "value_json" JSONB,
  "status" VARCHAR(255) DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_custom_field_values_field_id" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id")
);
CREATE TABLE "field_permissions" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "role_id" BIGINT,
  "field_id" BIGINT,
  "can_view" BOOLEAN DEFAULT TRUE,
  "can_edit" BOOLEAN DEFAULT FALSE,
  CONSTRAINT "fk_field_permissions_field_id" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id"),
  CONSTRAINT "fk_field_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id")
);
CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" BIGINT NOT NULL,
  "entity_type" VARCHAR(255),
  "entity_id" BIGINT,
  "action" VARCHAR(255),
  "changed_by" BIGINT,
  "old_data" JSONB,
  "new_data" JSONB,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);