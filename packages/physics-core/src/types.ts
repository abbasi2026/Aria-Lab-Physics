export type PhysicsDomain =
  | 'core' | 'mechanics' | 'circuits' | 'optics' | 'waves'
  | 'thermal' | 'fields' | 'fluids' | 'atomic' | 'presentation';

export type PropertyKind =
  | 'number' | 'integer' | 'boolean' | 'string' | 'enum'
  | 'vector2' | 'vector3' | 'color' | 'resource' | 'array' | 'object' | 'unknown';

export type PropertyRole =
  | 'parameter' | 'state' | 'observable' | 'computed' | 'rendering' | 'binding' | 'internal';

export interface QuantityValue { value: number; unit: string; }

export interface PartProperty {
  key: string;
  label: string;
  kind: PropertyKind;
  role: PropertyRole;
  quantity?: string;
  defaultUnit?: string;
  allowedUnits?: string[];
  default?: unknown;
  min?: number;
  max?: number;
  editable: boolean;
  observable: boolean;
  legacyType?: string | null;
  legacyFlags?: string[];
}

export interface PartPort {
  id: string;
  kind: 'electrical-terminal' | 'mechanical-connector' | 'optical-port' | 'wave-port' | 'control-port';
  legacyRole?: string;
  legacyClass?: string;
}

export interface SolverContract {
  engine: string;
  family: string;
  status: string;
  inputs: string[];
  outputs: string[];
  contractNotes: string;
}

export interface PartDefinition {
  schemaVersion: '1.0.0';
  id: string;
  name: string;
  nameFa: string;
  translationStatus: 'verified-dictionary' | 'pending';
  domain: PhysicsDomain;
  version: number;
  categories: Array<{ path: string; pathFa: string }>;
  capabilities: string[];
  ports: PartPort[];
  properties: PartProperty[];
  solver: SolverContract;
  rendering: Record<string, unknown>;
  source: Record<string, unknown>;
  migration: Record<string, unknown>;
}
