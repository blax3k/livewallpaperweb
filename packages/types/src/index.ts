export type ObjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

// ─────────────────────────────────────────────────────────────────────────────
// Flags
// ─────────────────────────────────────────────────────────────────────────────

/** Pack-level flag definition. Flags are the backbone of the storytelling system. */
export interface FlagDefinition {
  /** Unique stable identifier. e.g. "morning", "cat_appears" */
  id: string;
  /** Human-readable display name for editor tooling. */
  name: string;
  /** Whether this flag starts active on a fresh install. Defaults to false. */
  defaultActive?: boolean;
  /** Name of the FlagGroup this flag belongs to (see FlagGroup). Ungrouped if omitted. */
  group?: string;
  /**
   * Marks this flag as a chapter milestone. Chapter flags are advanced/read using the same
   * activate_flag/deactivate_flag actions and flag_active/flag_inactive conditions as any
   * other flag; `isChapter` only affects how the editor presents them (e.g. the chapter
   * spine). Requires `chapterOrder` when true.
   */
  isChapter?: boolean;
  /**
   * Sort position within the chapter spine, unique per project among chapter flags. This is
   * a sort key, not a displayed chapter number — don't renumber it when a chapter is deleted.
   * Required when `isChapter` is true, omitted otherwise.
   */
  chapterOrder?: number;
}

/** A named grouping bucket for flags, scoped to a project. */
export interface FlagGroup {
  id: string;
  name: string;
}

/** Associates a flag with a scene-specific score weight. */
export interface ScoredFlagEntry {
  /** References a FlagDefinition.id. */
  flagId: string;
  /**
   * Points added to this scene's selection score when the flag is active.
   * Range: -100 to 100. Negative values make the scene less likely when the flag is active.
   */
  weight: number;
}

/**
 * Declares how a scene participates in flag-based scene selection.
 *
 * Selection algorithm:
 *   1. Exclude scene if any flag in `excluded` is active.
 *   2. Exclude scene if any flag in `required` is NOT active.
 *   3. Score remaining scenes: sum weight for each active flag in `scored`.
 *   4. Pick highest score; ties broken by fewest show-count, then random.
 */
export interface SceneFlagDeclarations {
  /** Scene is ineligible unless ALL of these flag IDs are currently active. */
  required?: string[];
  /** Active flags in this list contribute their weight to the scene's selection score. */
  scored?: ScoredFlagEntry[];
  /** Scene is ineligible if ANY of these flag IDs are currently active. */
  excluded?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single condition check within a rule or sprite condition block.
 *
 * ```
 * type                      required fields
 * ───────────────────────── ───────────────────────────────────────────────────
 * "flag_active"             flagId
 * "flag_inactive"           flagId
 * "time_of_day"             startHour, endHour  (0–23; handles overnight wrap)
 * "day_of_week"             daysOfWeek  (0=Sun … 6=Sat)
 * "scene_count"             sceneId, operator, intValue
 * "install_duration_hours"  operator, intValue
 * "time_since_flag_change"  flagId, flagChangeType, operator, intValue
 * ```
 */
export interface RuleCondition {
  type:
    | 'flag_active'
    | 'flag_inactive'
    | 'time_of_day'
    | 'day_of_week'
    | 'scene_count'
    | 'install_duration_hours'
    | 'time_since_flag_change';

  /** Used by: flag_active, flag_inactive, time_since_flag_change */
  flagId?: string;

  /** "activated" | "deactivated". Used by: time_since_flag_change */
  flagChangeType?: 'activated' | 'deactivated';

  /** Used by: scene_count */
  sceneId?: string;

  /** Comparison operator. Used by: scene_count, install_duration_hours, time_since_flag_change */
  operator?: '>=' | '<=' | '==' | '>' | '<';

  /** Numeric comparison value. Used by: scene_count, install_duration_hours, time_since_flag_change */
  intValue?: number;

  /** Start of time window (0–23 inclusive). Used by: time_of_day */
  startHour?: number;

  /** End of time window (0–23 inclusive; wrap-around supported). Used by: time_of_day */
  endHour?: number;

