"use client"

import { type Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

export type FilterOption = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export type FilterableColumn = {
  columnId: string
  title: string
  options: FilterOption[]
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filterableColumns?: FilterableColumn[]
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Filter...",
  filterableColumns = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterableColumns.map((fc) => {
          const column = table.getColumn(fc.columnId)
          if (!column) return null
          return (
            <DataTableFacetedFilter
              key={fc.columnId}
              column={column}
              title={fc.title}
              options={fc.options}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
