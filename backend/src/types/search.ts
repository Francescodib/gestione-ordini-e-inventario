/**
 * Search and Filtering Types
 * All types related to search functionality, filters, and autocomplete
 */

import { PaginationQuery } from './common';
import { ProductFilters } from './product';
import { CategoryFilters } from './category';
import { OrderFilters } from './order';
import { UserFilters } from './auth';

/**
 * Global search options
 */
export interface GlobalSearchOptions {
  q: string;
  entities?: SearchEntity[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: GlobalSearchFilters;
  includeInactive?: boolean;
  userRole?: string;
}

/**
 * Search entities that can be searched
 */
export type SearchEntity = 'products' | 'categories' | 'orders' | 'users';

/**
 * Global search filters
 */
export interface GlobalSearchFilters {
  dateFrom?: Date | string;
  dateTo?: Date | string;
  userId?: string;
  categoryId?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  type: SearchEntity;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
  highlights?: SearchHighlight[];
}

/**
 * Search highlighting
 */
export interface SearchHighlight {
  field: string;
  value: string;
  highlights: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Global search results
 */
export interface GlobalSearchResults {
  query: string;
  total: number;
  results: SearchResultItem[];
  facets: SearchFacets;
  suggestions: string[];
  executionTime: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Search facets for filtering
 */
export interface SearchFacets {
  entities: Array<{
    type: SearchEntity;
    count: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  priceRanges: Array<{
    min: number;
    max: number;
    count: number;
  }>;
  status: Array<{
    value: string;
    count: number;
  }>;
  dateRanges: Array<{
    range: string;
    from: Date;
    to: Date;
    count: number;
  }>;
}

/**
 * Search suggestions
 */
export interface SearchSuggestions {
  query: string;
  suggestions: Array<{
    text: string;
    type: 'completion' | 'correction' | 'popular';
    score: number;
    count?: number;
  }>;
  popular: string[];
  recent: string[];
}

/**
 * Autocomplete request
 */
export interface AutocompleteRequest {
  q: string;
  entity?: SearchEntity;
  limit?: number;
  includeMetadata?: boolean;
}

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  id: string;
  text: string;
  type: SearchEntity;
  metadata?: {
    category?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    [key: string]: any;
  };
  highlight?: string;
}

/**
 * Autocomplete response
 */
export interface AutocompleteResponse {
  query: string;
  results: AutocompleteResult[];
  total: number;
}

// Note: Search query interfaces are defined in their respective domain files
// to avoid naming conflicts. These are re-exported here for convenience.

/**
 * Advanced search query builder
 */
export interface SearchQueryBuilder {
  query: string;
  filters: SearchFilter[];
  sorts: SearchSort[];
  aggregations: SearchAggregation[];
  highlight: SearchHighlightConfig;
  pagination: {
    offset: number;
    limit: number;
  };
}

/**
 * Search filter
 */
export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'exists' | 'range';
  value: any;
  boost?: number;
}

/**
 * Search sort
 */
export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
  type?: 'string' | 'number' | 'date';
  missing?: 'first' | 'last';
}

/**
 * Search aggregation
 */
export interface SearchAggregation {
  name: string;
  type: 'terms' | 'range' | 'date_histogram' | 'stats' | 'cardinality';
  field: string;
  size?: number;
  ranges?: Array<{
    from?: number;
    to?: number;
    key?: string;
  }>;
  interval?: string;
}

/**
 * Search highlight configuration
 */
export interface SearchHighlightConfig {
  enabled: boolean;
  fields: string[];
  fragmentSize: number;
  maxFragments: number;
  preTag: string;
  postTag: string;
}

/**
 * Search analytics
 */
export interface SearchAnalytics {
  period: {
    from: Date;
    to: Date;
  };
  totalSearches: number;
  uniqueQueries: number;
  avgResultsPerQuery: number;
  noResultsQueries: number;
  topQueries: Array<{
    query: string;
    count: number;
    avgResults: number;
    clickThrough: number;
  }>;
  topResults: Array<{
    id: string;
    type: SearchEntity;
    title: string;
    clicks: number;
    impressions: number;
    ctr: number;
  }>;
  performance: {
    avgExecutionTime: number;
    p95ExecutionTime: number;
    slowQueries: Array<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
  };
}

/**
 * Search indexing configuration
 */
export interface SearchIndexConfig {
  entities: Record<SearchEntity, {
    enabled: boolean;
    fields: Array<{
      name: string;
      type: 'text' | 'keyword' | 'number' | 'date' | 'boolean';
      searchable: boolean;
      facetable: boolean;
      sortable: boolean;
      boost?: number;
    }>;
    includeRelations: string[];
    updateFrequency: 'realtime' | 'batch' | 'manual';
  }>;
  analyzer: {
    language: string;
    stemming: boolean;
    stopWords: string[];
    synonyms: Array<{
      input: string[];
      output: string;
    }>;
  };
}

/**
 * Search cache configuration
 */
export interface SearchCacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // number of entries
  keyPrefix: string;
  excludeQueries: string[];
  warmupQueries: string[];
}

/**
 * Search query log
 */
export interface SearchQueryLog {
  id: string;
  query: string;
  entity?: SearchEntity;
  filters?: Record<string, any>;
  resultsCount: number;
  executionTime: number;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  
  // Click tracking
  clickedResults?: Array<{
    resultId: string;
    position: number;
    timestamp: Date;
  }>;
}

/**
 * Search personalization
 */
export interface SearchPersonalization {
  userId: string;
  preferences: {
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
    brands: string[];
    excludedTerms: string[];
  };
  history: {
    queries: string[];
    clickedItems: Array<{
      id: string;
      type: SearchEntity;
      timestamp: Date;
    }>;
    purchasedItems: Array<{
      id: string;
      timestamp: Date;
    }>;
  };
  boosts: Array<{
    field: string;
    value: string;
    boost: number;
  }>;
}

/**
 * Search A/B test configuration
 */
export interface SearchABTest {
  id: string;
  name: string;
  description: string;
  variants: Array<{
    name: string;
    weight: number;
    config: {
      algorithm?: string;
      boosts?: Record<string, number>;
      filters?: SearchFilter[];
      ranking?: string;
    };
  }>;
  metrics: Array<{
    name: string;
    type: 'click_through_rate' | 'conversion_rate' | 'revenue_per_search' | 'time_to_result';
    goal: 'maximize' | 'minimize';
  }>;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date;
}

/**
 * Search performance metrics
 */
export interface SearchPerformanceMetrics {
  timestamp: Date;
  metrics: {
    queriesPerSecond: number;
    avgExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    errorRate: number;
    cacheHitRate: number;
    indexSize: number;
    indexingRate: number;
  };
  alerts: Array<{
    type: 'slow_query' | 'high_error_rate' | 'low_cache_hit_rate';
    threshold: number;
    current: number;
    timestamp: Date;
  }>;
}
