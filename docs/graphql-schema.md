# GraphQL Schema — Employee Module

Schema is split into one `.graphqls` per domain and stitched by gqlgen. This doc shows the consolidated shape.

## Scalars & shared types
```graphql
scalar Time
scalar Date
scalar JSON

interface Node { id: ID! }

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

enum Status { ACTIVE INACTIVE DELETED }

directive @hasPermission(key: String!) on FIELD_DEFINITION
directive @auth on FIELD_DEFINITION
```

## Identity
```graphql
type Tenant implements Node {
  id: ID!
  name: String!
  code: String!
  legalName: String
  status: Status!
  city: City
  createdAt: Time!
  updatedAt: Time!
}

type User implements Node {
  id: ID!
  email: String!
  isActive: Boolean!
  status: Status!
  roles: [Role!]!
}

type Role implements Node {
  id: ID!
  name: String!
  description: String
  isSystem: Boolean!
  permissions: [Permission!]!
}

type Permission { id: ID! key: String! description: String }

type Me {
  user: User!
  tenant: Tenant!
  permissions: [String!]!
}

extend type Query {
  me: Me! @auth
  roles: [Role!]! @hasPermission(key: "role.read")
  permissions: [Permission!]! @hasPermission(key: "role.read")
}

extend type Mutation {
  createRole(input: CreateRoleInput!): Role! @hasPermission(key: "role.write")
  updateRolePermissions(roleId: ID!, permissionKeys: [String!]!): Role! @hasPermission(key: "role.write")
  assignRole(userId: ID!, roleId: ID!): User! @hasPermission(key: "role.write")
}

input CreateRoleInput { name: String!, description: String, permissionKeys: [String!]! }
```

## Org structure
```graphql
type Department implements Node {
  id: ID!
  name: String!
  code: String
  parent: Department
  children: [Department!]!
  status: Status!
  designations: [Designation!]!
}

type Designation implements Node {
  id: ID!
  title: String!
  level: Int
  department: Department
  status: Status!
}

type Country { id: ID! name: String!, isoCode: String, states: [State!]! }
type State { id: ID! name: String!, country: Country! }
type City { id: ID! name: String!, state: State! }

type Location implements Node {
  id: ID!
  name: String!
  addressLine1: String
  addressLine2: String
  country: Country
  state: State
  city: City
  pincode: String
  timezone: String
  status: Status!
}

extend type Query {
  departments: [Department!]! @hasPermission(key: "org.read")
  department(id: ID!): Department @hasPermission(key: "org.read")
  designations(departmentId: ID): [Designation!]! @hasPermission(key: "org.read")
  locations: [Location!]! @hasPermission(key: "org.read")
  countries: [Country!]!
  states(countryId: ID!): [State!]!
  cities(stateId: ID!): [City!]!
}

extend type Mutation {
  createDepartment(input: DepartmentInput!): Department! @hasPermission(key: "org.write")
  updateDepartment(id: ID!, input: DepartmentInput!): Department! @hasPermission(key: "org.write")
  createDesignation(input: DesignationInput!): Designation! @hasPermission(key: "org.write")
  createLocation(input: LocationInput!): Location! @hasPermission(key: "org.write")
}

input DepartmentInput { name: String!, code: String, parentId: ID }
input DesignationInput { title: String!, level: Int, departmentId: ID }
input LocationInput {
  name: String!, addressLine1: String, addressLine2: String,
  countryId: ID, stateId: ID, cityId: ID, pincode: String, timezone: String
}
```