  /** Days to match (0=Sunday … 6=Saturday). Used by: day_of_week */
  daysOfWeek?: number[];
}

/** A logical group of conditions. "AND" = all must pass; "OR" = any must pass. */
export interface RuleConditionGroup {
  operator: 'AND' | 'OR';
  checks: RuleCondition[];
}

/** A named grouping bucket for rules, scoped to a project. */
export interface RuleGroup {
  id: string;
  name: string;
}

/**
 * An action executed when a rule's conditions are satisfied.
 *
 * ```
 * type              required fields
 * ───────────────── ───────────────
 * "activate_flag"   flagId
 * "deactivate_flag" flagId
 * ```
 */
export interface RuleAction {
  type: 'activate_flag' | 'deactivate_flag';
  /** Used by: activate_flag, deactivate_flag */
  flagId?: string;
}

/**
 * A rule in the storytelling system.
 * Rules are evaluated each time the live wallpaper is viewed (debounced to once every 5 minutes).
 * When conditions pass, all actions fire.
 *
 * `oneShot` rules fire at most once per world-state lifetime. Fired state is tracked
 * in WorldState (keyed by `id`), not here — this is the immutable definition.
 */
export interface RuleDefinition {
  /** Unique stable identifier. Used by WorldState to track fired state. */
  id: string;
  /** Human-readable label for editor tooling. */
  name: string;
  /** Name of the RuleGroup this rule belongs to (see RuleGroup). Ungrouped if omitted. */
  group?: string;
  /**
   * Condition groups the rule fires under. Each entry's `checks` are AND'd together;
   * entries in the array are OR'd against each other (the rule fires if any one group
   * fully matches). Omit or leave empty to always fire (useful for unconditional flag resets).
   */
  conditions?: RuleConditionGroup[];
  /** Actions executed when conditions pass, run in order. */
  actions: RuleAction[];
  /**
   * If true, fires at most once. Use for milestone events.
   * If false (default), re-evaluates every cycle. Use for time-of-day flag setters.
   */
  oneShot?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprite Conditions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single modification applied to a sprite when its condition block matches.
 *
 * ```
 * type                  required fields
 * ───────────────────── ──────────────────────────────────────────
 * "visible"             visible
 * "texture"             textureResource
 * "texture_coordinates" texCoordinates  (8 floats, UV quad)
 * "position"            positionX, positionY
 * "parallax"            parallaxMultiplier
 * "size"                width, height
 * ```
 */
export interface SpriteModification {
  type: 'visible' | 'texture' | 'texture_coordinates' | 'position' | 'parallax' | 'size';
  /** Show or hide. Used by: visible */
  visible?: boolean;
  /** Texture resource name to swap in. Used by: texture */
  textureResource?: string;
  /** Replacement UV coordinates (8 floats). Used by: texture_coordinates */
  texCoordinates?: number[];
  /** Replacement X position. Used by: position */
  positionX?: number;
  /** Replacement Y position. Used by: position */
  positionY?: number;
  /** Replacement parallax/depth multiplier. Used by: parallax */
  parallaxMultiplier?: number;
  /** Replacement width. Used by: size */
  width?: number;
  /** Replacement height. Used by: size */
  height?: number;
}

/**
 * A condition block on a sprite.
 * If conditions pass, all modifications are applied before rendering.
 *
 * Blocks are evaluated in order; the FIRST matching block wins.
 * A null/empty conditions group always matches (use for default overrides).
 */
export interface SpriteConditionBlock {
  /** Human-readable label shown in the editor. */
  name?: string;
  conditions?: RuleConditionGroup;
  modifications: SpriteModification[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenes & Sprites
// ─────────────────────────────────────────────────────────────────────────────

export interface Sprite {
  id: string;
  height: number;
  name: string;
  parallaxMultiplier: number;
  positionX: number;
  positionY: number;
  texCoordinates: number[];
  textureResource: string;
  width: number;
  /**
   * Condition blocks controlling this sprite's appearance based on active flags.
   * Evaluated in order; first matching block wins. Omit for sprites that always
   * render with their base configuration.
   */
  conditions?: SpriteConditionBlock[];
}

export interface Scene {
  sprites: Sprite[];
  xFocus: number;
  yFocus: number;
  /**
   * Flag-based scene selection declarations.
   * This is the primary mechanism for controlling when this scene is shown.
   */
  flags?: SceneFlagDeclarations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Project & Scene metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  version: number;
  status: ObjectStatus;
  created_at?: string;
  updated_at?: string;
  scene_ids: string[];
  scene_thumbnail_urls: string[];
  total_size_bytes: number;
}

export interface SceneSummary {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  updated_at?: string;
  thumbnail_url: string;
  /**
   * Lightweight scene-selection metadata (no sprites), so consumers like the simulator can rank
   * scenes without fetching each scene's full detail. Mirrors `flags` on `Scene`.
   */
  flags?: SceneFlagDeclarations;
}

export interface SceneDetail {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  data: Scene;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImageRecord {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  thumb_filename: string | null;
}
