export type WgerPaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type WgerLanguage = {
  id: number;
  short_name?: string;
  full_name?: string;
  full_name_en?: string;
};

export type WgerExerciseInfo = {
  id: number;
  last_update?: string;
  last_update_global?: string;
  category?: {
    id: number;
    name?: string;
  };
  muscles?: Array<{
    id: number;
    name?: string;
    name_en?: string;
  }>;
  muscles_secondary?: Array<{
    id: number;
    name?: string;
    name_en?: string;
  }>;
  equipment?: Array<{
    id: number;
    name?: string;
  }>;
  license_author?: string;
  images?: Array<{
    id?: number;
    image?: string;
    is_main?: boolean;
  }>;
  translations?: Array<{
    id: number;
    name?: string;
    description?: string;
    language?: number;
    license_author?: string;
  }>;
};

export type ImportedExerciseRecord = {
  source: 'wger';
  sourceId: string;
  name: string;
  description?: string;
  language?: string;
  category?: string;
  imageUrl?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  licenseAuthor?: string;
  lastUpdate?: string;
  isSystemDefined: boolean;
};