## Employee
```graphql
enum Gender { MALE FEMALE OTHER UNDISCLOSED }
enum EmploymentType { FULL_TIME PART_TIME CONTRACT INTERN }

type Employee implements Node {
  id: ID!
  employeeCode: String!
  firstName: String
  lastName: String
  fullName: String!            # computed
  email: String
  phone: String
  dateOfBirth: Date
  gender: Gender
  joiningDate: Date!
  employmentType: EmploymentType
  department: Department
  designation: Designation
  location: Location
  manager: Employee
  directReports: [Employee!]!
  status: Status!
  customFieldValues: [CustomFieldValue!]!
  createdAt: Time!
  updatedAt: Time!
}

type EmployeeEdge { node: Employee!, cursor: String! }
type EmployeeConnection {
  edges: [EmployeeEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

input EmployeeFilter {
  search: String                # name / email / code
  departmentIds: [ID!]
  designationIds: [ID!]
  locationIds: [ID!]
  managerId: ID
  employmentTypes: [EmploymentType!]
  status: Status
}

enum EmployeeSortField { JOINING_DATE NAME CODE CREATED_AT }
input EmployeeSort { field: EmployeeSortField!, direction: SortDir! }
enum SortDir { ASC DESC }

extend type Query {
  employees(
    first: Int, after: String,
    filter: EmployeeFilter, sort: EmployeeSort
  ): EmployeeConnection! @hasPermission(key: "employee.read")
  employee(id: ID!): Employee @hasPermission(key: "employee.read")
}

input CreateEmployeeInput {
  employeeCode: String!
  firstName: String, lastName: String
  email: String, phone: String
  dateOfBirth: Date
  gender: Gender
  joiningDate: Date!
  employmentType: EmploymentType
  departmentId: ID, designationId: ID, locationId: ID, managerId: ID
}

input UpdateEmployeeInput {
  firstName: String, lastName: String
  email: String, phone: String
  dateOfBirth: Date
  gender: Gender
  employmentType: EmploymentType
  departmentId: ID, designationId: ID, locationId: ID, managerId: ID
}

extend type Mutation {
  createEmployee(input: CreateEmployeeInput!): Employee! @hasPermission(key: "employee.write")
  updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee! @hasPermission(key: "employee.write")
  deactivateEmployee(id: ID!): Employee! @hasPermission(key: "employee.write")
  reactivateEmployee(id: ID!): Employee! @hasPermission(key: "employee.write")
}
```

## Custom fields
```graphql
enum CustomFieldType { TEXT NUMBER DATE BOOLEAN SELECT MULTISELECT JSON }

type CustomForm implements Node {
  id: ID!
  name: String!
  module: String!
  isSystem: Boolean!
  displayOrder: Int!
  fields: [CustomField!]!
}

type CustomField implements Node {
  id: ID!
  form: CustomForm!
  fieldKey: String!
  fieldLabel: String
  dataType: CustomFieldType!
  isRequired: Boolean!
  displayOrder: Int!
  validation: JSON
  options: [CustomFieldOption!]!
}

type CustomFieldOption { id: ID! optionValue: String!, optionLabel: String }

type CustomFieldValue {
  id: ID!
  field: CustomField!
  valueText: String
  valueNumber: Float
  valueDate: Date
  valueJson: JSON
}

input CustomFieldValueInput {
  fieldId: ID!
  valueText: String, valueNumber: Float, valueDate: Date, valueJson: JSON
}

extend type Query {
  customForms(module: String!): [CustomForm!]! @hasPermission(key: "customfield.read")
  customForm(id: ID!): CustomForm @hasPermission(key: "customfield.read")
  customFieldValues(entityType: String!, entityId: ID!): [CustomFieldValue!]! @auth
}

extend type Mutation {
  createCustomForm(name: String!, module: String!): CustomForm! @hasPermission(key: "customfield.write")
  createCustomField(formId: ID!, input: CreateCustomFieldInput!): CustomField! @hasPermission(key: "customfield.write")
  setCustomFieldValues(entityType: String!, entityId: ID!, values: [CustomFieldValueInput!]!): [CustomFieldValue!]! @hasPermission(key: "employee.write")
  updateFieldPermission(fieldId: ID!, roleId: ID!, canView: Boolean!, canEdit: Boolean!): Boolean! @hasPermission(key: "customfield.write")
}

input CreateCustomFieldInput {
  fieldKey: String!, fieldLabel: String, dataType: CustomFieldType!,
  isRequired: Boolean, displayOrder: Int, validation: JSON,
  options: [CustomFieldOptionInput!]
}
input CustomFieldOptionInput { optionValue: String!, optionLabel: String }
```

## Audit
```graphql
type AuditLog {
  id: ID!
  entityType: String!
  entityId: ID!
  action: String!
  changedBy: User
  oldData: JSON
  newData: JSON
  createdAt: Time!
}

input AuditFilter {
  entityType: String, entityId: ID, action: String,
  changedById: ID, from: Time, to: Time
}

extend type Query {
  auditLogs(first: Int, after: String, filter: AuditFilter): [AuditLog!]! @hasPermission(key: "audit.read")
}
```

## Permission keys (registry seed)
```
employee.read, employee.write, employee.delete
org.read, org.write
role.read, role.write
customfield.read, customfield.write
audit.read
```
