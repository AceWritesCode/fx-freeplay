export interface CategoryStorageSummary {
  id: string;
  name: string;
  description: string;
  type: 'market_data' | 'drawings' | 'watchlist' | 'workspace_layout' | 'settings' | 'drawing_templates' | 'local_storage';
  recordCount: number;
  estimatedSizeBytes: number;
  lastModified?: number;
}

export interface StorageRecordItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  sizeBytes: number;
  lastModified?: number;
  metadata?: Record<string, any>;
}

export interface DataManagementRepository {
  /** Inspect all app-owned IndexedDB stores and LocalStorage keys and calculate record counts, byte sizes, and metadata. */
  getStorageOverview(): Promise<CategoryStorageSummary[]>;

  /** Fetch paginated records for a specific category detail view. */
  getCategoryRecords(
    categoryId: string,
    page?: number,
    pageSize?: number,
    searchQuery?: string
  ): Promise<{ items: StorageRecordItem[]; totalCount: number }>;

  /** Delete an individual record by ID within a category. */
  deleteRecord(categoryId: string, recordId: string): Promise<void>;

  /** Delete a batch of records by ID within a category. */
  deleteCategoryRecords(categoryId: string, recordIds: string[]): Promise<void>;

  /** Clear an entire storage category. */
  clearCategory(categoryId: string): Promise<void>;

  /** Perform a full factory reset: wipe IndexedDB, LocalStorage, and return clean application state. */
  performFactoryReset(): Promise<void>;
}
