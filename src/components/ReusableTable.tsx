import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  getSortValue?: (item: T) => string | number | boolean;
  className?: string;
}

export interface FilterDef<T> {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  filterFn: (item: T, value: string) => boolean;
}

interface ReusableTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFields?: (item: T) => string[];
  filters?: FilterDef<T>[];
  emptyMessage?: string;
  initialSort?: {
    columnId: string;
    direction: 'asc' | 'desc';
  };
  rowsPerPageOptions?: number[];
}

export function ReusableTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Cari data...',
  searchFields,
  filters = [],
  emptyMessage = 'Data tidak ditemukan.',
  initialSort,
  rowsPerPageOptions = [5, 10, 20],
}: ReusableTableProps<T>) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | undefined>(initialSort?.columnId);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | undefined>(initialSort?.direction);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [showFilters, setShowFilters] = useState(false);

  // Handle Sort Toggle
  const handleSort = (columnId: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(undefined);
        setSortDirection(undefined);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filter & Search Logic
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Search filter
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (searchFields) {
          return searchFields(item).some((field) =>
            field.toLowerCase().includes(query)
          );
        }
        // Fallback: search across all columns or stringify
        return JSON.stringify(item).toLowerCase().includes(query);
      });
    }

    // 2. Custom drop-down filters
    (Object.entries(selectedFilters) as [string, string][]).forEach(([filterId, filterVal]) => {
      if (filterVal && filterVal !== 'all') {
        const filterDef = filters.find((f) => f.id === filterId);
        if (filterDef) {
          result = result.filter((item) => filterDef.filterFn(item, filterVal));
        }
      }
    });

    // 3. Sorting
    if (sortColumn && sortDirection) {
      const activeCol = columns.find((c) => c.id === sortColumn);
      if (activeCol && activeCol.getSortValue) {
        result.sort((a, b) => {
          const valA = activeCol.getSortValue!(a);
          const valB = activeCol.getSortValue!(b);

          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          
          if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            const numA = valA ? 1 : 0;
            const numB = valB ? 1 : 0;
            return sortDirection === 'asc' ? numA - numB : numB - numA;
          }

          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          
          if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
          if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, searchTerm, selectedFilters, sortColumn, sortDirection, columns, searchFields, filters]);

  // Pagination Logic
  const totalRows = processedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIdx, startIdx + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setSearchTerm('');
    setSortColumn(undefined);
    setSortDirection(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || Object.values(selectedFilters).some(v => v !== 'all' && v !== '') || sortColumn !== undefined;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
      {/* Search & Action Bar */}
      <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#046A38] focus:border-[#046A38] transition-all outline-none text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showFilters || Object.values(selectedFilters).some(v => v !== 'all' && v !== '')
                  ? 'bg-[#E6F4EC] border-emerald-200 text-[#046A38]'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filter</span>
            </button>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-[#B8941F] hover:text-[#046A38] font-bold transition-all underline px-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* Expandable filters */}
        {showFilters && filters.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 mt-1">
            {filters.map((filter) => (
              <div key={filter.id} className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">{filter.label}</label>
                <div className="relative">
                  <select
                    value={selectedFilters[filter.id] || 'all'}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full pl-2 pr-6 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] font-medium text-gray-700 outline-none focus:ring-1 focus:ring-[#046A38] focus:border-[#046A38] appearance-none"
                  >
                    <option value="all">Semua</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={11} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id, col.sortable)}
                  className={`px-3 py-2.5 text-[10px] font-bold uppercase text-gray-500 tracking-wider transition-all select-none ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-700' : ''
                  } ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className={`transition-all ${sortColumn === col.id ? 'text-[#046A38]' : 'text-gray-300'}`}>
                        <ArrowUpDown size={11} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-gray-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-3 py-2.5 text-xs text-gray-700 font-medium ${col.className || ''}`}
                    >
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Tampilkan:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-600 outline-none"
            >
              {rowsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-medium text-gray-500">
            {Math.min((currentPage - 1) * rowsPerPage + 1, totalRows)}-{Math.min(currentPage * rowsPerPage, totalRows)} dari {totalRows}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1 rounded border transition-all ${
                currentPage === 1
                  ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft size={12} />
            </button>
            
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Only show a subset of pages if too many (e.g. first, current, last)
                const isNearCurrent = Math.abs(pageNum - currentPage) <= 1;
                const isFirstOrLast = pageNum === 1 || pageNum === totalPages;

                if (!isNearCurrent && !isFirstOrLast) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-[10px] text-gray-300">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-5 w-5 rounded flex items-center justify-center font-bold text-[10px] transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#046A38] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1 rounded border transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
