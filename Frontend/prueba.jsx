import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Modal,
  TouchableOpacity,
  TextInput as RNTextInput,
  Pressable,
  InteractionManager,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Card,
  Button,
  Text,
  TextInput,
  useTheme,
  Divider,
  Chip,
  ProgressBar,
  Switch,
  HelperText,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { HealthCategory, NutritionLog } from '../types';
import { formFactoryService, CategoryFormConfig, FormField, PrePopulatedFormData } from '../services/formFactoryService';
import { DatePicker } from './DatePicker';
import { StandardDropdown } from './StandardDropdown';
import { DROPDOWN_OPTIONS } from '../constants/dropdownOptions';
import { parseISODate, formatDateToISO, getTodayISO, getYesterdayISO, getDaysAgoISO } from '../utils/dateUtils';
import { normalizeTimestamptzValue } from '../utils/recordedAtNormalize';
import { applyQuickDuplicateDatetimeDefaults } from '../utils/quickDuplicateDatetimeDefaults';
import { createSingleShotGuard, createSyncInFlightGuard } from '../utils/singleFlight';
import {
  clearPendingIdentityGateSave,
  scheduleIdentityGatePickerSaveResume,
} from '../utils/identityGateSaveResume';
// NOTE: Nutrition recommendations are shown AFTER save in InputConfirmationScreen, not here
import { useAuth } from '../services/auth';
import { supabase } from '../services/supabase';
// ⚡ Phase 1.2: Nutrition confirmation enhancements
import { NutritionConfirmationEnhancements } from './NutritionConfirmationEnhancements';
// T-0225 (2026-06-13): provenance check that drives the "Estimated from USDA"
// disclaimer banner in MacroDisplay. True when the barcode-seed grounding
// fallback fired (sparse OFF panel → backfilled from generic USDA).
import {
  wasBarcodeSeedGrounded,
  getBarcodeGroundingOutcome,
  isAuthoritativeBarcodeLabelChip,
} from '../utils/barcodeSeedGrounding';
import { extractBarcodeFromNutritionLog } from '../utils/quickAddGtinRehydrate';
import {
  forwardBarcodeProvenanceToPrePopulated,
  normalizeQuickAddRecentsBarcodeForward,
  shouldForwardBarcodeProvenanceFields,
} from '../utils/quickAddRecentsBarcodeForward';
import { sanitizeComponentBarcodeProvenance } from '../utils/componentBarcodeProvenance';
import { buildBarcodeFindWithAIPrompt } from '../utils/barcodeScanConfirmationBridge';
import { inputTriggerService } from '../services/inputTriggerService';
// Phase 9.4: USDA match picker modal — top-K alternatives + search escape hatch
import { IngredientPickerModal, searchResultLabel, type IngredientPickerAlternative } from './IngredientPickerModal';
import { nutritionGroundingService } from '../services/nutritionGroundingService';
import { portionToGrams, chipEditGramsForUnit, normaliseUnit as normalisePortionUnit, variableUnitGramsOverride, parseLeadingPieceCountFromServingText, formatBarcodeLabeledServingPresetLabel, isMassUnit } from '../utils/portionToGrams';
import {
  buildPerUnitComponentSnapshot,
  getChipMultiplierFromMealQuantity,
} from '../utils/chipMultiplierGate';
import { applyRowPortionStamp } from '../utils/rowPortionStamp';
import { userNutritionTargetsService } from '../services/userNutritionTargetsService';
import { nutritionDatabaseService, NutritionData } from '../services/nutritionDatabaseService';
// ⚡ Phase 1.4: Conversational AI Prompts
import { ConversationalPrompts, PromptQuestion, PromptOption } from './ConversationalPrompts';
import { promptGenerationService } from '../services/promptGenerationService';
import {
  sumToTotals,
  RECONCILIABLE_NUTRIENTS,
  mergeRowTotalsFromPerComponent,
  pickPerComponentNutritionSource,
  syntheticComponentFromFlatRow,
} from '../utils/nutritionReconciliation';
import { projectFoodComponentsForNutritionSave } from '../utils/nutritionSaveComponentProjection';
import { classifySupplementOrFoodFromText } from '../utils/supplementClassifier';
import {
  applyNutritionTextSupplementPostProcess,
  inferSupplementUnitFromText,
} from '../utils/supplementTextPostProcess';
import { SupplementBadge } from './SupplementBadge';
import { nutritionDataToComponentFields } from '../utils/nutritionDataChip';
import {
  normalizeCorrectedComponentsForDisplay,
  resolveForcedFdcAtUsdaServing,
  resolveSearchPickToChip,
  autoRepairImplausibleZeroCalorieChips,
} from '../utils/applyForcedFdcPick';
// Phase 9.4.9: universal save-time sanity gate
import { normalizeAndValidateComponent, describeFirstIssue, reinterpretWaterGIfPer100gStuckOnAbsolute, repairPackagedChipNutritionBasis, repairMixedNutritionBasisBeforeGate, stripImpossibleAddedSugar, evaluateComponentSaveGate, checkAggregateMealPlausibility, describeAggregateMealIssue, stampWasOverriddenAfterGate, formatNumbersLookOffHeadline, formatNumbersLookOffBody, applyPreSaveRepairsToDisplayComponent, repairComponentByReGrounding, shouldAttemptGateReGround, type ComponentSaveGateResult } from '../utils/componentSanityGate';
import { detectMixedNutritionBasis } from '../utils/nutritionBasisUtils';
import { shouldSkipNumbersLookOffGate } from '../utils/foodSelectionSaveGate';
import {
  resolveComponentGatePresentation,
  buildPortionGateQuestion,
  formatHardBlockGateMessage,
  formatUserOwnsItGateMessage,
  isPortionTypeItOption,
  portionCandidateFromOption,
  type SaveGatePresentation,
} from '../utils/saveGatePresentation';
import { ClarifyQuestionSheet } from './ClarifyQuestionSheet';
import {
  buildClarifyQuestion,
  dedupeAlternativesByFdcId,
  type ClarifyQuestionOption,
} from '../utils/buildClarifyQuestion';
import { posthog, POSTHOG_CONFIGURED } from '../services/posthog';
import { captureMealSaveGateWarning, captureMixedBasisGateWarning, captureSaveGateOutcome, buildPlausibilityIssuesForSave, captureAddedSugarCoverageGapAtSave, type SaveGatePlausibilityOffender } from '../utils/saveGateTelemetry';
import { buildNumbersLookOffRowKey, markNumbersLookOffShown } from '../utils/numbersLookOffDebounce';
import {
  estimateDrinkHydrationGrams,
  resolveEffectiveWaterGramsForNutritionRow,
  rollupPreparedDrinkHydrationToRow,
} from '../utils/waterBeverageUtils';
// Phase 9.12: re-resolve LLM-emitted macro-only stubs before save
// Phase 9.15 (2026-04-30): + isSparseGroundedComponent for fill-only-missing pass
import {
  enrichUnresolvedStubs,
  isSparseGroundedComponent,
} from '../utils/componentStubEnrichment';
import { enrichBarcodeOffCompleteFoundationBorrow } from '../utils/barcodeFoundationBorrowEnrichment';
import { QuickAddMealLibrary } from './QuickAddMealLibrary';
import { per100gMissingCount } from '../utils/nutrientPanelCompleteness';
import { recordNutritionSaveAudit } from '../services/nutritionSaveAuditService';
// Phase 9.13: auto-derive food_item from components when blank
import { reconcileFoodItemLabelWithComponents } from '../utils/foodItemDerivation';
import { requiresMatchDisambiguation } from '../utils/foodQueryAmbiguity';
// Phase 9.15 (2026-04-30): persist Manual-entry micros opt-in answer
import AsyncStorage from '@react-native-async-storage/async-storage';
// Phase 9.15 (2026-04-30): pure helpers — chip-sum-driven currentMacros
import {
  sumComponentMacrosForDisplay,
  anyComponentHasMacros,
  deriveCurrentMacros,
  deriveDisplayMacrosWithPendingState,
  hasComponentsNeedingCalorieRepair,
} from '../utils/currentMacros';
import { isImplausiblyZeroCalorie } from '../utils/portionScaling';
import {
  getDetailsToggleCollapsedLabel,
  shouldAutoExpandDetails,
} from '../utils/supplementConfirmationUx';
import {
  componentsForFormMirror,
  shouldSkipComponentHydration,
} from '../utils/chipEditSync';
import { MEDICAL_SOURCES } from '../constants/medicalSources';
import { useTranslation } from 'react-i18next';

// Phase 9.2: macro fields rescaled in lock-step with the row when the user
// adjusts the portion stepper. Local to this screen so we don't need to
// re-export from `nutritionReconciliation` (which is now save-path-only).
const MACRO_FIELDS = [
  'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg',
] as const;

/** Immutable chip copy so sibling components never share mutable nested refs (T-0287). */
function cloneChipForState<T extends Record<string, unknown>>(chip: T): T {
  return JSON.parse(JSON.stringify(chip)) as T;
}

/**
 * Phase 9.15 (2026-04-30) — AsyncStorage key used to remember the
 * user's answer to the "fill missing micros from USDA?" prompt
 * triggered on Manual-entry saves with no key micros populated. The
 * value is one of `'yes' | 'no'` and is per-session (cleared on
 * sign-out).
 */
const MANUAL_MICROS_OPT_IN_KEY = 'manual_micros_opt_in_choice';

/**
 * Phase 9.17 / T-0159b — duplicate-style nutrition input methods. Save path
 * only fills missing `log_date` / `meal_time` (fallback when pre-pop left them
 * blank). User-picked values from the date/time chips are preserved verbatim.
 * `edit_existing` bypasses this block entirely via `isEditMode`.
 */
const QUICK_DUPLICATE_DATETIME_INPUT_METHODS = new Set<string>([
  'quick_add',
  'favorite',
  'meal_template',
  'browse',
  'suggestion',
]);

/**
 * Phase 9.15 (2026-04-30) — signal micros surfaced by the
 * recommendation engine. When a Manual-entry row has none of these
 * populated AND every chip is `data_source: 'user_input'`, the save
 * path can prompt the user to opt into a one-shot grounding
 * round-trip that fills only the missing micros. See `handleConfirm`.
 */
const MANUAL_OPT_IN_SIGNAL_FIELDS = [
  'vitamin_d_mcg',
  'vitamin_b12_mcg',
  'omega_3_g',
  'calcium_mg',
  'iron_mg',
] as const;

// Phase 9.15 (2026-04-30) — `sumComponentMacrosForDisplay` and
// `anyComponentHasMacros` extracted to `../utils/currentMacros.ts`
// for unit testing without React. See `__tests__/currentMacros.test.ts`.

/**
 * Phase 9.4.5 (2026-04-27): rescale every numeric nutrient on a component
 * by `factor`, not just the 7 dashboard macros. The previous version
 * silently dropped the scaling on micros / amino acids / sat fat / etc.
 * which left them frozen at the original portion when the user changed
 * serving size, then completely stripped on save.
 */
function rescaleComponents<T extends Record<string, any>>(components: T[], factor: number): T[] {
  if (!Array.isArray(components) || !Number.isFinite(factor) || factor === 1) {
    return components.map(c => ({ ...c }));
  }
  return components.map(c => {
    const out: any = { ...c };
    for (const f of RECONCILIABLE_NUTRIENTS) {
      const v = (c as any)[f];
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[f] = +(v * factor).toFixed(4);
      }
    }
    if (typeof c.gramWeight === 'number') out.gramWeight = +(c.gramWeight * factor).toFixed(4);
    if (typeof c.quantity === 'number') out.quantity = +(c.quantity * factor).toFixed(4);
    return out as T;
  });
}

export interface UnifiedConfirmationScreenProps {
  healthCategory: HealthCategory;
  extractedData: any;
  originalInput: string;
  // Phase 9.15 (2026-04-30): include `'manual'` to match what the
  // `ManualFormScreen` route already dispatches at runtime
  // (see `screens/input/ManualFormScreen.tsx`). Pre-9.15 the type
  // omitted it, so the entry-mode-aware UI hints (C.4 hint chip,
  // C.3 micros opt-in trigger) couldn't lean on a typed signal.
  // Phase 10.2.E (2026-04-30): expanded to cover the new Quick Add
  // tabs (favorite / meal_template / browse) and the Phase 10.3.B
  // suggestion-card path. Older code still passes the legacy values.
  // Phase 11.4 (2026-05-01): `edit_existing` re-uses this screen for
  // post-save edits. When set, the save path calls `update(id, …)`
  // instead of `create()`, audit fields are populated automatically,
  // and the grounding pipeline is skipped (the user is making a
  // deliberate correction).
  inputMethod:
    | 'voice'
    | 'camera'
    | 'file'
    | 'chat'
    | 'barcode'
    | 'manual'
    | 'quick_add'
    | 'favorite'
    | 'meal_template'
    | 'browse'
    | 'suggestion'
    | 'edit_existing';
  onConfirm: (data: any) => void;
  onCancel: () => void;
  onRetry?: () => void;
  isProcessing?: boolean;
  imageUri?: string; // ⚡ Phase 1.2: Support image display
  /**
   * Phase 11.4 (2026-05-01): when `inputMethod === 'edit_existing'`,
   * this is the row id passed straight into `healthDataService.update`.
   * Required in edit mode — undefined for new-entry flows.
   */
  editingLogId?: string;
}

// Confidence helper functions
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return '#4CAF50'; // Green for high confidence
  if (confidence >= 60) return '#FF9800'; // Orange for medium confidence
  return '#F44336'; // Red for low confidence
};

const getConfidenceIcon = (confidence: number): any => {
  if (confidence >= 80) return 'checkmark-circle';
  if (confidence >= 60) return 'warning';
  return 'alert-circle';
};

const getConfidenceLabel = (confidence: number, t: any): string => {
  if (confidence >= 80) return t('unifiedConfirmation.confidence.high', 'High Confidence');
  if (confidence >= 60) return t('unifiedConfirmation.confidence.medium', 'Medium Confidence');
  return t('unifiedConfirmation.confidence.low', 'Low Confidence - Please Review');
};

const getEnhancementSourceLabel = (enhancements: any[], t: any): string => {
  if (!enhancements || enhancements.length === 0) return '';
  
  const source = enhancements[0].source;
  if (source === 'api_lookup') return t('unifiedConfirmation.sources.usdaNutritionix', 'USDA/Nutritionix Database');
  if (source === 'database_lookup') return t('unifiedConfirmation.sources.foodDatabase', 'Food Database');
  return t('unifiedConfirmation.sources.nutritionDatabase', 'Nutrition Database');
};

const formatFieldName = (field: string): string => {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/ G$/g, ' (g)')
    .replace(/ Mg$/g, ' (mg)')
    .replace(/ Mcg$/g, ' (mcg)');
};

const formatFieldValue = (value: any, field: string): string => {
  if (typeof value === 'number') {
    return value.toFixed(1);
  }
  return String(value);
};

function getEstimatedNutrition(name: string): {
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  fiber_g: number; sugar_g: number; sodium_mg: number; saturated_fat_g?: number;
  gramWeight: number;
} {
  const lower = name.toLowerCase();
  const estimates: Record<string, any> = {
    caesar:     { calories: 160, protein_g: 0.5, carbs_g: 1,  fat_g: 17, fiber_g: 0, sugar_g: 1,  sodium_mg: 300, saturated_fat_g: 2.5, gramWeight: 30 },
    ranch:      { calories: 145, protein_g: 0.4, carbs_g: 2,  fat_g: 15, fiber_g: 0, sugar_g: 1,  sodium_mg: 270, saturated_fat_g: 2.3, gramWeight: 30 },
    vinaigrette:{ calories: 90,  protein_g: 0,   carbs_g: 4,  fat_g: 8,  fiber_g: 0, sugar_g: 3,  sodium_mg: 240, saturated_fat_g: 1,   gramWeight: 30 },
    italian:    { calories: 70,  protein_g: 0,   carbs_g: 3,  fat_g: 6,  fiber_g: 0, sugar_g: 2,  sodium_mg: 260, saturated_fat_g: 1,   gramWeight: 30 },
    'blue cheese':{ calories: 150, protein_g: 1, carbs_g: 1,  fat_g: 16, fiber_g: 0, sugar_g: 1,  sodium_mg: 320, saturated_fat_g: 3,   gramWeight: 30 },
    honey:      { calories: 130, protein_g: 0,   carbs_g: 10, fat_g: 10, fiber_g: 0, sugar_g: 9,  sodium_mg: 200, saturated_fat_g: 1.5, gramWeight: 30 },
    thousand:   { calories: 120, protein_g: 0.3, carbs_g: 5,  fat_g: 11, fiber_g: 0, sugar_g: 4,  sodium_mg: 250, saturated_fat_g: 1.7, gramWeight: 30 },
    ketchup:    { calories: 20,  protein_g: 0,   carbs_g: 5,  fat_g: 0,  fiber_g: 0, sugar_g: 4,  sodium_mg: 160, saturated_fat_g: 0,   gramWeight: 17 },
    mayo:       { calories: 100, protein_g: 0,   carbs_g: 0,  fat_g: 11, fiber_g: 0, sugar_g: 0,  sodium_mg: 80,  saturated_fat_g: 1.5, gramWeight: 14 },
    mustard:    { calories: 10,  protein_g: 0.5, carbs_g: 1,  fat_g: 0.5,fiber_g: 0, sugar_g: 0,  sodium_mg: 170, saturated_fat_g: 0,   gramWeight: 10 },
    salsa:      { calories: 15,  protein_g: 0.5, carbs_g: 3,  fat_g: 0,  fiber_g: 1, sugar_g: 2,  sodium_mg: 220, saturated_fat_g: 0,   gramWeight: 30 },
    butter:     { calories: 100, protein_g: 0,   carbs_g: 0,  fat_g: 11, fiber_g: 0, sugar_g: 0,  sodium_mg: 90,  saturated_fat_g: 7,   gramWeight: 14 },
    'sour cream':{ calories: 60, protein_g: 1,   carbs_g: 1,  fat_g: 5,  fiber_g: 0, sugar_g: 1,  sodium_mg: 15,  saturated_fat_g: 3,   gramWeight: 30 },
    guacamole:  { calories: 50,  protein_g: 1,   carbs_g: 3,  fat_g: 4,  fiber_g: 2, sugar_g: 0,  sodium_mg: 120, saturated_fat_g: 0.5, gramWeight: 30 },
    hummus:     { calories: 70,  protein_g: 2,   carbs_g: 6,  fat_g: 4,  fiber_g: 2, sugar_g: 0,  sodium_mg: 150, saturated_fat_g: 0.5, gramWeight: 30 },
    croutons:   { calories: 65,  protein_g: 1.5, carbs_g: 11, fat_g: 2,  fiber_g: 1, sugar_g: 1,  sodium_mg: 130, saturated_fat_g: 0.5, gramWeight: 15 },
    cheese:     { calories: 110, protein_g: 7,   carbs_g: 0.5,fat_g: 9,  fiber_g: 0, sugar_g: 0,  sodium_mg: 180, saturated_fat_g: 6,   gramWeight: 28 },
    bacon:      { calories: 80,  protein_g: 6,   carbs_g: 0,  fat_g: 6,  fiber_g: 0, sugar_g: 0,  sodium_mg: 290, saturated_fat_g: 2,   gramWeight: 16 },
  };
  for (const [key, val] of Object.entries(estimates)) {
    if (lower.includes(key)) return val;
  }
  // Generic fallback for unknown condiments/additions
  return { calories: 80, protein_g: 1, carbs_g: 4, fat_g: 6, fiber_g: 0, sugar_g: 2, sodium_mg: 200, saturated_fat_g: 1, gramWeight: 30 };
}

export const UnifiedConfirmationScreen: React.FC<UnifiedConfirmationScreenProps> = ({
  healthCategory,
  extractedData,
  originalInput,
  inputMethod,
  onConfirm,
  onCancel,
  onRetry,
  isProcessing: externalIsProcessing = false,
  imageUri, // ⚡ Phase 1.2: Image display support
  editingLogId,
}) => {
  const { t } = useTranslation();
  // Phase 11.4 (2026-05-01): convenience flag — derived from the
  // mutually-exclusive inputMethod tag. Drives: skip grounding,
  // populate audit fields on save, primary macro fields visible by
  // default, and "Edit entry" header copy.
  const isEditMode = inputMethod === 'edit_existing';
  const [formConfig, setFormConfig] = useState<CategoryFormConfig | null>(null);
  const [formData, setFormData] = useState<PrePopulatedFormData>({});
  // T-0083: inline title editing — true while the hero/banner food_item field is active
  const [editingTitle, setEditingTitle] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // Phase 11.2 (2026-05-01): own the saving state locally so the
  // button disables IMMEDIATELY when the user taps Save — without
  // waiting for the multi-second `enrichUnresolvedStubs` grounding
  // passes that run *before* `onConfirm` is awaited. The screen
  // wrapper still passes `externalIsProcessing` for the post-onConfirm
  // DB-write phase; we OR them together so the button reflects the
  // union. `savePhase` lets us update the button label so the wait
  // feels purposeful instead of frozen.
  const [internalIsProcessing, setInternalIsProcessing] = useState(false);
  const [savePhase, setSavePhase] = useState<'idle' | 'grounding' | 'enriching' | 'persisting'>('idle');
  // T-0383: synchronous save guard — React `isProcessing` state cannot block
  // two taps in the same JS tick; refs close that race and gate-override double-fire.
  const saveInFlightGuardRef = useRef(createSyncInFlightGuard());
  const gateOverrideGuardRef = useRef(createSingleShotGuard());
  const handleConfirmRef = useRef<(() => Promise<void>) | null>(null);
  // T-0601: "the user overrode the gate" has been one signal covering two very
  // different events — someone who read the warning, went back, looked at the
  // food and still chose to save, and someone who dismissed the first dialog
  // between them and their lunch. Only the first is evidence the numbers are
  // right. Keyed by component name for this screen session.
  const gateWarningHistoryRef = useRef(
    new Map<string, { shown: number; opened: number }>(),
  );
  const pendingSaveAfterIdentityConfirmRef = useRef(false);
  const releaseSaveInFlight = useCallback(() => {
    saveInFlightGuardRef.current.release();
    setInternalIsProcessing(false);
    setSavePhase('idle');
  }, []);
  const resumeSaveAfterIdentityGatePickerIfPending = useCallback(() => {
    scheduleIdentityGatePickerSaveResume({
      pendingRef: pendingSaveAfterIdentityConfirmRef,
      runAfterInteractions: InteractionManager.runAfterInteractions,
      releaseSaveInFlight,
      handleConfirm: handleConfirmRef.current,
    });
  }, [releaseSaveInFlight]);
  const isProcessing = internalIsProcessing || externalIsProcessing;
  const [prepopulationResult, setPrepopulationResult] = useState<any>(null);
  const paperTheme = useTheme();
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const { user } = useAuth();
  
  // ⚡ Phase 1.2: User's actual nutrition targets for macro rings
  const [userMacroTargets, setUserMacroTargets] = useState<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);
  
  // Water target in liters (default 2.5L, updated from user targets)
  const [waterTargetL, setWaterTargetL] = useState(2.5);
  
  // ⚡ Phase 1.2: Nutrition-specific state for portion slider and components
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  // T-0221 / RC-Q — block PortionSlider mount clamp from rescaling before hydration.
  const portionHydrationReadyRef = useRef(false);
  const componentHydrationGenRef = useRef(0);
  const componentHydrationSigRef = useRef<string | null>(null);
  const [foodComponents, setFoodComponents] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    detected: boolean;
    // Per-component nutrition for recalculation when removing
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    // Gram weight the nutrition values are based on
    // Enables proper scaling: newCalories = (calories/gramWeight) * newGramWeight
    gramWeight?: number;
    // Phase 9.4 (2026-04-27): provenance + alternatives carried through
    // from the grounding pipeline. The picker UI uses `alternatives` and
    // `needs_user_review` to render/auto-pop the "Change match" modal,
    // and `was_user_corrected` is set when the user explicitly swaps a
    // chip (saved to per_component_nutrition jsonb).
    fdc_id?: string;
    data_source?: string;
    match_confidence?: number;
    alternatives?: Array<{
      fdc_id: string;
      name: string;
      brand?: string;
      data_source?: string;
      match_confidence?: number;
      dataType?: string;
      score?: number;
      caloriesPer100g?: number;
    }>;
    needs_user_review?: boolean;
    order_ambiguous?: boolean;
    ai_filled_fields?: string[];
    was_user_corrected?: boolean;
    brand?: string;
    // Phase 9.4.5 (2026-04-27): per-component nutrient passthrough.
    // The grounding pipeline emits a wide nutrient bag per component
    // (vitamins, minerals, amino acids, sat fat, omega-3/6, water, etc.)
    // — but the UI math here only tracks the 7 macros. Storing the full
    // bag on each component lets `handleConfirm` persist it into both
    // `per_component_nutrition` (jsonb) and the row-level columns via
    // `sumToTotals`, instead of silently dropping micros on save.
    [key: string]: any;
  }>>([]);
  const foodComponentsRef = useRef(foodComponents);
  foodComponentsRef.current = foodComponents;
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [lookingUpNutrition, setLookingUpNutrition] = useState(false);
  const [repairingCalorieChipIds, setRepairingCalorieChipIds] = useState<Set<string>>(() => new Set());
  const calorieRepairAttemptedRef = useRef<Set<string>>(new Set());
  
  // ⚡ Nutrition options selection modal
  const [showNutritionOptionsModal, setShowNutritionOptionsModal] = useState(false);
  const [nutritionOptions, setNutritionOptions] = useState<NutritionData[]>([]);
  const [pendingIngredientName, setPendingIngredientName] = useState('');

  // Phase 9.4 (2026-04-27): match-picker modal state. The picker lets the
  // user swap a chip's USDA match (e.g. "Fish oil, salmon" → "Fish,
  // salmon, raw") without leaving the confirmation screen.
  const [pickerComponentId, setPickerComponentId] = useState<string | null>(null);
  const [pickerReason, setPickerReason] = useState<string | null>(null);
  const [autoPoppedIds, setAutoPoppedIds] = useState<Set<string>>(new Set());
  const [swappingComponentId, setSwappingComponentId] = useState<string | null>(null);
  /** T-0646: gate-driven portion editor request (ComponentEditModal, not match picker). */
  const [requestEditComponentId, setRequestEditComponentId] = useState<string | null>(null);
  const [gateClarifyVisible, setGateClarifyVisible] = useState(false);
  const [gateClarifyPayload, setGateClarifyPayload] = useState<{
    chipId: string;
    question: string;
    options: ClarifyQuestionOption[];
    kind: 'identity' | 'portion';
  } | null>(null);
  
  const isManualEntry = inputMethod === 'manual';
  const supplementKindOnMount =
    (extractedData as { nutrition_capture_kind?: string })?.nutrition_capture_kind
    ?? (extractedData as { data_json?: { nutrition_capture_kind?: string } })?.data_json
      ?.nutrition_capture_kind;
  const [showDetailedFields, setShowDetailedFields] = useState(() =>
    shouldAutoExpandDetails(isManualEntry, supplementKindOnMount),
  );
  // Track which nutrition subsections are expanded in the "Edit All Fields" view
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // ⚡ Date picker state for inline date selection
  const [showDatePicker, setShowDatePicker] = useState(false);
  // ⚡ Time picker state - CRITICAL for circadian rhythm & fasting calculations
  const [showTimePicker, setShowTimePicker] = useState(false);
  // ⚡ Custom time picker (native DateTimePicker) for exact time selection
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  
  // ⚡ Water tracking: Today's water intake (for hydration progress bar)
  const [todaysWaterG, setTodaysWaterG] = useState(0);
  
  // ⚡ Phase 1.4: Conversational AI Prompts
  const [conversationalPrompts, setConversationalPrompts] = useState<PromptQuestion[]>([]);
  const [promptsCompleted, setPromptsCompleted] = useState(false);
  
  // ⚡ Phase 1.2: Quick context chips (meal type, date)
  const mealTypes = [
    { value: 'breakfast', label: t('unifiedConfirmation.mealTypes.breakfast', 'Breakfast'), icon: '🌅' },
    { value: 'lunch', label: t('unifiedConfirmation.mealTypes.lunch', 'Lunch'), icon: '☀️' },
    { value: 'dinner', label: t('unifiedConfirmation.mealTypes.dinner', 'Dinner'), icon: '🌙' },
    { value: 'snack', label: t('unifiedConfirmation.mealTypes.snack', 'Snack'), icon: '🍿' },
    { value: 'beverage', label: t('unifiedConfirmation.mealTypes.beverage', 'Beverage'), icon: '🥤' },
  ];
  
  // Phase 9.15 (2026-04-30) — `originalBaseMacros` and
  // `addedItemsMacros` were retired. Both were parallel mirrors of
  // `foodComponents` macro totals that drifted out of sync when the
  // first non-zero `formData.calories` originated from a chip
  // insert (Manual entry's Sunkist tuna case). The progress wheel
  // and image overlay now derive from `foodComponents` directly via
  // `sumComponentMacrosForDisplay`, so the mirrors are unnecessary.

  // Original quantity is still tracked so `handlePortionChange` can
  // detect "the user has changed portion from extraction default"
  // for telemetry / debug logs. The component rescale itself uses
  // `originalComponentsPerUnit`.
  const [originalQuantity, setOriginalQuantity] = useState<number>(1);

  // ⚡ Phase 2: Capture per-unit component nutrition so handlePortionChange can
  // rescale the components in lock-step with the row aggregates. Without this
  // snapshot, components stay at the AI's first guess and `per_component_nutrition`
  // disagrees with `calories` (the "3 fish tacos: 1463 vs 4389 cal" bug).
  const [originalComponentsPerUnit, setOriginalComponentsPerUnit] = useState<Array<any> | null>(null);

  const formConfigRef = useRef<CategoryFormConfig | null>(null);
  formConfigRef.current = formConfig;
  const loadGenerationRef = useRef(0);
  /** T-0366: after user chip edit, skip hydration that would restore stale `formData`. */
  const componentsUserEditedRef = useRef(false);

  // Stable key — route `extractedData` object identity can change without new payload.
  const confirmationLoadKey = useMemo(() => {
    if (!extractedData) return `${healthCategory}|empty`;
    const root = extractedData as Record<string, any>;
    const inner =
      root.data_json &&
      typeof root.data_json === 'object' &&
      !Array.isArray(root.data_json)
        ? root.data_json
        : null;
    const food = String(inner?.food_item ?? root.food_item ?? '');
    const barcode = String(
      inner?.brand_barcode ??
        root.brand_barcode ??
        inner?.barcode ??
        root.barcode ??
        '',
    );
    const pcnLen = Array.isArray(root.per_component_nutrition)
      ? root.per_component_nutrition.length
      : Array.isArray(inner?.per_component_nutrition)
        ? inner.per_component_nutrition.length
        : 0;
    return `${healthCategory}|${inputMethod}|${food}|${barcode}|${pcnLen}`;
  }, [healthCategory, inputMethod, extractedData]);
 
  // Load form configuration and pre-populate data
  useEffect(() => {
    componentsUserEditedRef.current = false;
    void loadFormConfiguration();
  }, [confirmationLoadKey]);

  /** Mirror live chips into `formData.per_component_nutrition` without rescaling (T-0366). */
  const syncLiveComponentsToFormData = (
    nextComponents: typeof foodComponents,
    formPatch?: (fd: Record<string, any>) => Record<string, any>,
  ) => {
    componentsUserEditedRef.current = true;
    setFormData((fd) => {
      const base = formPatch ? formPatch(fd as Record<string, any>) : (fd as Record<string, any>);
      return {
        ...base,
        per_component_nutrition: componentsForFormMirror(nextComponents as any),
      };
    });
  };

  // ⚡ Phase 1.2: Fetch user's actual nutrition targets for macro rings
  useEffect(() => {
    const fetchUserTargets = async () => {
      if (healthCategory !== 'nutrition_log' || !user?.id) return;
      
      try {
        const storedTargets = await userNutritionTargetsService.getStoredTargets(user.id);
        if (storedTargets) {
          setUserMacroTargets({
            calories: storedTargets.calories,
            protein_g: storedTargets.protein_g,
            carbs_g: storedTargets.total_carbs_g,
            fat_g: storedTargets.fat_g,
          });
          
          // Get water target from micronutrient_targets (stored in liters)
          const waterTarget = storedTargets.micronutrient_targets?.['Water'];
          if (waterTarget?.target) {
            setWaterTargetL(waterTarget.target);
            console.log('💧 Water target from user settings:', waterTarget.target, 'L');
          }
          
          console.log('✅ Loaded user nutrition targets for confirmation screen:', {
            calories: storedTargets.calories,
            protein_g: storedTargets.protein_g,
            carbs_g: storedTargets.total_carbs_g,
            fat_g: storedTargets.fat_g,
            water_L: waterTarget?.target || 2.5,
          });
        }
      } catch (error) {
        console.error('⚠️ Failed to fetch user nutrition targets:', error);
        // Will fall back to default targets in NutritionConfirmationEnhancements
      }
    };
    
    fetchUserTargets();
  }, [healthCategory, user?.id]);

  // ⚡ Water tracking: Fetch today's total water intake
  useEffect(() => {
    const fetchTodaysWater = async () => {
      if (healthCategory !== 'nutrition_log' || !user?.id) return;
      
      try {
        const today = getTodayISO();
        const { data, error } = await supabase
          .from('nutrition_log')
          .select('water_g')
          .eq('user_id', user.id)
          .eq('log_date', today);
        
        if (error) {
          console.error('⚠️ Error fetching today\'s water:', error);
          return;
        }
        
        const totalWaterG = (data || []).reduce((sum: number, entry: any) => sum + (entry.water_g || 0), 0);
        setTodaysWaterG(totalWaterG);
        console.log(`💧 Today's water intake so far: ${totalWaterG}g (${(totalWaterG / 1000).toFixed(1)}L)`);
      } catch (error) {
        console.error('⚠️ Error fetching today\'s water:', error);
      }
    };
    
    fetchTodaysWater();
  }, [healthCategory, user?.id]);

  // Phase 9.15 (2026-04-30) — capture initial portion + per-unit
  // component snapshot. The original `originalBaseMacros` capture
  // was deleted: the progress wheel and image overlay now derive
  // from `foodComponents` directly via `sumComponentMacrosForDisplay`,
  // so the per-unit row-level macro snapshot is no longer needed.
  // We still need `originalQuantity` so `handlePortionChange` knows
  // the starting portion (its rescale uses `originalComponentsPerUnit`).
  useEffect(() => {
    if (healthCategory !== 'nutrition_log' || !formData.calories) return;
    // T-0534: pre_confirm portions are per-chip; row quantity may be grams.
    if (inputMethod === 'pre_confirm') return;
    const rawQty = Number(formData.quantity) || Number(formData.servings) || 1;
    const initialQuantity = getChipMultiplierFromMealQuantity({
      quantity: rawQty,
      unit: formData.unit?.toString(),
    });
    // Only set on first non-zero — subsequent extraction-driven
    // re-renders shouldn't reset the user's chosen portion.
    setOriginalQuantity(prev => (prev === 1 && initialQuantity !== 1 ? initialQuantity : prev));
    setPortionMultiplier(prev => (prev === 1 && initialQuantity !== 1 ? initialQuantity : prev));
  }, [healthCategory, formData.calories, inputMethod]);

  // ⚡ Phase 1.4: Generate conversational prompts when form data loads
  useEffect(() => {
    if (healthCategory === 'nutrition_log' && formData.food_item && !promptsCompleted) {
      const confidence = extractedData?.confidence_score || extractedData?.confidence || 0.8;
      const existingComponentNames = foodComponents.map(c => c.name);
      
      const prompts = promptGenerationService.generatePrompts({
        extractedData: {
          ...extractedData,
          ...formData,
        },
        healthCategory,
        confidence,
        inputMethod: inputMethod as any,
        existingComponents: existingComponentNames,
        componentDetails: foodComponents.map(c => ({
          name: String(c.name ?? ''),
          data_source: (c as any).data_source,
          barcode: (c as any).barcode ?? (c as any).brand_barcode ?? null,
          barcode_grounding_outcome: (c as any).barcode_grounding_outcome,
        })),
      });
      
      if (prompts.length > 0) {
        console.log(`💬 Generated ${prompts.length} conversational prompts`);
        setConversationalPrompts(prompts);
      }
    }
  }, [healthCategory, formData.food_item, foodComponents, promptsCompleted]);

  // Phase 9.15 (2026-04-30) — currentMacros derive from `foodComponents`
  // when chips carry macros, with a fallback to `formData` when there
  // are no chips yet (e.g., Manual entry with values typed directly
  // into the form).
  //
  // This is the architectural fix for the chip-vs-ring divergence
  // surfaced by the Sunkist tuna test (chip 50 cal, ring 200 cal,
  // saved 87 cal — three different numbers). Pre-9.15 the ring read
  // `originalBaseMacros × portionMultiplier + addedItemsMacros`,
  // where both `originalBaseMacros` and `addedItemsMacros` could
  // contain the SAME chip's contribution (when the chip was the
  // first-ever non-zero formData write in a Manual entry), producing
  // a 2-4x phantom multiplier. The components themselves were
  // always correct, so summing them directly gives one number that
  // chip + wheel + saved row all agree on.
  //
  // Chip values stay current because:
  //   - `handlePortionChange` rescales detected chips (using
  //     `originalComponentsPerUnit`).
  //   - The edit-modal's `onEditComponent` rescales the specific chip
  //     by nutrition density.
  //   - Add-component flows (`handleSelectNutritionOption`,
  //     `applyNutrition`, `applyComponentSwap`) push fresh nutrient
  //     values onto the new/swapped chip.
  // The ring picks up every change automatically because it derives
  // from `foodComponents`.
  //
  // `baseMacros` is retained as a public-ish name some downstream
  // children still consume; it's now an alias for `currentMacros`.
  const componentMacrosSum = useMemo(
    () => sumComponentMacrosForDisplay(foodComponents),
    [foodComponents],
  );
  const hasComponentMacros = useMemo(
    () => anyComponentHasMacros(foodComponents),
    [foodComponents],
  );
  const formDataMacros = useMemo(() => {
    // T-0377f: pre_confirm rows already picked grounded chips upstream —
    // never let stale extraction-level totals (298 cal) beat the chip sum.
    if (inputMethod === 'pre_confirm' && hasComponentMacros) {
      return sumComponentMacrosForDisplay(foodComponents);
    }
    const chip0 =
      foodComponents[0] ??
      pickPerComponentNutritionSource(extractedData as any)?.[0];
    const readMacro = (field: string): number => {
      const fromForm = Number((formData as any)[field]);
      if (Number.isFinite(fromForm) && fromForm > 0) return fromForm;
      const fromExtract = Number((extractedData as any)?.[field]);
      if (Number.isFinite(fromExtract) && fromExtract > 0) return fromExtract;
      const fromChip = Number(chip0?.[field]);
      if (Number.isFinite(fromChip)) return fromChip;
      return 0;
    };
    return {
      calories: readMacro('calories'),
      protein_g: readMacro('protein_g'),
      carbs_g: readMacro('carbs_g'),
      fat_g: readMacro('fat_g'),
      fiber_g: readMacro('fiber_g'),
      sugar_g: readMacro('sugar_g'),
      sodium_mg: readMacro('sodium_mg'),
    };
  }, [
    inputMethod,
    hasComponentMacros,
    foodComponents,
    extractedData,
    formData.calories, formData.protein_g, formData.carbs_g, formData.fat_g,
    formData.fiber_g, formData.sugar_g, formData.sodium_mg,
  ]);
  const currentMacros = useMemo(
    () => deriveCurrentMacros(foodComponents, formDataMacros),
    [foodComponents, formDataMacros],
  );
  const displayMacroState = useMemo(
    () =>
      deriveDisplayMacrosWithPendingState(foodComponents, formDataMacros, {
        repairingInFlight: repairingCalorieChipIds.size > 0,
      }),
    [foodComponents, formDataMacros, repairingCalorieChipIds],
  );
  const caloriesTotalPending = displayMacroState.totalPending;
  const saveBlockedOnCalorieRepair = displayMacroState.saveBlocked;
  // Legacy alias: `baseMacros` is still referenced by downstream
  // rendering (image overlay's `baseMacros.calories > 0` guard) and
  // by props passed into NutritionConfirmationEnhancements. With
  // currentMacros now component-driven, baseMacros can safely point
  // at the same value.
  const baseMacros = currentMacros;

  // T-0418b — same forced-FDC repair path as MatchConfirmationScreen so
  // null/NaN/zero grounded calories resolve before the user can save a
  // total that diverges from the enriched row.
  useEffect(() => {
    const toRepair = foodComponents.filter(
      c =>
        isImplausiblyZeroCalorie(c) &&
        c.fdc_id != null &&
        c.fdc_id !== '' &&
        !calorieRepairAttemptedRef.current.has(c.id),
    );
    if (toRepair.length === 0) return;

    for (const c of toRepair) {
      calorieRepairAttemptedRef.current.add(c.id);
    }
    const repairChipIds = toRepair.map(c => c.id);
    const clearRepairChipIds = () => {
      setRepairingCalorieChipIds(prev => {
        const next = new Set(prev);
        for (const id of repairChipIds) next.delete(id);
        return next;
      });
    };

    setRepairingCalorieChipIds(prev => {
      const next = new Set(prev);
      for (const id of repairChipIds) next.add(id);
      return next;
    });

    let cancelled = false;
    void (async () => {
      try {
        const { chips: repairedChips, repairedIds } = await autoRepairImplausibleZeroCalorieChips(
          toRepair,
          args => nutritionGroundingService.resolveIngredient(args),
        );
        if (cancelled) return;

        const repairedById = new Map(repairedChips.map(c => [c.id, c]));
        if (repairedIds.length > 0) {
          setFoodComponents(prev =>
            prev.map(c => (repairedById.has(c.id) ? (repairedById.get(c.id) as typeof c) : c)),
          );
        }
      } finally {
        clearRepairChipIds();
      }
    })();

    return () => {
      cancelled = true;
      clearRepairChipIds();
      // Allow a fresh attempt after cancel — foodComponents often
      // re-renders on mount (Phase 9.15 enrichment) before the first
      // resolve finishes; leaving ids in attempted would skip retry.
      for (const id of repairChipIds) {
        calorieRepairAttemptedRef.current.delete(id);
      }
    };
  }, [foodComponents]);

  // Phase 9.15 (2026-04-30) — handle portion multiplier change.
  //
  // Pre-9.15 this function mirrored the chip rescale into a separate
  // `formData.calories/...` total, derived via `originalBaseMacros *
  // newQuantity + addedItemsMacros`. With `currentMacros` now derived
  // from `foodComponents` directly, the formData mirror is dead code
  // (and was the proximate cause of the Sunkist tuna double-count).
  // We still:
  //   - Rescale `per_component_nutrition` chips in-place via the
  //     Phase-2 `originalComponentsPerUnit` snapshot, so chip values
  //     reflect the new portion.
  //   - Update `formData.quantity` (the user's chosen portion is
  //     part of the saved row).
  //   - Update `formData.per_component_nutrition` so any code path
  //     that reads from formData (legacy callers, debug logs) sees
  //     the rescaled components.
  const handlePortionChange = (newQuantity: number) => {
    if (!portionHydrationReadyRef.current) return;
    setPortionMultiplier(newQuantity);
    if (healthCategory !== 'nutrition_log') return;

    let scaledComponents: any[] | null = null;
    if (originalComponentsPerUnit && originalComponentsPerUnit.length > 0) {
      scaledComponents = rescaleComponents(originalComponentsPerUnit, newQuantity);
      // Mirror to the live UI list so chips show updated values.
      setFoodComponents(prev => {
        const userAdded = prev.filter(c => !c.detected).map(cloneChipForState);
        const prevDetected = prev.filter(c => c.detected);
        const detectedScaled = scaledComponents!.map((c: any, i: number) => {
          const carry = prevDetected[i] ? cloneChipForState(prevDetected[i] as any) : {};
          const stableId =
            (carry as { id?: string }).id ??
            (prevDetected[i] as { id?: string } | undefined)?.id ??
            `component-${i}`;
          return cloneChipForState({
            ...carry,
            ...c,
            id: stableId,
            name: c.name,
            quantity: c.quantity || 1,
            unit: c.unit || 'serving',
            detected: true,
            calories: c.calories,
            protein_g: c.protein_g,
            carbs_g: c.carbs_g,
            fat_g: c.fat_g,
            fiber_g: c.fiber_g,
            sugar_g: c.sugar_g,
            sodium_mg: c.sodium_mg,
            gramWeight: c.gramWeight,
          });
        });
        return [...detectedScaled, ...userAdded];
      });
    }

    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      ...(scaledComponents ? { per_component_nutrition: scaledComponents } : {}),
    }));
  };

  // ⚡ Phase 1.4: Handle conversational prompt answers
  const handlePromptAnswer = async (questionId: string, option: PromptOption) => {
    console.log(`💬 Prompt answered: ${questionId} → ${option.label}`);
    
    if (option.action === 'add_component' && option.value) {
      // Show estimated values IMMEDIATELY so the user sees instant feedback,
      // then refine with USDA data in the background.
      const estimated = getEstimatedNutrition(option.value);
      const componentId = `prompt-${Date.now()}`;
      
      // Phase 9.15 (2026-04-30) — `applyNutrition` no longer double-
      // writes the new chip's macros into formData + addedItemsMacros.
      // The progress wheel and image overlay derive from
      // `foodComponents` directly via `sumComponentMacrosForDisplay`,
      // so a single chip insert is a single state transition and the
      // ring advances by exactly the chip's value. Provenance tags
      // also added here so Phase 9.12 enrichment doesn't treat
      // user-confirmed chips as unresolved stubs at save time.
      const applyNutrition = (
        nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number;
          fiber_g: number; sugar_g: number; sodium_mg: number; saturated_fat_g?: number; gramWeight?: number },
        unit: string,
        label: string,
        provenance: 'ai_estimate' | 'usda_fdc',
      ) => {
        setFoodComponents(prev => {
          const existing = prev.find(c => c.id === componentId);
          if (existing) {
            // Replace estimated with USDA data; upgrade provenance
            // from 'ai_estimate' → 'usda_fdc' on refine.
            return prev.map(c =>
              c.id === componentId
                ? {
                    ...c,
                    ...nutrition,
                    unit,
                    data_source: provenance,
                    match_confidence: provenance === 'usda_fdc' ? 0.85 : 0.5,
                  }
                : c,
            );
          }
          return [
            ...prev,
            {
              id: componentId,
              name: option.value!,
              quantity: 1,
              unit,
              detected: false,
              ...nutrition,
              data_source: provenance,
              match_confidence: provenance === 'usda_fdc' ? 0.85 : 0.5,
              ai_filled_fields: [],
              corrected_fields: [],
            },
          ];
        });

        console.log(`${label} Added component: ${option.value} (+${nutrition.calories} cal, source=${provenance})`);
      };

      // Step 1: Apply estimated values instantly (tagged ai_estimate).
      applyNutrition(estimated, 'serving', '⚡', 'ai_estimate');

      // Step 2: Try USDA in background (10s max) to refine.
      nutritionDatabaseService.findNutritionData({ food_name: option.value })
        .then(result => {
          if (result.success && result.data) {
            const nutrition = result.data.nutrition_per_serving;
            // Phase 9.15: replace the estimate outright (not "diff")
            // with the USDA-refined absolute values, tagged usda_fdc.
            // Pre-9.15 this stacked diffs into `formData.calories`
            // which compounded the double-count bug; with chip-derived
            // currentMacros the chip itself is the source of truth,
            // and we want it to read the USDA value, not estimate +
            // diff.
            const refined = {
              calories: nutrition.calories ?? estimated.calories,
              protein_g: nutrition.protein_g ?? estimated.protein_g,
              carbs_g: nutrition.carbs_g ?? estimated.carbs_g,
              fat_g: nutrition.fat_g ?? estimated.fat_g,
              fiber_g: nutrition.fiber_g ?? estimated.fiber_g,
              sugar_g: nutrition.sugar_g ?? estimated.sugar_g,
              sodium_mg: nutrition.sodium_mg ?? estimated.sodium_mg,
              gramWeight: result.data.serving_size || estimated.gramWeight,
            };
            const calDelta = Math.abs((refined.calories || 0) - estimated.calories);
            // Only re-apply if USDA differs meaningfully — avoids
            // a no-op state update.
            if (calDelta > 10) {
              applyNutrition(
                refined,
                result.data.serving_unit || 'serving',
                t('unifiedConfirmation.logs.usdaRefined', '🔄 USDA refined'),
                'usda_fdc',
              );
            }
          }
        })
        .catch(err => console.warn('Background USDA lookup failed:', err));
    } else if (option.action === 'update_quantity' && option.value) {
      // Update the portion multiplier
      handlePortionChange(option.value);
    } else if (option.action === 'update_field' && option.value) {
      // Update a form field directly
      const fieldToUpdate = conversationalPrompts.find(p => p.id === questionId)?.field;
      if (fieldToUpdate) {
        setFormData(prev => ({
          ...prev,
          [fieldToUpdate]: option.value,
        }));
        console.log(`✅ Updated field ${fieldToUpdate} → ${option.value}`);
      }
    }
  };

  const handlePromptSkip = (questionId: string) => {
    console.log(`💬 Prompt skipped: ${questionId}`);
    // No action needed - ConversationalPrompts component handles this internally
  };

  const handlePromptSkipAll = () => {
    console.log('💬 All prompts skipped');
    setPromptsCompleted(true);
    setConversationalPrompts([]);
  };

  const handlePromptsComplete = () => {
    console.log('💬 All prompts answered');
    setPromptsCompleted(true);
  };

  // Phase 9.15 (2026-04-30) — handle selecting a nutrition option from
  // the "+ Add Ingredient" search results modal.
  //
  // Two changes from pre-9.15:
  //   1. Attach provenance (`data_source`, `fdc_id`, `match_confidence`,
  //      `was_user_corrected`) so Phase 9.12's `enrichUnresolvedStubs`
  //      no longer treats this chip as a bare LLM stub. Without this,
  //      saving a Sunkist tuna pick would silently re-resolve the
  //      chip through the grounding chain and overwrite the user's
  //      panel with the Phase 9.14 pantry fallback (87 cal at 0.75
  //      portion vs the user's chosen 67.5 cal).
  //   2. Forward the FULL nutrient bag from `nutrition_per_serving`
  //      onto the chip — pre-9.15 only the 7 dashboard macros were
  //      copied, so user-picked panels arrived at the save path with
  //      vit D / B12 / omega-3 missing. The Phase 9.15 "fill-only-
  //      missing" pass can backfill what's still missing without
  //      overwriting macros, but the more we forward verbatim from
  //      the user's pick, the less work remains for that pass.
  //   3. Stop mirroring the chip's macros into formData /
  //      addedItemsMacros — the progress wheel derives from
  //      `foodComponents` directly via `sumComponentMacrosForDisplay`.
  const handleSelectNutritionOption = async (selectedOption: NutritionData) => {
    const hasBarcode = (selectedOption.barcode?.trim().length ?? 0) >= 8;
    const hasFdc = !!selectedOption.fdc_id;

    if (hasBarcode || hasFdc) {
      setLookingUpNutrition(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const stamp = `user-added-${Date.now()}`;
        const result = await resolveSearchPickToChip(
          { id: stamp, detected: false, quantity: 1, unit: 'serving' },
          selectedOption,
          args => nutritionGroundingService.resolveIngredient({ ...args, userId: user?.id }),
        );
        if (!result.ok) {
          Alert.alert(
            t('unifiedConfirmation.alerts.cantApplyMatch', 'Could not apply this match'),
            result.reason === 'implausible_density'
              ? t('unifiedConfirmation.alerts.implausibleDensity', 'The selected match looks off (the calories are implausibly high for this portion). Please try a different option.')
              : t('unifiedConfirmation.alerts.noUsableData', 'This search result has no usable nutrition data. Try a different option or search again.'),
          );
          return;
        }
        console.log('✅ User selected (re-grounded):', selectedOption.food_name);
        setFoodComponents((prev) => {
          const next = [...prev, result.chip as any];
          syncLiveComponentsToFormData(next, (fd) => {
            const merged = reconcileFoodItemLabelWithComponents(fd.food_item, next);
            return merged && merged !== fd.food_item ? { ...fd, food_item: merged } : fd;
          });
          return next;
        });
      } catch (err) {
        console.warn('[UnifiedConfirmation] add-ingredient search pick failed:', err);
        Alert.alert(t('unifiedConfirmation.alerts.lookupFailed', 'Lookup failed'), t('unifiedConfirmation.alerts.cantApplyFoodMatch', 'Could not apply this food match. Please try again.'));
      } finally {
        setLookingUpNutrition(false);
        setShowNutritionOptionsModal(false);
        setNutritionOptions([]);
        setPendingIngredientName('');
      }
      return;
    }

    const nutrition = selectedOption.nutrition_per_serving;
    console.log('✅ User selected:', selectedOption.food_name, '-', nutrition.calories, 'cal');

    const newComponent = nutritionDataToComponentFields(
      selectedOption,
      `user-added-${Date.now()}`,
    );

    setFoodComponents((prev) => {
      const next = [...prev, newComponent];
      syncLiveComponentsToFormData(next, (fd) => {
        const merged = reconcileFoodItemLabelWithComponents(fd.food_item, next);
        return merged && merged !== fd.food_item ? { ...fd, food_item: merged } : fd;
      });
      return next;
    });

    setShowNutritionOptionsModal(false);
    setNutritionOptions([]);
    setPendingIngredientName('');
  };

  /**
   * Phase 9.17 — append chips from Quick Add payload inside Add Ingredient modal.
   */
  const appendQuickAddLogAsChips = (log: Partial<NutritionLog>) => {
    const raw = log as any;
    const per = raw.per_component_nutrition;
    if (Array.isArray(per) && per.length > 0) {
      const stamp = Date.now();
      const newChips = per.map((comp: any, index: number) =>
        cloneChipForState({
          ...comp,
          id: `user-added-${stamp}-${index}`,
          detected: false,
        }),
      );
      setFoodComponents((prev) => {
        const next = [...prev, ...newChips];
        syncLiveComponentsToFormData(next, (fd) => {
          const merged = reconcileFoodItemLabelWithComponents(fd.food_item, next);
          return merged && merged !== fd.food_item ? { ...fd, food_item: merged } : fd;
        });
        return next;
      });
      return;
    }
    const syn = syntheticComponentFromFlatRow(raw as Record<string, unknown>, {
      dataSource: 'user_input',
    });
    if (syn) {
      setFoodComponents((prev) => {
        const next = [...prev, { ...syn, id: `user-added-${Date.now()}`, detected: false } as any];
        syncLiveComponentsToFormData(next, (fd) => {
          const merged = reconcileFoodItemLabelWithComponents(fd.food_item, next);
          return merged && merged !== fd.food_item ? { ...fd, food_item: merged } : fd;
        });
        return next;
      });
    }
  };

  /**
   * Phase 13.3 (2026-05-03): cross-platform "+ Add" ingredient name capture.
   * `Alert.prompt` is iOS-only — on Android / Expo Go the Add button was a no-op.
   */
  const runAddIngredientNameSearch = async (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    setShowAddComponentModal(false);
    setLookingUpNutrition(true);
    setPendingIngredientName(trimmed);
    try {
      console.log('🔍 Looking up nutrition options for:', trimmed);
      const { data: { user } } = await supabase.auth.getUser();
      const options = await nutritionDatabaseService.findMultipleNutritionOptions(
        { food_name: trimmed, userId: user?.id },
        6,
      );

      if (options && options.length > 0) {
        console.log(`✅ Found ${options.length} nutrition options for`, trimmed);
        setNutritionOptions(options);
        setShowNutritionOptionsModal(true);
      } else {
        console.log('⚠️ No nutrition options found for:', trimmed);
        Alert.alert(
          t('unifiedConfirmation.alerts.noResultsFound', 'No Results Found'),
          t('unifiedConfirmation.alerts.cantFindNutrition', `Couldn't find nutrition data for "{{trimmed}}". Would you like to add it without nutrition info?`, { trimmed }),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
              text: t('unifiedConfirmation.buttons.addAnyway', 'Add Anyway'),
              onPress: () => {
                setFoodComponents(prev => [
                  ...prev,
                  {
                    id: `user-added-${Date.now()}`,
                    name: trimmed,
                    quantity: 1,
                    unit: 'serving',
                    detected: false,
                  },
                ]);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Error looking up nutrition:', error);
      Alert.alert(
        t('unifiedConfirmation.alerts.searchError', 'Search Error'),
        t('unifiedConfirmation.alerts.errorSearching', `Error searching for "{{trimmed}}". Would you like to add it without nutrition info?`, { trimmed }),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('unifiedConfirmation.buttons.addAnyway', 'Add Anyway'),
            onPress: () => {
              setFoodComponents(prev => [
                ...prev,
                {
                  id: `user-added-${Date.now()}`,
                  name: trimmed,
                  quantity: 1,
                  unit: 'serving',
                  detected: false,
                },
              ]);
            },
          },
        ],
      );
    } finally {
      setLookingUpNutrition(false);
    }
  };

  /**
   * Phase 9.4 (2026-04-27): apply a fresh resolution to an existing chip.
   * Used by both swap paths:
   *   - User picks an alternative → re-resolve with `forcedFdcId`.
   *   - User picks a search result → use that NutritionData directly.
   *
   * The chip's quantity / unit are preserved (we only swap the *match*,
   * not the portion). Form-level macro totals are adjusted by the delta
   * between the old and new component nutrient values so the aggregate
   * stays consistent without a full recompute.
   */
  const applyComponentSwap = (
    componentId: string,
    nextValues: {
      name: string;
      brand?: string;
      fdc_id?: string;
      data_source?: string;
      match_confidence?: number;
      gramWeight: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g: number;
      sugar_g: number;
      sodium_mg: number;
      ai_filled_fields?: string[];
      alternatives?: any[];
      // Phase 9.4.5 (2026-04-27): full nutrient bag from the grounding
      // service. When provided, every numeric nutrient field on this
      // record overwrites the prior value on the component, instead of
      // leaving stale micros from the previous match in place. Strings
      // / structural fields are ignored.
      nutrients?: Record<string, any>;
    },
  ) => {
    setFoodComponents(prev => {
      const idx = prev.findIndex(c => c.id === componentId);
      if (idx < 0) return prev;
      const old = prev[idx];
      const updated = [...prev];
      // Phase 9.4.5 (2026-04-27): clear stale micros from the previous
      // match before applying the new one. Without this, a swap from
      // "Salmon, raw" (high omega-3) to "Tilapia, raw" (low omega-3)
      // would silently inherit Salmon's omega-3.
      const cleared: Record<string, any> = {};
      for (const f of RECONCILIABLE_NUTRIENTS) {
        if (typeof (old as any)[f] === 'number') cleared[f] = undefined;
      }
      const nutrientPatch: Record<string, any> = {};
      if (nextValues.nutrients && typeof nextValues.nutrients === 'object') {
        for (const f of RECONCILIABLE_NUTRIENTS) {
          const v = (nextValues.nutrients as any)[f];
          if (typeof v === 'number' && Number.isFinite(v)) {
            nutrientPatch[f] = v;
          }
        }
      }
      updated[idx] = {
        ...old,
        ...cleared,
        ...nutrientPatch,
        name: nextValues.name,
        brand: nextValues.brand,
        fdc_id: nextValues.fdc_id,
        data_source: nextValues.data_source,
        match_confidence: nextValues.match_confidence,
        gramWeight: nextValues.gramWeight,
        calories: nextValues.calories,
        protein_g: nextValues.protein_g,
        carbs_g: nextValues.carbs_g,
        fat_g: nextValues.fat_g,
        fiber_g: nextValues.fiber_g,
        sugar_g: nextValues.sugar_g,
        sodium_mg: nextValues.sodium_mg,
        ai_filled_fields: nextValues.ai_filled_fields ?? [],
        alternatives: Array.isArray(nextValues.alternatives) ? nextValues.alternatives : old.alternatives,
        was_user_corrected: true,
        needs_user_review: false,
      };

      // Adjust the row's aggregate macros by the delta. We work directly
      // with `setFormData` here rather than recomputing from scratch so
      // any user-edited values on other components survive the swap.
      const dCal = (nextValues.calories || 0) - (old.calories || 0);
      const dPro = (nextValues.protein_g || 0) - (old.protein_g || 0);
      const dCarb = (nextValues.carbs_g || 0) - (old.carbs_g || 0);
      const dFat = (nextValues.fat_g || 0) - (old.fat_g || 0);
      const dFiber = (nextValues.fiber_g || 0) - (old.fiber_g || 0);
      const dSugar = (nextValues.sugar_g || 0) - (old.sugar_g || 0);
      const dSod = (nextValues.sodium_mg || 0) - (old.sodium_mg || 0);
      setFormData(p => {
        const reconciledLabel = reconcileFoodItemLabelWithComponents(p.food_item, updated);
        return {
          ...p,
          ...(reconciledLabel && reconciledLabel !== p.food_item
            ? { food_item: reconciledLabel }
            : {}),
          calories: Math.max(0, Math.round((Number(p.calories) || 0) + dCal)),
          protein_g: Math.max(0, Math.round(((Number(p.protein_g) || 0) + dPro) * 10) / 10),
          carbs_g: Math.max(0, Math.round(((Number(p.carbs_g) || 0) + dCarb) * 10) / 10),
          fat_g: Math.max(0, Math.round(((Number(p.fat_g) || 0) + dFat) * 10) / 10),
          fiber_g: Math.max(0, Math.round(((Number(p.fiber_g) || 0) + dFiber) * 10) / 10),
          sugar_g: Math.max(0, Math.round(((Number(p.sugar_g) || 0) + dSugar) * 10) / 10),
          sodium_mg: Math.max(0, Math.round((Number(p.sodium_mg) || 0) + dSod)),
          per_component_nutrition: componentsForFormMirror(updated as any),
        };
      });
      componentsUserEditedRef.current = true;

      console.log('🔄 component swapped', {
        id: componentId, from: old.name, to: nextValues.name,
        dCal: Math.round(dCal), dPro: Math.round(dPro * 10) / 10,
      });
      foodComponentsRef.current = updated;
      return updated;
    });
  };

  /**
   * Phase 9.4: user picked one of the surfaced top-K USDA alternatives.
   * Re-resolve via the grounding service with `forcedFdcId` so we get
   * THAT row's nutrients verbatim, scaled to the chip's portion.
   */
  const handlePickerSelectAlternative = async (
    componentId: string,
    alt: IngredientPickerAlternative,
  ) => {
    const component = foodComponents.find(c => c.id === componentId);
    if (!component) return;

    setSwappingComponentId(componentId);
    setPickerComponentId(null);
    try {
      // T-0377f: explicit search/alt pick — USDA serving, not extraction grams.
      const resolved = await resolveForcedFdcAtUsdaServing(
        { fdc_id: alt.fdc_id, name: alt.name, brand: alt.brand },
        args => nutritionGroundingService.resolveIngredient(args),
      );
      const grams =
        resolved.gramWeight ??
        component.gramWeight ??
        portionToGrams(component.quantity || 1, component.unit, { name: component.name });
      const n: any = resolved.nutrients || {};
      applyComponentSwap(componentId, {
        name: resolved.name || alt.name,
        brand: resolved.brand || alt.brand,
        fdc_id: resolved.fdc_id || alt.fdc_id,
        data_source: resolved.data_source,
        match_confidence: resolved.match_confidence,
        gramWeight: resolved.gramWeight ?? grams,
        calories: Number(n.calories) || 0,
        protein_g: Number(n.protein_g) || 0,
        carbs_g: Number(n.carbs_g) || 0,
        fat_g: Number(n.fat_g) || 0,
        fiber_g: Number(n.fiber_g) || 0,
        sugar_g: Number(n.sugar_g) || 0,
        sodium_mg: Number(n.sodium_mg) || 0,
        ai_filled_fields: resolved.ai_filled_fields,
        alternatives: resolved.alternatives,
        nutrients: n,
      });
    } catch (err) {
      console.warn('[UnifiedConfirmation] forced FDC swap failed:', err);
    } finally {
      setSwappingComponentId(null);
    }
  };

  /**
   * Phase 9.4: user picked a result from the picker's "Search for a
   * different food" escape hatch. NutritionData rows already carry
   * full nutrition; scale them to the chip's existing portion.
   *
   * Phase 9.4.4 (2026-04-27): unit-safe rewrite. The previous version
   * naively assumed `option.serving_size` was always grams, but cache
   * rows can store `serving_size: 1` with `serving_unit: 'piece'` /
   * `'serving'` (calories already represent the whole piece). Treating
   * `1` as 1 gram and scaling `oldGrams / 1 = 100×` produced ~9 000 kcal
   * for a single tortilla. We now:
   *   1. If the option has an `fdc_id`, route through the grounding
   *      service with `forcedFdcId` (same robust path as the
   *      alternative-picker — handles per-100g normalisation and unit
   *      conversion canonically).
   *   2. Otherwise, convert the option's serving to grams using
   *      `portionToGrams` (which understands `piece`, `serving`,
   *      `cup`, etc.) before scaling.
   *   3. Sanity-clamp: if the resulting calorie density exceeds 9 kcal/g
   *      (impossible — pure fat is ~9 kcal/g), abort the swap and warn.
   */
  const handlePickerSelectSearchResult = async (
    componentId: string,
    option: NutritionData,
  ) => {
    const component = foodComponents.find(c => c.id === componentId);
    if (!component) return;
    const oldGrams = component.gramWeight ?? portionToGrams(
      component.quantity || 1, component.unit, { name: component.name },
    );

    const barcode = typeof option.barcode === 'string' ? option.barcode.trim() : '';
    if (barcode.length >= 8) {
      setSwappingComponentId(componentId);
      setPickerComponentId(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const resolved = await nutritionGroundingService.resolveIngredient({
          name: option.food_name,
          brand: option.brand,
          barcode,
          userId: user?.id,
          quantity: 1,
          unit: 'serving',
          wasUserCorrected: true,
        });
        const n: any = resolved.nutrients || {};
        applyComponentSwap(componentId, {
          name: resolved.name || option.food_name,
          brand: resolved.brand || option.brand,
          fdc_id: resolved.fdc_id,
          data_source: resolved.data_source ?? (option as any).data_source ?? 'database_lookup',
          match_confidence: resolved.match_confidence ?? (option as any).confidence ?? 0.95,
          gramWeight: resolved.gramWeight ?? oldGrams,
          calories: Number(n.calories) || 0,
          protein_g: Number(n.protein_g) || 0,
          carbs_g: Number(n.carbs_g) || 0,
          fat_g: Number(n.fat_g) || 0,
          fiber_g: Number(n.fiber_g) || 0,
          sugar_g: Number(n.sugar_g) || 0,
          sodium_mg: Number(n.sodium_mg) || 0,
          ai_filled_fields: resolved.ai_filled_fields,
          alternatives: resolved.alternatives,
          nutrients: n,
        });
      } catch (err) {
        console.warn('[UnifiedConfirmation] search-result barcode swap failed:', err);
      } finally {
        setSwappingComponentId(null);
      }
      return;
    }

    // Path 1: option has an FDC id → resolve via grounding service so
    // grams + per-100g scaling are handled canonically (matches the
    // alternative-picker behaviour). This path also fills in micro-
    // nutrients we wouldn't otherwise have on cache rows.
    const fdcId = (option as any).fdc_id;
    if (fdcId) {
      setSwappingComponentId(componentId);
      setPickerComponentId(null);
      try {
        const resolved = await resolveForcedFdcAtUsdaServing(
          { fdc_id: String(fdcId), name: option.food_name, brand: option.brand },
          args => nutritionGroundingService.resolveIngredient(args),
        );
        const n: any = resolved.nutrients || {};
        applyComponentSwap(componentId, {
          name: resolved.name || option.food_name,
          brand: resolved.brand || option.brand,
          fdc_id: resolved.fdc_id || String(fdcId),
          data_source: resolved.data_source ?? (option as any).data_source ?? 'database_lookup',
          match_confidence: resolved.match_confidence ?? (option as any).confidence ?? 0.85,
          gramWeight: resolved.gramWeight ?? oldGrams,
          calories: Number(n.calories) || 0,
          protein_g: Number(n.protein_g) || 0,
          carbs_g: Number(n.carbs_g) || 0,
          fat_g: Number(n.fat_g) || 0,
          fiber_g: Number(n.fiber_g) || 0,
          sugar_g: Number(n.sugar_g) || 0,
          sodium_mg: Number(n.sodium_mg) || 0,
          ai_filled_fields: resolved.ai_filled_fields,
          alternatives: resolved.alternatives,
          nutrients: n,
        });
      } catch (err) {
        console.warn('[UnifiedConfirmation] search-result FDC swap failed:', err);
      } finally {
        setSwappingComponentId(null);
      }
      return;
    }

    // Path 2: no FDC id (e.g. AI-estimated cache row). Convert the
    // option's serving to grams properly via portionToGrams, which
    // knows that `1 piece` ≠ `1 gram`.
    const optionServingSize = Number((option as any).serving_size) > 0
      ? Number((option as any).serving_size)
      : 1;
    const optionServingUnit = String((option as any).serving_unit || 'serving').toLowerCase();
    let optionGrams: number;
    if (optionServingUnit === 'g' || optionServingUnit === 'gram' || optionServingUnit === 'grams') {
      optionGrams = optionServingSize;
    } else {
      optionGrams = portionToGrams(optionServingSize, optionServingUnit, {
        name: option.food_name,
      });
    }
    if (!(optionGrams > 0)) optionGrams = 100;

    // Prefer per-100g if the row carried it; otherwise treat
    // nutrition_per_serving as values for `optionGrams` grams.
    const np100 = (option as any).nutrition_per_100g;
    const usePer100g = np100 && Number(np100.calories) > 0;
    const np = usePer100g
      ? np100
      : ((option as any).nutrition_per_serving || {});
    const factor = usePer100g
      ? (oldGrams > 0 ? oldGrams / 100 : 1)
      : (oldGrams > 0 && optionGrams > 0 ? oldGrams / optionGrams : 1);

    const swappedCalories = Math.round((Number(np.calories) || 0) * factor);

    // Sanity guard: 9 kcal/g is the calorie density of pure fat — anything
    // higher is mathematically impossible for a real food. Abort to keep a
    // unit-conversion bug from corrupting the user's totals.
    const calsPerGram = oldGrams > 0 ? swappedCalories / oldGrams : 0;
    if (calsPerGram > 9.5) {
      console.warn('[UnifiedConfirmation] swap aborted — implausible calorie density', {
        food: option.food_name,
        oldGrams,
        optionGrams,
        optionServingSize,
        optionServingUnit,
        npCalories: Number(np.calories) || 0,
        usePer100g,
        factor: +factor.toFixed(3),
        swappedCalories,
        calsPerGram: +calsPerGram.toFixed(2),
      });
      setPickerComponentId(null);
      Alert.alert(
        t('unifiedConfirmation.alerts.cantApplyMatch', 'Could not apply this match'),
        t('unifiedConfirmation.alerts.implausibleDensitySwap', `The selected match looks off (would be ~{{swappedCalories}} kcal for {{oldGrams}}g). Please try a different option.`, { swappedCalories, oldGrams }),
      );
      return;
    }

    setPickerComponentId(null);
    // Phase 9.4.5 (2026-04-27): if the cached `np` block carries any
    // micros (vitamins, minerals, amino acids, sat fat, omega-3/6, etc.)
    // scale them by the same factor and forward to the swap. This is
    // best-effort — most cached options only carry the 7 macros, and
    // when they don't, the row simply won't gain new micros from this
    // swap (they'll come back in a later FDC-grounded re-resolve).
    const scaledNutrients: Record<string, number> = {};
    for (const f of RECONCILIABLE_NUTRIENTS) {
      const v = (np as any)[f];
      if (typeof v === 'number' && Number.isFinite(v)) {
        scaledNutrients[f] = +(v * factor).toFixed(4);
      }
    }
    applyComponentSwap(componentId, {
      name: option.food_name,
      brand: option.brand,
      fdc_id: (option as any).fdc_id,
      data_source: (option as any).data_source ?? 'database_lookup',
      match_confidence: (option as any).confidence ?? 0.85,
      gramWeight: oldGrams,
      calories: swappedCalories,
      protein_g: Math.round(((Number(np.protein_g) || 0) * factor) * 10) / 10,
      carbs_g: Math.round(((Number(np.carbs_g) || 0) * factor) * 10) / 10,
      fat_g: Math.round(((Number(np.fat_g) || 0) * factor) * 10) / 10,
      fiber_g: Math.round(((Number(np.fiber_g) || 0) * factor) * 10) / 10,
      sugar_g: Math.round(((Number(np.sugar_g) || 0) * factor) * 10) / 10,
      sodium_mg: Math.round((Number(np.sodium_mg) || 0) * factor),
      nutrients: scaledNutrients,
    });
  };

  /**
   * Phase 9.4: open the picker for a specific component. Records that
   * the user manually opened it so the auto-pop logic doesn't re-trigger.
   */
  const openPickerForComponent = (componentId: string, reason?: string) => {
    setPickerComponentId(componentId);
    setPickerReason(reason ?? null);
    setAutoPoppedIds(prev => {
      const next = new Set(prev);
      next.add(componentId);
      return next;
    });
  };

  const openPortionEditorFromAlert = (componentId: string | undefined) => {
    if (!componentId) return;
    InteractionManager.runAfterInteractions(() => {
      setRequestEditComponentId(componentId);
    });
  };

  const openPickerFromAlert = (componentId: string | undefined) => {
    openPortionEditorFromAlert(componentId);
  };

  const resolveOffenderChipId = (
    offenderName: string,
    blockedChip: Record<string, unknown> | null,
  ): string | undefined => {
    if (typeof blockedChip?.id === 'string') return blockedChip.id;
    const normalized = offenderName.trim().toLowerCase();
    const byName = foodComponents.find(
      c => String(c.name ?? '').trim().toLowerCase() === normalized,
    );
    if (typeof byName?.id === 'string') return byName.id;
    const first = foodComponents.find(c => typeof c.name === 'string' && c.name.trim().length > 0);
    return typeof first?.id === 'string' ? first.id : undefined;
  };

  const handleGateClarifySelect = useCallback(async (option: ClarifyQuestionOption) => {
    const payload = gateClarifyPayload;
    if (!payload) return;
    const { chipId, kind } = payload;
    setGateClarifyVisible(false);
    setGateClarifyPayload(null);

    const retrySave = () => {
      InteractionManager.runAfterInteractions(() => {
        releaseSaveInFlight();
        void handleConfirmRef.current?.();
      });
    };

    if (kind === 'identity') {
      if (option.isNoneOfThese) {
        openPickerForComponent(chipId, t('unifiedConfirmation.prompts.pickCorrectMatch', 'Pick the correct match'));
        releaseSaveInFlight();
        return;
      }
      await handlePickerSelectAlternative(chipId, option.alternative as IngredientPickerAlternative);
      retrySave();
      return;
    }

    if (isPortionTypeItOption(option)) {
      openPortionEditorFromAlert(chipId);
      releaseSaveInFlight();
      return;
    }

    const candidate = portionCandidateFromOption(option);
    if (candidate) {
      const component = foodComponents.find(c => c.id === chipId);
      if (component) {
        const qty0 = Number(component.quantity) || 1;
        let originalGrams = Number((component as any).gramWeight);
        if (!Number.isFinite(originalGrams) || originalGrams <= 0) {
          originalGrams = chipEditGramsForUnit(qty0, component.unit, {
            name: component.name,
            foodClass: (component as any).foodClass,
            foodPortions: (component as any).food_portions,
          }).grams;
        }
        const scale = candidate.gramWeight / originalGrams;
        const roundG = (x: number) => Math.round(x * 10) / 10;
        const nu = normalisePortionUnit(candidate.unit);
        setFoodComponents(prev => {
          const next = prev.map(c => {
          if (c.id !== chipId) return c;
          const nextChip: Record<string, unknown> = {
            ...cloneChipForState(c as any),
            quantity: candidate.quantity,
            unit: nu,
            gramWeight: candidate.gramWeight,
            portion_authored_by: 'user',
            was_user_corrected: true,
          };
          for (const f of RECONCILIABLE_NUTRIENTS) {
            const v = (c as any)[f];
            if (typeof v !== 'number' || !Number.isFinite(v)) continue;
            const nv = v * scale;
            if (f === 'calories') nextChip[f] = Math.round(nv);
            else if (f.endsWith('_mg') || f.endsWith('_mcg')) nextChip[f] = Math.round(nv);
            else nextChip[f] = roundG(nv);
          }
          return nextChip as typeof c;
        });
          foodComponentsRef.current = next;
          return next;
        });
      }
    }
    retrySave();
  }, [
    gateClarifyPayload,
    foodComponents,
    openPickerForComponent,
    handlePickerSelectAlternative,
    releaseSaveInFlight,
    openPortionEditorFromAlert,
  ]);

  // Phase 9.4: auto-pop the picker for the FIRST component flagged
  // `needs_user_review` after the components state is populated. We only
  // auto-pop once per component (tracked in `autoPoppedIds`) so the
  // modal doesn't keep reopening if the user dismisses it.
  //
  // Phase 14: skip auto-pop when inputMethod === 'pre_confirm' — the user
  // already confirmed all matches in MatchConfirmationScreen; double-prompting
  // would be confusing.
  useEffect(() => {
    if (pickerComponentId) return;
    if (inputMethod === 'pre_confirm') return; // Phase 14: already confirmed upstream
    const target = foodComponents.find(c =>
      c.needs_user_review &&
      !autoPoppedIds.has(c.id) &&
      Array.isArray(c.alternatives) &&
      c.alternatives.length > 0,
    );
    if (target) {
      setPickerComponentId(target.id);
      setPickerReason(t('unifiedConfirmation.prompts.matchUncertain', 'This match looks uncertain — pick the right one'));
      setAutoPoppedIds(prev => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
    }
  }, [foodComponents, autoPoppedIds, pickerComponentId, inputMethod]);

  // Initialize food components from extracted data
  useEffect(() => {
    if (shouldSkipComponentHydration(componentsUserEditedRef.current)) {
      portionHydrationReadyRef.current = true;
      return;
    }
    portionHydrationReadyRef.current = false;
    if (healthCategory === 'nutrition_log' && extractedData) {
      // Check multiple possible locations for detected objects
      const components = 
        extractedData.components || 
        extractedData.detected_components || 
        extractedData.data_json?.detected_objects ||  // From Vision API
        extractedData.detected_objects ||
        [];
      
      console.log('🍽️ Initializing food components from:', {
        hasComponents: !!extractedData.components,
        hasDetectedComponents: !!extractedData.detected_components,
        hasDataJsonDetectedObjects: !!extractedData.data_json?.detected_objects,
        hasDetectedObjects: !!extractedData.detected_objects,
        components: components,
        foodItem: formData.food_item,
      });
      
      // Filter out non-food items like plate, fork, etc.
      const nonFoodItems = ['plate', 'bowl', 'fork', 'knife', 'spoon', 'cup', 'glass', 'napkin', 'table'];

      // RC-M (2026-06-13): hydrate from `per_component_nutrition` BEFORE the
      // name-only `components` branch. A barcode payload can carry both: a
      // name-only stub list AND a full OFF panel. Pre-RC-M the stub branch
      // won, yielding macro-less chips while `formData` (populated by
      // `loadFormConfiguration`) held the real values — so the confirmation
      // screen's macro rings rendered 0/0/0 until save.
      //
      // Phase 13.1 (2026-05-02): also check `formData.per_component_nutrition`.
      // The route-param payload from `showConfirmation({ extractedData })` is
      // sometimes reshaped by React Navigation / formPrepopulationService —
      // the extracted-data snapshot we read here can lose array-of-object
      // siblings while `formData` (which feeds save) still has them. Falling
      // through to `formData.per_component_nutrition` keeps the chip the
      // user actually scanned even when the route-param copy was stripped.
      const perComponentNutrition = pickPerComponentNutritionSource(
        extractedData as any,
        formData as any,
      );

      if (Array.isArray(perComponentNutrition) && perComponentNutrition.length > 0) {
        const pcnHydrationSig = JSON.stringify(
          perComponentNutrition.map((c: any) => ({
            fdc: c.fdc_id,
            cal: c.calories,
            gw: c.gramWeight,
            gpu: c.grams_per_unit,
            corrected: c.was_user_corrected,
          })),
        );
        if (
          componentHydrationSigRef.current === pcnHydrationSig &&
          portionHydrationReadyRef.current
        ) {
          return;
        }
        componentHydrationSigRef.current = pcnHydrationSig;

        console.log(
          '✅ Using structured per_component_nutrition with full macros:',
          perComponentNutrition.map((c: any) => `${c.name}: ${c.calories} cal, ${c.fat_g}g fat`),
        );

        const mapPcnToFoodComponents = (pcn: any[]) =>
          pcn.map((comp: any, index: number) => ({
            ...comp,
            id: `component-${index}`,
            name: comp.name,
            brand: comp.brand,
            quantity: comp.quantity || 1,
            unit: comp.unit || 'serving',
            detected: true,
            calories: comp.calories,
            protein_g: comp.protein_g,
            carbs_g: comp.carbs_g,
            fat_g: comp.fat_g,
            fiber_g: comp.fiber_g,
            sugar_g: comp.sugar_g,
            sodium_mg: comp.sodium_mg,
            gramWeight: comp.gramWeight,
            fdc_id: comp.fdc_id,
            data_source: comp.data_source,
            match_confidence: comp.match_confidence,
            alternatives: Array.isArray(comp.alternatives) ? comp.alternatives : [],
            needs_user_review: !!comp.needs_user_review,
            ai_filled_fields: Array.isArray(comp.ai_filled_fields) ? comp.ai_filled_fields : [],
            was_user_corrected: !!comp.was_user_corrected,
          }));

        const applyHydratedPcn = (pcn: any[], useUsdaServingBase = false) => {
          // T-0534: pre_confirm chips are already portion-grounded upstream
          // (MatchConfirmation). Row-level quantity may carry gram weight
          // (e.g. 240) — never treat that as a meal serving multiplier.
          const mealContextForSnapshot =
            inputMethod === 'pre_confirm' || useUsdaServingBase
              ? { quantity: 1, unit: 'serving' as const }
              : {
                  quantity: Number(formData.quantity) || undefined,
                  servings: Number(formData.servings) || undefined,
                  unit: formData.unit?.toString(),
                  extractedQuantity:
                    Number((extractedData as any)?.quantity) ||
                    Number((extractedData as any)?.data_json?.quantity) ||
                    undefined,
                };
          const perUnit = buildPerUnitComponentSnapshot(pcn, mealContextForSnapshot);
          setOriginalComponentsPerUnit(perUnit);
          const mapped = mapPcnToFoodComponents(pcn).map((comp) => {
            const copy = cloneChipForState(comp);
            applyPreSaveRepairsToDisplayComponent(copy);
            return copy;
          });
          setFoodComponents(mapped);
          console.log('✅ Initialized', pcn.length, 'components with FULL nutrition from extraction');
          if (inputMethod === 'pre_confirm') {
            setFormData(fd =>
              mergeRowTotalsFromPerComponent(
                { ...fd, per_component_nutrition: mapped },
                pcn as any,
              ),
            );
          }
          portionHydrationReadyRef.current = true;
        };

        const needsUsdaServingNormalize =
          inputMethod === 'pre_confirm' &&
          perComponentNutrition.some(
            (c: any) => c.was_user_corrected && c.fdc_id != null && c.fdc_id !== '',
          );

        const pcnForHydrate = needsUsdaServingNormalize
          ? normalizeCorrectedComponentsForDisplay(perComponentNutrition as any[])
          : (perComponentNutrition as any[]);

        if (needsUsdaServingNormalize) {
          console.log(
            '[UnifiedConfirmation] pre_confirm label-serving normalize:',
            pcnForHydrate.map((c: any) => `${c.name}: ${c.calories} cal @ ${c.gramWeight}g`),
          );
        }

        applyHydratedPcn(pcnForHydrate, needsUsdaServingNormalize);
        return;
      }
      
      if (Array.isArray(components) && components.length > 0) {
        const foodComponents = components.filter((c: any) => {
          const name = typeof c === 'string' ? c.toLowerCase() : (c.name || c.item || '').toLowerCase();
          return !nonFoodItems.some(nf => name.includes(nf));
        });
        
        setFoodComponents(foodComponents.map((c: any, index: number) => ({
          id: `component-${index}`,
          name: typeof c === 'string' ? c : c.name || c.item || 'Unknown',
          quantity: c.quantity || 1,
          unit: c.unit || 'serving',
          detected: true,
        })));
        console.log('✅ Initialized', foodComponents.length, 'food components from array');
      } else if (
        formData.food_item ||
        extractedData?.food_item ||
        extractedData?.data_json?.food_item
      ) {
        // ⚡ FIX: Parse compound food names like "burger with lettuce with tomato with cheese"
        // Phase 12.6: fall back to `extractedData.food_item` so the first effect run
        // (before async `loadFormConfiguration` fills `formData`) still hydrates
        // `foodComponents` + full micros from `per_component_nutrition` — Quick Add,
        // suggestions, etc.
        const foodItemStr = String(
          formData.food_item ||
            extractedData?.food_item ||
            extractedData?.data_json?.food_item ||
            '',
        );
        
        // FALLBACK: Try to extract per-component nutrition from notes field
        // Format: "Components: burger (~1burger: 520 cal, 20.6g protein), lettuce (~1serving: 40 cal, 1.8g protein)"
        const notesStr = String(formData.notes || '');
        const componentNutrition: Record<string, { quantity: number; unit: string; calories: number; protein_g: number }> = {};
        
        // Parse format: "burger (~1burger: 715 cal, 36.4g protein)" 
        // to extract quantity, unit, and nutrition
        const componentMatches = notesStr.match(/(\w+)\s*\(~?([\d.]+)(\w+):\s*(\d+)\s*cal,\s*([\d.]+)g\s*protein\)/gi);
        if (componentMatches) {
          componentMatches.forEach(match => {
            // Format: "burger (~1burger: 715 cal, 36.4g protein)"
            const parsed = match.match(/(\w+)\s*\(~?([\d.]+)(\w+):\s*(\d+)\s*cal,\s*([\d.]+)g\s*protein\)/i);
            if (parsed) {
              componentNutrition[parsed[1].toLowerCase()] = {
                quantity: parseFloat(parsed[2]),
                unit: parsed[3],
                calories: parseInt(parsed[4]),
                protein_g: parseFloat(parsed[5]),
              };
            }
          });
          console.log('📊 Parsed per-component nutrition from notes (fallback):', componentNutrition);
        }
        
        // Helper to estimate gram weight from quantity/unit (canonical path).
        const gramsForPortion = (qty: number, unit: string, foodName?: string): number =>
          portionToGrams(qty, unit, { name: foodName });
        
        // Parse compound food names into individual ingredients.
        // Handles: "X with Y, Z, and W", "X (Y, Z, W)", comma-separated lists, "and" separators
        const parseCompoundFood = (name: string): string[] => {
          // Phase 11.1 (2026-05-01): suggestion-tap is always a single
          // structured candidate from the recommender. Anything in
          // parentheses (e.g. "Grilled chicken breast (4 oz)") is a
          // portion descriptor, NOT an ingredient list. Splitting on
          // parens here previously created phantom chips like
          // "Grilled chicken breast" + "4 oz" both at 0 cal.
          if (inputMethod === 'suggestion') {
            return [name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name];
          }
          // Extract parenthetical ingredients: "chicken stir fry (chicken, rice, vegetables)"
          const parenMatch = name.match(/^(.+?)\s*\((.+)\)\s*$/);
          if (parenMatch) {
            const mainDish = parenMatch[1].trim();
            const inner = parenMatch[2];
            const innerParts = inner.split(/,\s*(?:and\s+)?|\s+and\s+/)
              .map(s => s.trim()).filter(s => s.length > 0);
            return innerParts.length > 1 ? innerParts : [mainDish, ...innerParts];
          }

          // Split on " with " first, then further split each segment on commas / "and"
          if (name.includes(' with ')) {
            const withParts = name.split(' with ').map(s => s.trim()).filter(s => s.length > 0);
            const allParts: string[] = [];
            withParts.forEach(segment => {
              const subParts = segment.split(/,\s*(?:and\s+)?|\s+and\s+/)
                .map(s => s.trim()).filter(s => s.length > 0);
              allParts.push(...subParts);
            });
            return allParts.length > 1 ? allParts : [name];
          }

          // Comma / "and" separated list without " with ": "rice, chicken, broccoli and soy sauce"
          const commaParts = name.split(/,\s*(?:and\s+)?|\s+and\s+/)
            .map(s => s.trim()).filter(s => s.length > 0);
          if (commaParts.length > 1) return commaParts;

          return [name];
        };

        const parsedParts = parseCompoundFood(foodItemStr);
        const filteredParts = parsedParts
          .filter(p => !nonFoodItems.some(nf => p.toLowerCase().includes(nf)));

        if (filteredParts.length > 1) {
          const totalCalories = Number(formData.calories) || 1;
          const totalCarbs = Number(formData.carbs_g) || 0;
          const totalFat = Number(formData.fat_g) || 0;
          const totalFiber = Number(formData.fiber_g) || 0;
          const totalSugar = Number(formData.sugar_g) || 0;
          const totalSodium = Number(formData.sodium_mg) || 0;
          const extraTotals: Partial<Record<(typeof RECONCILIABLE_NUTRIENTS)[number], number>> = {};
          for (const f of RECONCILIABLE_NUTRIENTS) {
            if (f === 'calories') continue;
            const tv = Number((formData as any)[f]);
            if (Number.isFinite(tv) && tv !== 0) extraTotals[f] = tv;
          }

          setFoodComponents(filteredParts.map((name, index) => {
            const nutrition = componentNutrition[name.toLowerCase()];
            const qty = nutrition?.quantity || 1;
            const unit = nutrition?.unit || 'serving';
            const gramWeight = gramsForPortion(qty, unit, name);
            const compCalories = nutrition?.calories || 0;
            const calorieProportion = compCalories / totalCalories;

            const out: Record<string, any> = {
              id: `component-${index}`,
              name: name,
              quantity: qty,
              unit: unit,
              detected: true,
              calories: compCalories,
              protein_g: nutrition?.protein_g,
              carbs_g: Math.round(totalCarbs * calorieProportion * 10) / 10,
              fat_g: Math.round(totalFat * calorieProportion * 10) / 10,
              fiber_g: Math.round(totalFiber * calorieProportion * 10) / 10,
              sugar_g: Math.round(totalSugar * calorieProportion * 10) / 10,
              sodium_mg: Math.round(totalSodium * calorieProportion),
              gramWeight: gramWeight,
            };
            for (const [f, tv] of Object.entries(extraTotals)) {
              const frac =
                f.endsWith('_mg') || f.endsWith('_mcg')
                  ? Math.round(tv * calorieProportion * 1000) / 1000
                  : Math.round(tv * calorieProportion * 100) / 100;
              out[f] = frac;
            }
            return out;
          }));
          console.log('✅ Parsed', filteredParts.length, 'components with full nutrition (macros + micros estimated proportionally)');
        } else {
          // Single item - create one component with ALL macros
          const isBarcode = inputMethod === 'barcode';
          const qty = Number(formData.quantity) || 1;
          const unit = formData.unit?.toString() || 'serving';

          // Phase 13.1 (2026-05-02): when this single item is the result
          // of a barcode scan, prefer the LABELED gram weight (from
          // `formData.grams_per_unit`, preserved through the barcode
          // special block in loadFormConfiguration) over the generic
          // `gramsForPortion` fallback. A 24g cheese stick at unit
          // 'serving' must NOT be treated as 100g (the generic default),
          // otherwise downstream save-time grounding rescales the panel
          // to the wrong portion.
          //
          // Phase 13.3 (2026-05-02): legacy HomeScreen / flat OFF payloads
          // put `quantity: 1, unit: 'g'` while `serving_size` is the real
          // panel mass (e.g. 48 g for "2 piece (48 g)"). Without reading
          // `serving_size`, gramWeight became 1 g and save tripped the
          // 10 000 kcal/100g gate (Expo Go logs).
          const gramsPerUnitFromForm = Number((formData as any).grams_per_unit);
          const productServingGrams = Number(
            ((formData as any).product_serving_info?.grams),
          );
          const servingSizeGrams = Number(
            (formData as any).serving_size ??
            (extractedData as any)?.data_json?.serving_size ??
            (extractedData as any)?.serving_size,
          );
          const labeledGramsPerUnit = Number.isFinite(gramsPerUnitFromForm) && gramsPerUnitFromForm > 0
            ? gramsPerUnitFromForm
            : (Number.isFinite(productServingGrams) && productServingGrams > 0
              ? productServingGrams
              : (Number.isFinite(servingSizeGrams) && servingSizeGrams > 0
                ? servingSizeGrams
                : null));
          let gramWeight = labeledGramsPerUnit !== null
            ? qty * labeledGramsPerUnit
            : gramsForPortion(qty, unit, foodItemStr);

          // Phase 13.3: flat barcode rows often say 1 g while the nutrition
          // facts are for `serving_size` grams. Coerce to 1× printed panel
          // so the chip, rings, and save gate agree with the label.
          let qtyOut = qty;
          let unitOut = unit;
          if (
            isBarcode &&
            labeledGramsPerUnit !== null &&
            qty === 1 &&
            normalisePortionUnit(unit) === 'g' &&
            labeledGramsPerUnit > 1
          ) {
            qtyOut = 1;
            unitOut = 'serving';
            gramWeight = labeledGramsPerUnit;
          }

          // Phase 13.1 (2026-05-02): when the row is a barcode scan we
          // stamp `data_source: 'barcode_scan'` so the save-time
          // enrichment passes (`enrichUnresolvedStubs` Phase 9.12 default
          // mode + Phase 9.15 fillOnlyMissing) skip / preserve the
          // OFF panel verbatim per ENTRY-METHODS-CONTRACT. Without this
          // a single-item barcode chip without `per_component_nutrition`
          // (e.g. when the route-param payload was reshaped) becomes a
          // bare LLM-stub-shaped chip and gets re-grounded into the
          // first matching `nutrition_cache` row — which on 2026-05-02
          // turned a 6g/2cal cheese-stick chip into 6oz/364cal of
          // generic per-100g cheese.

          // Phase 13.1: forward every numeric nutrient field on formData
          // that we'd otherwise lose. Pre-13.1 only the seven dashboard
          // macros made it onto the single-item chip; on save the row
          // totals ran through `sumToTotals(per_component)` and dropped
          // sat fat / cholesterol / calcium / iron / vit C / etc. that
          // the OFF panel had filled in.
          const carryNutrients: Record<string, number> = {};
          for (const f of RECONCILIABLE_NUTRIENTS) {
            const v = (formData as any)[f];
            if (v === undefined || v === null) continue;
            const n = typeof v === 'number' ? v : Number(v);
            if (Number.isFinite(n)) carryNutrients[f] = n;
          }

          const serveDesc =
            (formData as any)?.serving_description ??
            (extractedData as any)?.data_json?.serving_description;
          const pieceCount = parseLeadingPieceCountFromServingText(serveDesc);
          const isPer100gRow = !!(formData as any).is_per_100g;
          const gramsPerPiece =
            isBarcode &&
            !isPer100gRow &&
            labeledGramsPerUnit !== null &&
            pieceCount !== null &&
            pieceCount > 1
              ? Math.round((labeledGramsPerUnit / pieceCount) * 1000) / 1000
              : undefined;

          setFoodComponents([{
            id: 'main-item',
            name: foodItemStr,
            quantity: qtyOut,
            unit: unitOut,
            detected: true,
            calories: Number(formData.calories) || undefined,
            protein_g: Number(formData.protein_g) || undefined,
            carbs_g: Number(formData.carbs_g) || undefined,
            fat_g: Number(formData.fat_g) || undefined,
            fiber_g: Number(formData.fiber_g) || undefined,
            sugar_g: Number(formData.sugar_g) || undefined,
            sodium_mg: Number(formData.sodium_mg) || undefined,
            gramWeight: gramWeight,
            ...carryNutrients,
            ...(isBarcode
              ? {
                  data_source: 'barcode_scan',
                  match_confidence: 0.95,
                  was_user_corrected: false,
                  ai_filled_fields: [],
                  corrected_fields: [],
                  ...(getBarcodeGroundingOutcome((extractedData as any)?.data_json)
                    ? {
                        barcode_grounding_outcome: getBarcodeGroundingOutcome(
                          (extractedData as any)?.data_json,
                        ),
                        barcode_grounding_confidence: (extractedData as any)?.data_json
                          ?.barcode_grounding_confidence,
                      }
                    : {}),
                  ...(labeledGramsPerUnit !== null ? { grams_per_unit: labeledGramsPerUnit } : {}),
                  ...(gramsPerPiece !== undefined ? { grams_per_piece: gramsPerPiece } : {}),
                  servingLabel:
                    (extractedData as any)?.data_json?.servingLabel ||
                    (extractedData as any)?.servingLabel ||
                    (formData as any)?.servingLabel ||
                    (formData as any)?.serving_description ||
                    (extractedData as any)?.data_json?.serving_description ||
                    undefined,
                }
              : {}),
          } as any]);
          console.log(
            '✅ Single food component:',
            foodItemStr,
            isBarcode ? '(barcode-stamped)' : '',
            'qty:', qtyOut, 'unit:', unitOut,
            'gramWeight:', gramWeight,
            'micros forwarded:', Object.keys(carryNutrients).length,
          );
        }
      }
    }
    portionHydrationReadyRef.current = true;
  }, [
    healthCategory,
    extractedData,
    formData.food_item,
    (formData as any)?.serving_size,
    (formData as any)?.serving_description,
  ]);

  // NOTE: Nutrition recommendations are fetched and displayed in InputConfirmationScreen
  // (AFTER save), not here (before save). See Phase 1.0 Unified Input System Rebuild.

  const loadFormConfiguration = async () => {
    const generation = ++loadGenerationRef.current;
    try {
      // Only block the whole screen on first load — re-runs with the same
      // payload should not flash "Loading form configuration..." again.
      if (!formConfigRef.current) {
        setLoading(true);
      }
      
      // Debug: Log the extracted data structure
      console.log('🔍 DEBUG: Extracted data received:', extractedData);
      
      // Generate form configuration for the health category
      const config = await formFactoryService.generateFormConfig(healthCategory);
      if (generation !== loadGenerationRef.current) return;
      setFormConfig(config);
      
      // Pre-populate form with extracted data using enhanced service
      // Merge `data_json` with sibling keys on the root payload. Legacy code
      // used `extractedData.data_json || extractedData`, which dropped
      // `per_component_nutrition` (and other siblings) whenever both existed —
      // suggestion / camera paths sometimes nest macros in `data_json` while
      // the full component array lives on the root.
      const rawExt = extractedData || {};
      const innerJson =
        rawExt.data_json &&
        typeof rawExt.data_json === 'object' &&
        !Array.isArray(rawExt.data_json)
          ? rawExt.data_json
          : null;
      const { data_json: _dataJsonStripped, ...siblingFields } = rawExt;
      const dataToPrePopulate: Record<string, any> = normalizeQuickAddRecentsBarcodeForward(
        innerJson != null ? { ...innerJson, ...siblingFields } : { ...siblingFields },
      );

      // PRESERVE provenance from the grounding pass when present.
      // Phase 3+ pipeline writes one of: 'usda_fdc' | 'openfoodfacts' | 'cache' | 'manual_seed' | 'ai_estimate'
      // onto cleanedData.data_source. We only fall back to the input_method-based
      // legacy default if grounding didn't (or couldn't) tag the row.
      //
      // Phase 13 (2026-05-02): `barcode_scan` and `curated_foods` are now
      // first-class grounded sources — they must survive the input_method
      // fallback so the OFF panel from a barcode scan isn't downgraded to
      // a re-resolved per-100g USDA panel (Nic / 2026-05-02 cheese bug).
      const GROUNDED_SOURCES = new Set([
        'usda_fdc', 'openfoodfacts', 'cache', 'manual_seed', 'ai_estimate',
        'barcode_scan', 'curated_foods', 'user_search_pick', 'user_input',
        'supplement_label',
      ]);
      const existingDataSource = (dataToPrePopulate as any).data_source;
      if (!existingDataSource || !GROUNDED_SOURCES.has(String(existingDataSource))) {
        dataToPrePopulate.data_source = inputMethod === 'voice' ? 'manual' :
                                        inputMethod === 'camera' ? 'manual' :
                                        inputMethod === 'file' ? 'manual' :
                                        inputMethod === 'chat' ? 'manual' :
                                        inputMethod === 'barcode' ? 'barcode_scan' :
                                        'manual';
      }
      
      // Set input_method based on inputMethod
      dataToPrePopulate.input_method = inputMethod;
      
      // Debug: Log what we're sending to pre-population
      console.log('🔍 DEBUG: Data being sent to pre-population:', {
        dataToPrePopulateKeys: Object.keys(dataToPrePopulate),
        source: dataToPrePopulate.source,
        inputMethod: inputMethod,
        sampleData: Object.keys(dataToPrePopulate).slice(0, 5).reduce((acc, key) => {
          acc[key] = dataToPrePopulate[key];
          return acc;
        }, {} as any)
      });
      
      const { prePopulatedData, result } = await formFactoryService.prePopulateFormData(
        healthCategory,
        dataToPrePopulate,
        config,
        {
          strictValidation: false,
          allowPartialMapping: true
        }
      );
      if (generation !== loadGenerationRef.current) return;

      // Carry provenance metadata through pre-population so it survives into
      // formData and onto the final save payload. The form schema doesn't list
      // these as user-editable fields, but we still need them on the saved row.
      if (healthCategory === 'nutrition_log') {
        if ((dataToPrePopulate as any).data_source !== undefined) {
          (prePopulatedData as any).data_source = (dataToPrePopulate as any).data_source;
        }
        if ((dataToPrePopulate as any).match_confidence !== undefined) {
          (prePopulatedData as any).match_confidence = (dataToPrePopulate as any).match_confidence;
        }
        if ((dataToPrePopulate as any).nutrition_capture_kind !== undefined) {
          (prePopulatedData as any).nutrition_capture_kind = (dataToPrePopulate as any).nutrition_capture_kind;
        }
      }
      
      // Debug: Log pre-population results
      console.log('🔍 DEBUG: Pre-population results:', {
        success: result.success,
        confidence: result.confidence,
        prePopulatedKeys: Object.keys(prePopulatedData),
        warnings: result.warnings,
        unmappedFields: result.unmappedFields,
        errors: result.errors
      });

      // ⚡ DIAGNOSTIC: Check micronutrient pipeline
      const microCheck = {
        in_dataToPrePopulate: {
          iron_mg: dataToPrePopulate.iron_mg,
          zinc_mg: dataToPrePopulate.zinc_mg,
          calcium_mg: dataToPrePopulate.calcium_mg,
          folate_dfe_mcg: dataToPrePopulate.folate_dfe_mcg,
        },
        in_prePopulatedData: {
          iron_mg: prePopulatedData.iron_mg,
          zinc_mg: prePopulatedData.zinc_mg,
          calcium_mg: prePopulatedData.calcium_mg,
          folate_dfe_mcg: prePopulatedData.folate_dfe_mcg,
        },
      };
      console.log('🔬 MICRONUTRIENT PIPELINE CHECK:', JSON.stringify(microCheck));
      
      // ⚡ CRITICAL: Set dates PROGRAMMATICALLY using device's local timezone
      // AI is unreliable with dates - we only trust AI for relative date references
      // Uses timezone-safe utilities from dateUtils.ts
      
      if (healthCategory === 'nutrition_log') {
        // Get device's local date (timezone-safe)
        const deviceTodayStr = getTodayISO(); // Uses device timezone, not UTC
        const currentLocalTime = new Date().toISOString(); // For meal_time tracking
        
        // ⚡ Handle relative date references (days_ago field set by AI)
        if (prePopulatedData.days_ago && typeof prePopulatedData.days_ago === 'number') {
          const daysAgo = prePopulatedData.days_ago;
          const calculatedDate = getDaysAgoISO(daysAgo);
          console.log(`📅 AI detected "days_ago: ${daysAgo}" - calculated date: ${calculatedDate}`);
          prePopulatedData.log_date = calculatedDate;
          delete prePopulatedData.days_ago; // Remove AI helper field
        } 
        // ⚡ Validate log_date format - if invalid or missing, use device's today
        else if (!prePopulatedData.log_date || 
            typeof prePopulatedData.log_date !== 'string' ||
            !prePopulatedData.log_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.log(`📅 Setting log_date to device local today: ${deviceTodayStr} (was: "${prePopulatedData.log_date}")`);
          prePopulatedData.log_date = deviceTodayStr;
        }
        // ⚡ If AI did set a date, verify it's reasonable (within last 30 days)
        else {
          const aiDate = parseISODate(prePopulatedData.log_date);
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          if (aiDate > today || aiDate < thirtyDaysAgo) {
            console.log(`📅 AI date out of range, using device today: ${deviceTodayStr} (AI tried: "${prePopulatedData.log_date}")`);
            prePopulatedData.log_date = deviceTodayStr;
          }
        }
        
        // ⚡ CRITICAL: meal_time defaults to NOW (actual time of logging)
        // - For circadian rhythm calculations, we need REAL times, not guesses
        // - If user is logging a past entry, they can adjust the time
        // - NEVER assume times based on meal type names
        if (!prePopulatedData.meal_time) {
          // Default: Current time (when user is logging this entry)
          const now = new Date();
          
          // If logging for a past date, use current time-of-day on that date
          // User can then adjust if needed
          if (prePopulatedData.log_date && prePopulatedData.log_date !== getTodayISO()) {
            const [year, month, day] = prePopulatedData.log_date.split('-').map(Number);
            const pastDateWithCurrentTime = new Date(
              year, month - 1, day,
              now.getHours(), now.getMinutes(), now.getSeconds()
            );
            prePopulatedData.meal_time = pastDateWithCurrentTime.toISOString();
            console.log(`⏰ Past entry: Using current time-of-day (${now.getHours()}:${now.getMinutes()}) on ${prePopulatedData.log_date}`);
          } else {
            prePopulatedData.meal_time = now.toISOString();
            console.log(`⏰ Today's entry: Using current time ${now.toISOString()}`);
          }
        }
      }

      if (
        healthCategory === 'vital_signs' ||
        healthCategory === 'mental_health' ||
        healthCategory === 'pain_records'
      ) {
        const now = new Date();
        prePopulatedData.recorded_at = normalizeTimestamptzValue(
          prePopulatedData.recorded_at != null
            ? String(prePopulatedData.recorded_at)
            : undefined,
          now,
        );
      }

      // T-0346: manual free-text supplements — same post-process as chat/voice
      // so "Vitamin C 1000 mg" saves 1000 mg vit C, not a 100 g food panel.
      if (inputMethod === 'manual' && healthCategory === 'nutrition_log') {
        const manualLabel = String(prePopulatedData.food_item ?? '').trim();
        if (
          manualLabel.length > 0 &&
          classifySupplementOrFoodFromText(manualLabel) === 'supplement'
        ) {
          applyNutritionTextSupplementPostProcess(prePopulatedData as any, manualLabel);
          const foodUnits = new Set([
            'serving', 'g', 'gram', 'grams', 'oz', 'ounce', 'ounces', '100g', '',
          ]);
          const currentUnit = String(prePopulatedData.unit ?? '').toLowerCase();
          if (!currentUnit || foodUnits.has(currentUnit)) {
            prePopulatedData.unit = inferSupplementUnitFromText(manualLabel);
          }
          if (!prePopulatedData.quantity || Number(prePopulatedData.quantity) <= 0) {
            prePopulatedData.quantity = 1;
          }
        }
      }
      
      // T-0055: Auto-set meal_type to 'beverage' and estimate water_g for all
      // known liquid types, not just entries named 'water'. The barcode path
      // already estimates water_g in buildBarcodeChipSeed; this covers chat /
      // voice / AI-text paths where the AI may not populate water_g.
      const foodItemRaw = (prePopulatedData.food_item || '').toLowerCase();
      const isKnownBeverage =
        foodItemRaw === 'water' ||
        /\b(water|coffee|tea|juice|lemonade|ade|soda|cola|sparkling|beer|ale|lager|stout|ipa|wine|spirits?|vodka|whiskey|whisky|rum|gin|tequila|bourbon|brandy|cocktail|martini|margarita|mimosa|smoothie|milk|dairy|energy\s*drink|sports\s*drink|gatorade|powerade|electrolyte|drink|beverage|liquid|kombucha|kefir|cider|mead|sake|champagne|lager)\b/.test(foodItemRaw);

      if (isKnownBeverage) {
        prePopulatedData.meal_type = 'beverage';

        if (!prePopulatedData.water_g || prePopulatedData.water_g === 0) {
          try {
            const preloadHydrationInput = {
              name: String(prePopulatedData.food_item ?? ''),
              quantity: Number(prePopulatedData.quantity) || 1,
              unit:
                typeof prePopulatedData.unit === 'string' && prePopulatedData.unit.length > 0
                  ? prePopulatedData.unit
                  : 'serving',
              gramWeight: Number(prePopulatedData.gramWeight) || undefined,
            };
            const hydration = estimateDrinkHydrationGrams(preloadHydrationInput);
            if (hydration != null && hydration > 0) {
              prePopulatedData.water_g = hydration;
              console.log(
                `💧 T-0055 estimated water_g: ${hydration}g for "${prePopulatedData.food_item}"`,
              );
            }
          } catch (hydrationErr) {
            console.warn(
              '[T-0055] beverage hydration estimate failed, continuing load:',
              hydrationErr,
            );
          }
        }
      }
      
      // ⚡ Preserve custom barcode fields that aren't in the form schema
      // These are used for smart serving size handling.
      // T-0397: also forward for quick_add / edit_existing / favorite when the
      // row carries GTIN provenance (Recents re-add of a prior barcode save).
      if (dataToPrePopulate && shouldForwardBarcodeProvenanceFields(inputMethod, dataToPrePopulate)) {
        forwardBarcodeProvenanceToPrePopulated(dataToPrePopulate, prePopulatedData);
        console.log('📊 Barcode custom fields preserved:', {
          inputMethod,
          product_serving_info: prePopulatedData.product_serving_info,
          is_per_100g: prePopulatedData.is_per_100g,
          grams_per_unit: prePopulatedData.grams_per_unit,
          serving_size: prePopulatedData.serving_size,
          brand_barcode: (prePopulatedData as any).brand_barcode,
          has_per_component_nutrition: Array.isArray(
            (prePopulatedData as any).per_component_nutrition,
          ),
          servingLabel: (prePopulatedData as any).servingLabel,
          barcode: (prePopulatedData as any).barcode,
          data_source: (prePopulatedData as any).data_source,
          barcode_grounding_outcome: (prePopulatedData as any).barcode_grounding_outcome,
        });
      }
      
      if (healthCategory === 'nutrition_log') {
        // Phase 12.6 (2026-05-01): `per_component_nutrition` is the canonical
        // full panel for Quick Add / suggestion / many AI paths. Merge its
        // summed nutrients into row-level `formData` so "Edit All Fields"
        // shows omega-3, vitamins, etc., matching what save persists via
        // `sumToTotals(resolvedComponents)`.
        // The extractedData fallback covers the case where formFactoryService
        // didn't forward per_component_nutrition into prePopulatedData (some
        // legacy field-mapping configurations strip array-of-object values).
        const pcnForMerge = pickPerComponentNutritionSource(
          extractedData as any,
          prePopulatedData as any,
        );
        if (pcnForMerge) {
          (prePopulatedData as any).per_component_nutrition = pcnForMerge;
        }
        mergeRowTotalsFromPerComponent(prePopulatedData as any, pcnForMerge);
      }

      setFormData(prePopulatedData);
      // T-0377f: loadFormConfiguration can re-introduce stale extraction totals
      // after hydration merged chip sums — re-sync once formData lands.
      if (inputMethod === 'pre_confirm' && healthCategory === 'nutrition_log') {
        const pcnAfterLoad = pickPerComponentNutritionSource(
          extractedData as any,
          prePopulatedData as any,
        );
        if (pcnAfterLoad) {
          setFormData(fd =>
            mergeRowTotalsFromPerComponent({ ...fd }, pcnAfterLoad as any),
          );
        }
      }
      setPrepopulationResult(result);

      const compactFields = config.fields.filter((f) => {
        if (HIDDEN_SYSTEM_FIELDS.has(f.name)) return false;
        const core = coreFieldsByCategory[healthCategory] ?? [];
        return core.includes(f.name) || hasPopulatedValue(prePopulatedData[f.name]);
      });
      console.log(
        '[input_confirm_open]',
        JSON.stringify({
          category: healthCategory,
          populatedFieldCount: Object.keys(prePopulatedData).filter((k) =>
            hasPopulatedValue(prePopulatedData[k]),
          ).length,
          coreFieldCount: compactFields.length,
          expandedDefault: inputMethod === 'manual',
        }),
      );
      
      console.log(`✅ Form configuration loaded for ${healthCategory}:`, {
        fields: config.fields.length,
        prePopulated: Object.keys(prePopulatedData).length,
        confidence: result.confidence
      });
    } catch (error) {
      if (generation !== loadGenerationRef.current) return;
      console.error(`❌ Error loading form configuration for ${healthCategory}:`, error);
      Alert.alert(t('common.error', 'Error'), t('unifiedConfirmation.alerts.failedLoadConfig', 'Failed to load form configuration. Please try again.'));
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const getInputMethodInfo = () => {
    switch (inputMethod) {
      case 'voice':
        return { emoji: '🎤', name: t('unifiedConfirmation.inputMethods.voice', 'Voice Input'), color: paperTheme.colors.primary, icon: 'microphone' };
      case 'camera':
        return { emoji: '📷', name: t('unifiedConfirmation.inputMethods.camera', 'Camera'), color: paperTheme.colors.secondary, icon: 'camera' };
      case 'file':
        return { emoji: '📄', name: t('unifiedConfirmation.inputMethods.file', 'File Upload'), color: paperTheme.colors.tertiary, icon: 'document' };
      case 'chat':
        return { emoji: '💬', name: t('unifiedConfirmation.inputMethods.chat', 'Chat'), color: paperTheme.colors.outline, icon: 'chatbubble' };
      case 'manual':
        return { emoji: '✏️', name: t('unifiedConfirmation.inputMethods.manual', 'Manual Entry'), color: paperTheme.colors.outline, icon: 'pencil' };
      case 'barcode':
        return { emoji: '📦', name: t('unifiedConfirmation.inputMethods.barcode', 'Barcode'), color: paperTheme.colors.tertiary, icon: 'barcode' };
      // Phase 10.2.E (2026-04-30) — new Quick Add entry methods.
      case 'quick_add':
        return { emoji: '⚡', name: t('unifiedConfirmation.inputMethods.quickAdd', 'Quick Add'), color: paperTheme.colors.primary, icon: 'flash' };
      case 'favorite':
        return { emoji: '❤️', name: t('unifiedConfirmation.inputMethods.favorite', 'Favorite'), color: paperTheme.colors.error ?? paperTheme.colors.primary, icon: 'heart' };
      case 'meal_template':
        return { emoji: '🍽️', name: t('unifiedConfirmation.inputMethods.myMeal', 'My Meal'), color: paperTheme.colors.primary, icon: 'restaurant' };
      case 'browse':
        return { emoji: '📚', name: t('unifiedConfirmation.inputMethods.library', 'Library'), color: paperTheme.colors.primary, icon: 'library' };
      // Phase 10.3.B (2026-04-30) — suggestion card → confirmation pre-fill.
      case 'suggestion':
        return { emoji: '✨', name: t('unifiedConfirmation.inputMethods.suggestion', 'Suggestion'), color: paperTheme.colors.primary, icon: 'sparkles' };
      default:
        return { emoji: '❓', name: t('unifiedConfirmation.inputMethods.unknown', 'Unknown'), color: paperTheme.colors.outline, icon: 'help-circle' };
    }
  };

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const validateForm = (override?: any): string[] | null => {
    if (!formConfig) return [t('unifiedConfirmation.validation.configNotLoaded', 'Form configuration is not loaded')];

    // Phase 9.13 (2026-04-29): accept an optional `override` so
    // `handleConfirm` can validate post-backstop data (auto-derived
    // food_item, defaulted source) on the same tick without waiting
    // for setState to settle.
    const dataToValidate = override ?? formData;
    const validation = formFactoryService.validateFormData(dataToValidate, formConfig);

    if (!validation.isValid) {
      const newErrors: Record<string, string> = {};
      const alertMessages: string[] = [];
      // Phase 9.13: prefer the structured `field` key when
      // `validateFormData` returns one; otherwise reconstruct from the
      // label as best we can. Pre-9.13 we used `error.split(' ')[0]`
      // which produced "log" for "Log Date is required" and "food"
      // for "Food Item is required" — neither matches a real form key
      // so the inline error never highlighted the right field.
      const structuredErrors = (validation as any).fieldErrors as
        | Array<{ field: string; message: string }>
        | undefined;
      if (Array.isArray(structuredErrors) && structuredErrors.length > 0) {
        for (const fe of structuredErrors) {
          if (fe && typeof fe.field === 'string') {
            newErrors[fe.field] = fe.message;
            if (typeof fe.message === 'string' && fe.message.trim().length > 0) {
              alertMessages.push(fe.message);
            }
          }
        }
      } else {
        validation.errors.forEach(error => {
          const fieldName = error.split(' ')[0].toLowerCase().replace(/\s+/g, '_');
          newErrors[fieldName] = error;
          alertMessages.push(error);
        });
      }
      setErrors(newErrors);
      return alertMessages;
    }

    setErrors({});
    return null;
  };

  /** Explicit opt-in: re-run G on every chip, filling only missing fields. */
  const handleRefreshNutrients = async () => {
    if (healthCategory !== 'nutrition_log' || foodComponents.length === 0) return;
    setLookingUpNutrition(true);
    try {
      const { nutritionGroundingService } = await import('../services/nutritionGroundingService');
      const { enrichUnresolvedStubs } = await import('../utils/componentStubEnrichment');
      const refreshed = await enrichUnresolvedStubs(
        foodComponents,
        args => nutritionGroundingService.resolveIngredient(args),
        { forceAll: true, fillOnlyMissing: true, nutrientTopUp: 'save_pass' },
      );
      setFoodComponents(refreshed as any);
      setFormData(fd => mergeRowTotalsFromPerComponent({ ...fd }, refreshed as any));
    } catch (e) {
      console.warn('[UnifiedConfirmationScreen] refresh nutrients failed:', e);
      Alert.alert(t('unifiedConfirmation.alerts.couldNotRefresh', 'Could not refresh'), e instanceof Error ? e.message : t('unifiedConfirmation.alerts.tryAgainLater', 'Try again later'));
    } finally {
      setLookingUpNutrition(false);
    }
  };

  const supplementAffordance = useMemo(() => {
    if (healthCategory !== 'nutrition_log') return { active: false, suggest: false };
    const active = (formData as any).nutrition_capture_kind === 'supplement';
    const suggest =
      !active &&
      classifySupplementOrFoodFromText(String((formData as any).food_item || '')) === 'supplement';
    return { active, suggest };
  }, [healthCategory, formData]);

  const handleSupplementCaptureToggle = useCallback(() => {
    if (healthCategory !== 'nutrition_log') return;
    const active = (formData as any).nutrition_capture_kind === 'supplement';
    if (active) {
      const nextComps = foodComponents.map((c) => {
        const n: any = { ...c };
        if (n.data_source === 'supplement_label') n.data_source = 'user_input';
        delete n.nutrition_capture_kind;
        return n;
      });
      setFoodComponents(nextComps);
      const fd: any = { ...formData, nutrition_capture_kind: undefined };
      setFormData(mergeRowTotalsFromPerComponent(fd, sumToTotals(nextComps)));
      return;
    }
    const nextComps = foodComponents.map((c) => {
      const n: any = { ...c };
      n.nutrition_capture_kind = 'supplement';
      n.calories = 0;
      n.protein_g = 0;
      n.carbs_g = 0;
      n.fat_g = 0;
      n.fiber_g = 0;
      n.sugar_g = 0;
      n.sugar_added_g = null;
      return n;
    });
    setFoodComponents(nextComps);
    const fd: any = {
      ...formData,
      nutrition_capture_kind: 'supplement',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      saturated_fat_g: 0,
      monounsaturated_fat_g: 0,
      polyunsaturated_fat_g: 0,
      trans_fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sugar_added_g: null,
      omega_3_g: null,
      omega_6_g: null,
    };
    setFormData(mergeRowTotalsFromPerComponent(fd, sumToTotals(nextComps)));
  }, [healthCategory, formData, foodComponents]);

  /**
   * Phase 9.15 (2026-04-30) — ask the user once per session whether
   * they want missing micronutrients filled from USDA on Manual-typed
   * rows that have macros but no signal micros. Choice persisted in
   * `AsyncStorage` so we don't re-ask within the session.
   */
  const askManualMicrosOptIn = async (): Promise<'yes' | 'no'> => {
    try {
      const cached = await AsyncStorage.getItem(MANUAL_MICROS_OPT_IN_KEY);
      if (cached === 'yes' || cached === 'no') return cached;
    } catch {}
    return new Promise<'yes' | 'no'>(resolve => {
      Alert.alert(
        t('unifiedConfirmation.alerts.fillMissingMicrosTitle', 'Fill missing micronutrients?'),
        t('unifiedConfirmation.alerts.fillMissingMicrosBody', 'You entered macros but no vitamins or minerals (vit D, B12, omega-3, calcium, iron). Want us to estimate them from USDA based on your food name? You can edit them after.'),
        [
          {
            text: t('unifiedConfirmation.buttons.noSaveAsIs', 'No, save as-is'),
            style: 'cancel',
            onPress: () => {
              AsyncStorage.setItem(MANUAL_MICROS_OPT_IN_KEY, 'no').catch(() => {});
              resolve('no');
            },
          },
          {
            text: t('unifiedConfirmation.buttons.yesEstimate', 'Yes, estimate'),
            onPress: () => {
              AsyncStorage.setItem(MANUAL_MICROS_OPT_IN_KEY, 'yes').catch(() => {});
              resolve('yes');
            },
          },
        ],
        { cancelable: false },
      );
    });
  };

  const handleConfirm = async () => {
    if (!formConfig || isProcessing) return;
    if (!saveInFlightGuardRef.current.tryAcquire()) return;

    // Phase 11.2 (2026-05-01) — flip processing state on the FIRST
    // line so the Save button visibly disables and shows a spinner
    // immediately. The grounding + enrichment work below can take 2-5
    // seconds on slow networks; without this flip the button stays
    // enabled and users tap repeatedly. The `try/finally` at the end
    // ensures we always release the lock.
    setInternalIsProcessing(true);
    setSavePhase('grounding');

    const releaseSaveLock = () => {
      saveInFlightGuardRef.current.release();
      setInternalIsProcessing(false);
      setSavePhase('idle');
    };

    let releaseProcessingInFinally = true;

    // Phase 9.13 (2026-04-29) — required-field backstop.
    //
    // The DB has nutrition_log.food_item and nutrition_log.source as
    // NOT NULL with no defaults. Pre-9.13 the local fallback schema
    // marked food_item nullable, so a v2 vision pipeline that emitted
    // per-component nutrition without a top-level label would let the
    // form pass validateForm() and then fail at the Postgres layer
    // with a raw "null value in column food_item" message that users
    // paraphrased as "field is missing, please review the form."
    //
    // Fix: BEFORE validation, if food_item is blank but components
    // carry names, derive a label from them (the AI is supposed to
    // do this — backstop here so the user never has to). Always
    // default source to 'user' if unset. Validate against the patched
    // payload on the same tick, and persist the patches to formData
    // so the user sees the auto-derived label in the form input.
    let workingFormData: any = formData;
    if (healthCategory === 'nutrition_log') {
      const patches: Record<string, any> = {};
      const resolvedLabel = reconcileFoodItemLabelWithComponents(workingFormData?.food_item, foodComponents);
      if (resolvedLabel && resolvedLabel !== workingFormData?.food_item) {
        patches.food_item = resolvedLabel;
      }
      if (!workingFormData?.source || String(workingFormData.source).trim() === '') {
        patches.source = 'user';
      }
      // Phase 9.15 (2026-04-30) — project the chip-derived display
      // totals into formData so validation sees the same numbers the
      // ring shows. Pre-9.15 a chip add wrote into both formData and
      // a parallel `addedItemsMacros` mirror; the ring derived from
      // (formData × multiplier + addedItems), which double-counted.
      // Now formData is downstream of `currentMacros` (chip sum) and
      // updated only on save — no parallel mirrors, no drift. The
      // save path's `Object.assign(payload, sumToTotals(...))`
      // overwrites with grounded values, so this projection feeds
      // validation and any non-save consumers.
      if (hasComponentMacros) {
        for (const f of MACRO_FIELDS) {
          patches[f] = (currentMacros as any)[f];
        }
      }
      if (Object.keys(patches).length > 0) {
        workingFormData = { ...workingFormData, ...patches };
        setFormData(workingFormData);
        console.log('[UnifiedConfirmationScreen] Phase 9.13/9.15 backstop + projection:', patches);
      }
    }

    const validationMessages = validateForm(workingFormData);
    if (validationMessages) {
      const detail = validationMessages.slice(0, 3).join('\n');
      Alert.alert(
        t('unifiedConfirmation.alerts.validationError', 'Validation Error'),
        detail.length > 0
          ? t('unifiedConfirmation.alerts.fixErrorsBeforeSubmitDetail', `Please fix the errors before submitting:\n\n{{detail}}`, { detail })
          : t('unifiedConfirmation.alerts.fixErrorsBeforeSubmit', 'Please fix the errors before submitting'),
      );
      // Phase 11.2 bugfix: we flipped processing + grounding phase *before*
      // validation — a failed check must release the lock or the Save button
      // and overlay stay stuck on "Looking up nutrients…" forever.
      releaseSaveLock();
      return;
    }

    // T-0418b / T-0424 — in-flight repair blocks at button; unresolved
    // calories after attempt get an honest Alert on Save press.
    if (healthCategory === 'nutrition_log' && repairingCalorieChipIds.size > 0) {
      Alert.alert(
        t('unifiedConfirmation.alerts.nutritionStillLoading', 'Nutrition still loading'),
        t('unifiedConfirmation.alerts.lookingUpCalories', 'Looking up calories for one or more ingredients. Try again in a moment.'),
      );
      releaseSaveLock();
      return;
    }

    if (healthCategory === 'nutrition_log' && hasComponentsNeedingCalorieRepair(foodComponents)) {
      Alert.alert(
        t('unifiedConfirmation.alerts.confirmIngredients', 'Confirm ingredients'),
        t('unifiedConfirmation.alerts.ingredientsNeedCalories', 'One or more ingredients still need calories confirmed before you can save. Tap an ingredient to pick a match or adjust the portion.'),
      );
      releaseSaveLock();
      return;
    }

    // T-0297: chat/voice must confirm ambiguous matches before save.
    if (healthCategory === 'nutrition_log') {
      const blocked = foodComponents.find(c =>
        requiresMatchDisambiguation(c, inputMethod),
      );
      if (blocked) {
        openPickerForComponent(
          blocked.id,
          t('unifiedConfirmation.prompts.pickCorrectMatchBeforeSaving', 'Pick the correct food match before saving'),
        );
        Alert.alert(
          t('unifiedConfirmation.alerts.confirmFoodMatch', 'Confirm food match'),
          t('unifiedConfirmation.alerts.pickCorrectFoodMatch', 'Pick the correct food match before saving.'),
        );
        releaseSaveLock();
        return;
      }
    }

    // Phase 9.15 (2026-04-30) — Manual-entry micros opt-in.
    //
    // Triggered when the user typed a row's macros directly into the
    // form fields without ever using the "+ Add Ingredient" search
    // (so `foodComponents` is empty), the row HAS macros, and the
    // headline signal micros (vit D, B12, omega-3, Ca, Fe) are all
    // unset. The user is asking the system to fill what they didn't
    // type, using their `food_item` label as the lookup key. If they
    // decline, we save exactly what they typed.
    // Phase 11.4 (2026-05-01): edit mode skips the micros opt-in
    // prompt. The user is correcting an existing entry; if they want
    // to re-ground from the food name they can use the (future)
    // explicit "Re-ground from food name" affordance.
    if (healthCategory === 'nutrition_log' && foodComponents.length === 0 && !isEditMode) {
      const isSupplementManual =
        String((workingFormData as any)?.nutrition_capture_kind ?? '') === 'supplement';
      if (!isSupplementManual) {
      const cal = Number(workingFormData.calories) || 0;
      const hasMacros = cal > 0;
      const missingMicros = MANUAL_OPT_IN_SIGNAL_FIELDS.every(k => {
        const v = (workingFormData as any)[k];
        if (v === undefined || v === null) return true;
        const n = Number(v);
        return !Number.isFinite(n) || n <= 0;
      });
      const hasFoodItem = typeof workingFormData.food_item === 'string'
        && workingFormData.food_item.trim().length > 0;
      if (hasMacros && missingMicros && hasFoodItem) {
        const choice = await askManualMicrosOptIn();
        if (choice === 'yes') {
          try {
            const { nutritionGroundingService } = await import(
              '../services/nutritionGroundingService'
            );
            const resolved = await nutritionGroundingService.resolveIngredient({
              name: String(workingFormData.food_item),
              quantity: Number(workingFormData.quantity) || 1,
              unit: typeof workingFormData.unit === 'string' && workingFormData.unit.length > 0
                ? String(workingFormData.unit)
                : 'serving',
            });
            const nutrients = (resolved as any)?.nutrients ?? {};
            const filled: Record<string, number> = {};
            const filledKeys: string[] = [];
            for (const [key, value] of Object.entries(nutrients)) {
              if (value === undefined || value === null) continue;
              const n = typeof value === 'number' ? value : Number(value);
              if (!Number.isFinite(n) || n <= 0) continue;
              const existing = (workingFormData as any)[key];
              const existingNum = existing === undefined || existing === null ? 0 : Number(existing);
              if (Number.isFinite(existingNum) && existingNum > 0) continue;
              filled[key] = n;
              filledKeys.push(key);
            }
            if (Object.keys(filled).length > 0) {
              workingFormData = { ...workingFormData, ...filled };
              setFormData(workingFormData);
              console.log(
                `[UnifiedConfirmationScreen] Phase 9.15 manual opt-in: filled ${filledKeys.length} field(s):`,
                filledKeys.slice(0, 8).join(', '),
              );
            }
          } catch (optInErr) {
            console.warn(
              '[UnifiedConfirmationScreen] Phase 9.15 manual opt-in: grounding failed, saving as-is:',
              optInErr,
            );
          }
        }
      }
      }
    }

    try {
      // Phase 9.2: ONE rule, no popups, no plausibility warnings, no
      // `was_edited` branching. Row totals = literal sum of grounded
      // per-component values. The user fixes anything wrong by tapping
      // a chip and editing it directly (NutritionConfirmationEnhancements
      // edit-in-place sheet) — there is nothing for a modal to resolve.
      const payload: any = { ...workingFormData };
      let auditMissingBefore: number | null = null;
      let auditMissingAfter: number | null = null;
      let auditComponentCount: number | null = null;
      let sugarAddedSanitizedCount = 0;
      applyQuickDuplicateDatetimeDefaults(payload, {
        healthCategory,
        isEditMode,
        inputMethod: String(inputMethod),
        quickDuplicateMethods: QUICK_DUPLICATE_DATETIME_INPUT_METHODS,
        getTodayISO,
        getNowIso: () => new Date().toISOString(),
      });
      if (healthCategory === 'nutrition_log') {
        const liveComponentsRaw = projectFoodComponentsForNutritionSave(
          foodComponentsRef.current as Array<Record<string, unknown>>,
        );

        let liveComponents = liveComponentsRaw;
        if (liveComponents.length === 0) {
          const syn = syntheticComponentFromFlatRow(workingFormData as Record<string, unknown>, {
            dataSource: 'user_input',
          });
          if (syn) liveComponents = [syn as any];
        }

        auditComponentCount = liveComponents.length;
        const rowPreviewBefore =
          liveComponents.length > 0
            ? { ...workingFormData, ...sumToTotals(liveComponents) }
            : { ...workingFormData };
        auditMissingBefore = per100gMissingCount(rowPreviewBefore as any, RECONCILIABLE_NUTRIENTS);

        // Phase 9.12 (2026-04-29): re-resolve LLM macro-only stubs.
        //
        // Live regression: 2026-04-29 anchovy meal saved with 6 of 10
        // components as flat stubs (no fdc_id, no data_source, no
        // micros). Pre-9.12 the row totals dropped vitamin D / B12 /
        // omega-3 entirely because raw european anchovy + canned
        // tuna + olive oil + spinach salad never re-resolved through
        // grounding. Now any component whose shape matches
        // `isUnresolvedStub` (no fdc_id / data_source / ai_filled_fields
        // / micros) gets a USDA round-trip before the row aggregation
        // runs. Best-effort: stubs that fail to resolve fall through
        // unchanged so the save flow doesn't block.
        let resolvedComponents = liveComponents;
        // Phase 11.4 (2026-05-01): in edit mode the user is making a
        // deliberate correction. We must NOT re-ground / overwrite
        // the values they just typed. Skip both enrichment passes;
        // the rest of the save flow (sanity gate, totals roll-up)
        // still runs against the user-supplied values verbatim.
        if (liveComponents.length > 0 && !isEditMode) {
          // Phase 11.2: signal "Looking up nutrients..." for the first
          // grounding pass.
          setSavePhase('grounding');
          try {
            const { nutritionGroundingService } = await import(
              '../services/nutritionGroundingService'
            );
            const enrichmentLog: Array<{
              componentName: string;
              succeeded: boolean;
              enrichedFieldCount: number;
            }> = [];
            resolvedComponents = await enrichUnresolvedStubs(
              liveComponents,
              (args) => nutritionGroundingService.resolveIngredient(args),
              {
                onAttempt: ({ componentName, succeeded, enrichedFieldCount, error }) => {
                  enrichmentLog.push({ componentName, succeeded, enrichedFieldCount });
                  if (!succeeded) {
                    console.warn(
                      `[UnifiedConfirmationScreen] Phase 9.12 enrichment failed for "${componentName}":`,
                      error,
                    );
                  }
                },
              },
            );
            if (enrichmentLog.length > 0) {
              const enrichedCount = enrichmentLog.filter(e => e.succeeded).length;
              const failedCount = enrichmentLog.length - enrichedCount;
              console.log(
                `[UnifiedConfirmationScreen] Phase 9.12: ${enrichedCount} stub(s) enriched, ` +
                  `${failedCount} fell through. Components touched: ${enrichmentLog.map(e => e.componentName).join(', ')}`,
              );
            }
          } catch (enrichErr) {
            // Never block the save flow if the grounding service
            // can't be loaded (e.g. a bundling or import-cycle issue).
            // The downstream sanity gate still protects against
            // pathological numeric values; the worst-case impact is
            // that micros stay missing — same as pre-9.12 behaviour.
            console.warn(
              '[UnifiedConfirmationScreen] Phase 9.12 enrichment skipped — using stub components as-is:',
              enrichErr,
            );
          }
        }

        // Phase 9.15 (2026-04-30) — second-pass fill-only-missing
        // enrichment for user-picked / grounded components that are
        // missing the headline signal micros (vit D, B12, omega-3,
        // calcium, iron, selenium).
        //
        // Sunkist tuna live regression: `handleSelectNutritionOption`
        // pre-9.15 didn't forward micros from the picked NutritionData
        // panel, so user-picked tuna chips arrived at the save path
        // with all micros missing. Pre-9.12 + pre-9.15 these would
        // have been silently overwritten by the pantry fallback (the
        // user's chosen 50 cal becoming 87 cal). Phase 9.15.C.1 now
        // tags such chips with `data_source` so 9.12 leaves them
        // alone; this second pass backfills the missing micros via
        // the grounding chain in `fillOnlyMissing` mode — macros
        // survive verbatim, vit D / B12 / omega-3 land on the saved
        // row.
        // Phase 9.17 — skip USDA "sparse micro" top-up for supplement rows.
        // A flat supplement (e.g. voice + typical vit D dose) builds a synthetic
        // chip with `data_source: user_input` and real vit D but no B12/Ca/Fe;
        // `isSparseGroundedComponent` is true and `resolveIngredient("Vitamin D supplement")`
        // can spin for a long time — wrong tool for a supplement label row.
        const treatAsSupplementSave =
          String((workingFormData as any)?.nutrition_capture_kind ?? '') === 'supplement'
          || resolvedComponents.some(
            c => String((c as any)?.nutrition_capture_kind ?? '') === 'supplement',
          );
        if (resolvedComponents.length > 0 && !isEditMode && !treatAsSupplementSave) {
          // Phase 11.2: signal "Filling in details..." for the second
          // (fill-only-missing) pass.
          // Phase 11.4: in edit mode this pass is also skipped — see
          // Phase 9.12 block above for full rationale.
          setSavePhase('enriching');
          try {
            const { nutritionGroundingService } = await import(
              '../services/nutritionGroundingService'
            );
            const sparseLog: Array<{
              componentName: string;
              succeeded: boolean;
              enrichedFieldCount: number;
            }> = [];
            resolvedComponents = await enrichUnresolvedStubs(
              resolvedComponents,
              (args) => nutritionGroundingService.resolveIngredient(args),
              {
                predicate: (c) => isSparseGroundedComponent(c),
                fillOnlyMissing: true,
                nutrientTopUp: 'save_pass',
                onAttempt: ({ componentName, succeeded, enrichedFieldCount, error }) => {
                  sparseLog.push({ componentName, succeeded, enrichedFieldCount });
                  if (!succeeded) {
                    console.warn(
                      `[UnifiedConfirmationScreen] Phase 9.15 fill-only failed for "${componentName}":`,
                      error,
                    );
                  }
                },
              },
            );
            // T-0562: off_complete barcode labels skip Phase 9.15 (T-0225e) but
            // still need Foundation-borrow for micronutrients absent from the panel.
            resolvedComponents = await enrichBarcodeOffCompleteFoundationBorrow(
              resolvedComponents,
              (name, brand, missingFields, cookingMethod, trustedPer100g) =>
                nutritionGroundingService.borrowFoundationMicrosForFood(
                  name,
                  brand,
                  missingFields,
                  cookingMethod,
                  trustedPer100g,
                ),
            );
            if (sparseLog.length > 0) {
              const filled = sparseLog.filter(e => e.succeeded);
              console.log(
                `[UnifiedConfirmationScreen] Phase 9.15 fill-only: ${filled.length} sparse-grounded ` +
                  `component(s) backfilled (macros preserved). Touched: ${sparseLog.map(e => e.componentName).join(', ')}`,
              );
            }
          } catch (fillErr) {
            console.warn(
              '[UnifiedConfirmationScreen] Phase 9.15 fill-only pass skipped:',
              fillErr,
            );
          }
        }

        if (resolvedComponents.length > 0) {
          for (const c of resolvedComponents) {
            if (stripImpossibleAddedSugar(c as Record<string, any>)) {
              sugarAddedSanitizedCount += 1;
            }
          }
        }

        if (resolvedComponents.length > 0) {
          const rowFallback = {
            name: String(payload.food_item ?? workingFormData?.food_item ?? ''),
            quantity: Number(payload.quantity) || Number(workingFormData?.quantity) || 1,
            unit:
              typeof payload.unit === 'string' && payload.unit.length > 0
                ? payload.unit
                : typeof workingFormData?.unit === 'string'
                  ? workingFormData.unit
                  : 'serving',
            gramWeight:
              Number(payload.gramWeight) > 0
                ? Number(payload.gramWeight)
                : Number(workingFormData?.gramWeight) > 0
                  ? Number(workingFormData.gramWeight)
                  : undefined,
          };
          rollupPreparedDrinkHydrationToRow(
            resolvedComponents as Array<Record<string, unknown>>,
            rowFallback,
          );
          payload.per_component_nutrition = resolvedComponents;
          Object.assign(payload, sumToTotals(resolvedComponents));
          payload.water_g = resolveEffectiveWaterGramsForNutritionRow({
            ...payload,
            per_component_nutrition: resolvedComponents,
          });
          // T-0390: single-chip mirrors chip portion; composites stamp 1/'meal'
          // (or N/'serving' when whole-meal slider ≠ 1) — never NULL/NULL.
          applyRowPortionStamp(payload as Record<string, unknown>, {
            components: resolvedComponents as Array<{ quantity?: number; unit?: string }>,
            wholeMealMultiplier: portionMultiplier,
          });
          // T-0061 (2026-05-22): mirror chip brand into the row-level
          // `brand_name` column when the row doesn't already carry one.
          // Prevents barcode-scanned products (Fat Boy, Good & Gather,
          // etc.) from saving with `brand_name: NULL` while the chip
          // keeps the brand tag.
          if (
            (payload.brand_name === undefined ||
              payload.brand_name === null ||
              String(payload.brand_name).trim().length === 0)
          ) {
            for (const c of resolvedComponents) {
              const b = (c as any)?.brand;
              if (typeof b === 'string' && b.trim().length > 0) {
                payload.brand_name = b.trim();
                break;
              }
            }
          }
        }

        // Phase 9.4.9 (2026-04-27): universal save-time sanity gate.
        //
        // The Phase 9.4.8 guard only checked numeric(6,2) overflow
        // (>9999.99) on row + components. That caught the 100k-kcal
        // sesame-bun crash, but failed to catch the follow-up
        // regression where the same bun saved with a "merely" insane
        // 1032 kcal/100g + 171 g of macros per 100 g of food. (The
        // numeric values were within DB column limits but physically
        // impossible.)
        //
        // The new gate runs every component through
        // `normalizeAndValidateComponent`, which mirrors the
        // grounding-side `finalizeNutrientsForReturn` checks:
        //
        //   - per-field per-100g cap (calories <= 900 kcal/100g, macros <= 100 g/100g)
        //   - mass-balance: protein + carbs + fat + water + alcohol <= 105 g/100g
        //   - numeric(6,2) overflow (legacy guard, retained)
        //
        // This is the new "no garbage past this line" contract. Any
        // component that fails — regardless of which UI path produced
        // it (grounding, Quick Add, Conversational, Notes parse, manual
        // edit) — blocks the save with an actionable alert. The user
        // can then fix the portion or swap the match.
        type Offender = { component: string; reason: string; gateAction: 'block' | 'confirm_with_loss_warning' };
        const persistGateOffenders: SaveGatePlausibilityOffender[] = [];
        let firstBlockedChip: Record<string, unknown> | null = null;
        let firstBlockedSanity: ComponentSaveGateResult | null = null;
        let gateQuestionChip: Record<string, unknown> | null = null;
        let gateQuestionKind: 'identity' | 'portion' | null = null;
        let userOwnsItChip: Record<string, unknown> | null = null;
        let userOwnsItIssue: { component: string; reason: string } | null = null;
        const flaggedRefs = new Set<any>();

        const barcodeRowOutcome =
          inputMethod === 'barcode'
            ? getBarcodeGroundingOutcome(
                ((extractedData as any)?.data_json ?? workingFormData) as any,
              )
            : undefined;
        const mealBarcodeForStamp =
          inputMethod === 'barcode'
            ? extractBarcodeFromNutritionLog({
                ...(payload as Record<string, unknown>),
                brand_barcode: payload.brand_barcode ?? (workingFormData as any)?.brand_barcode,
                barcode: payload.barcode ?? (workingFormData as any)?.barcode,
                per_component_nutrition: resolvedComponents,
              }) ??
              extractBarcodeFromNutritionLog({
                ...((extractedData as any)?.data_json ?? {}),
                ...(extractedData as Record<string, unknown>),
              })
            : undefined;
        if (barcodeRowOutcome && mealBarcodeForStamp) {
          for (const c of resolvedComponents) {
            const chipBarcode =
              typeof (c as any).barcode === 'string' && (c as any).barcode.trim().length >= 8
                ? (c as any).barcode.trim()
                : typeof (c as any).brand_barcode === 'string' &&
                    (c as any).brand_barcode.trim().length >= 8
                  ? (c as any).brand_barcode.trim()
                  : null;
            if (
              chipBarcode === mealBarcodeForStamp &&
              !(c as any).barcode_grounding_outcome
            ) {
              (c as any).barcode_grounding_outcome = barcodeRowOutcome;
            }
          }
        }

        for (let i = 0; i < resolvedComponents.length; i++) {
          resolvedComponents[i] = sanitizeComponentBarcodeProvenance(
            resolvedComponents[i] as Record<string, unknown>,
          ) as typeof resolvedComponents[number];
        }

        for (const c of resolvedComponents) {
          repairMixedNutritionBasisBeforeGate(c);
          reinterpretWaterGIfPer100gStuckOnAbsolute(c);
          repairPackagedChipNutritionBasis(c, formData as any);

          let result = evaluateComponentSaveGate(c);

          if (
            result.gateAction !== 'auto_pass' &&
            shouldAttemptGateReGround(c) &&
            !isEditMode
          ) {
            try {
              const { nutritionGroundingService } = await import(
                '../services/nutritionGroundingService'
              );
              const beforeCalories = Number((c as any).calories);
              const beforeGramWeight = Number((c as any).gramWeight);
              const failedFields = result.issues.map((i) => i.field);
              const repaired = await repairComponentByReGrounding(
                c as Record<string, unknown>,
                (args) => nutritionGroundingService.resolveIngredient(args),
              );
              if (repaired) {
                Object.assign(c, repaired);
                result = evaluateComponentSaveGate(c);
                if (result.gateAction === 'auto_pass' && POSTHOG_CONFIGURED) {
                  posthog.capture('meal_save_gate_auto_repaired', {
                    component_name: String(c.name ?? ''),
                    fdc_id: (c as any).fdc_id ?? null,
                    barcode: (c as any).barcode ?? null,
                    failed_fields: failedFields,
                    before_calories: Number.isFinite(beforeCalories) ? beforeCalories : null,
                    after_calories: Number((c as any).calories) || null,
                    before_gram_weight: Number.isFinite(beforeGramWeight) ? beforeGramWeight : null,
                    after_gram_weight: Number((c as any).gramWeight) || null,
                  });
                }
              }
            } catch (repairErr) {
              console.warn(
                `[UnifiedConfirmationScreen] T-0444 gate auto-repair failed for "${String(c.name ?? '')}":`,
                repairErr,
              );
            }
          }

          if (result.gateAction === 'auto_pass') continue;

          const compName = String(c.name ?? '<unnamed>');
          const presentation: SaveGatePresentation = resolveComponentGatePresentation(
            c as Record<string, unknown>,
            result.issues,
            inputMethod,
            result.gateAction,
          );

          console.warn(
            `[UnifiedConfirmationScreen] save gate: "${compName}" → ${result.gateAction} / ${presentation}`,
            result.issues,
          );

          // T-0726 — loss warnings must surface UI; never stamp gate_ui_skipped.
          if (
            result.gateAction === 'confirm_with_loss_warning'
            && (presentation === 'save_with_flag' || presentation === 'resolve_silently')
            && !gateQuestionChip
            && !userOwnsItChip
          ) {
            userOwnsItChip = c as Record<string, unknown>;
            userOwnsItIssue = {
              component: compName,
              reason: describeFirstIssue(compName, result),
            };
            if (!firstBlockedChip) {
              firstBlockedChip = c as Record<string, unknown>;
              firstBlockedSanity = result;
            }
            flaggedRefs.add(c);
            persistGateOffenders.push({
              component: compName,
              reason: describeFirstIssue(compName, result),
              gateAction: 'confirm_with_loss_warning',
            });
            continue;
          }

          if (presentation === 'save_with_flag' || presentation === 'resolve_silently') {
            flaggedRefs.add(c);
            persistGateOffenders.push({
              component: compName,
              reason: describeFirstIssue(compName, result),
              gateAction: result.gateAction === 'block' ? 'block' : 'confirm_with_loss_warning',
              gateUiSkipped: true,
            });
            if (POSTHOG_CONFIGURED) {
              posthog.capture('food_selection_gate_routed', {
                component_name: compName,
                input_method: inputMethod ?? null,
                presentation,
                gate_action: result.gateAction,
              });
            }
            continue;
          }

          if (presentation === 'ask_question' && !gateQuestionChip) {
            gateQuestionChip = c as Record<string, unknown>;
            gateQuestionKind = result.issues.some(i => i.field === 'identity') ? 'identity' : 'portion';
            if (!firstBlockedChip) {
              firstBlockedChip = c as Record<string, unknown>;
              firstBlockedSanity = result;
            }
            persistGateOffenders.push({
              component: compName,
              reason: describeFirstIssue(compName, result),
              gateAction: 'confirm_with_loss_warning',
            });
            continue;
          }

          if (presentation === 'user_owns_it' && !userOwnsItChip) {
            userOwnsItChip = c as Record<string, unknown>;
            userOwnsItIssue = {
              component: compName,
              reason: result.issues[0]?.reason ?? describeFirstIssue(compName, result),
            };
            if (!firstBlockedChip) {
              firstBlockedChip = c as Record<string, unknown>;
              firstBlockedSanity = result;
            }
            // Keep an offender record so Save anyway can stamp plausibility_issues
            // (T-0565 / T-0641 — override is allowed; surface is not a hard block).
            flaggedRefs.add(c);
            persistGateOffenders.push({
              component: compName,
              reason: describeFirstIssue(compName, result),
              gateAction: 'confirm_with_loss_warning',
            });
            continue;
          }

          // Fallback: silent flag when another chip already owns the question slot.
          flaggedRefs.add(c);
          persistGateOffenders.push({
            component: compName,
            reason: describeFirstIssue(compName, result),
            gateAction: result.gateAction === 'block' ? 'block' : 'confirm_with_loss_warning',
            gateUiSkipped: true,
          });
        }

        const aggregateIssues = checkAggregateMealPlausibility(resolvedComponents);
        if (aggregateIssues.length > 0) {
          persistGateOffenders.push({
            component: '(meal total)',
            reason: describeAggregateMealIssue(aggregateIssues),
            gateAction: 'confirm_with_loss_warning',
            gateUiSkipped: true,
          });
        }

        const hardBlockers = persistGateOffenders.filter(o => o.gateAction === 'block');
        if (hardBlockers.length > 0) {
          console.error(
            '[UnifiedConfirmationScreen] save blocked — pathological values:',
            hardBlockers,
          );
          const blockedIssue = firstBlockedSanity?.issues[0];
          if (firstBlockedChip && firstBlockedSanity) {
            captureSaveGateOutcome({
              action: 'blocked',
              inputMethod,
              chip: firstBlockedChip,
              sanityResult: firstBlockedSanity,
              formData: workingFormData as Record<string, unknown>,
              extractedData: (extractedData ?? null) as Record<string, unknown> | null,
            });
          }
          const hardBlockerRowKey = buildNumbersLookOffRowKey(payload as any);
          const blockedChipId = resolveOffenderChipId(
            hardBlockers[0]?.component ?? '',
            firstBlockedChip,
          );
          const blockMessage = blockedIssue
            ? formatHardBlockGateMessage(hardBlockers[0]?.component ?? 'Item', blockedIssue)
            : hardBlockers[0]?.reason ?? t('unifiedConfirmation.alerts.itemCannotBeSaved', 'This item cannot be saved.');
          releaseProcessingInFinally = false;
          Alert.alert(
            t('unifiedConfirmation.alerts.cannotSaveYet', 'Cannot save yet'),
            blockMessage,
            [
              ...(blockedChipId
                ? [
                    {
                      text: t('unifiedConfirmation.buttons.editPortion', 'Edit portion'),
                      onPress: () => {
                        if (hardBlockerRowKey) markNumbersLookOffShown(hardBlockerRowKey);
                        openPortionEditorFromAlert(blockedChipId);
                        releaseSaveLock();
                      },
                    },
                  ]
                : []),
              {
                text: t('common.ok', 'OK'),
                style: 'cancel' as const,
                onPress: () => {
                  if (hardBlockerRowKey) markNumbersLookOffShown(hardBlockerRowKey);
                  releaseSaveLock();
                },
              },
            ],
          );
          return;
        }

        if (gateQuestionChip && gateQuestionKind) {
          const chipId = typeof gateQuestionChip.id === 'string' ? gateQuestionChip.id : undefined;
          let built:
            | { question: string; options: ClarifyQuestionOption[] }
            | null = null;
          if (gateQuestionKind === 'identity') {
            built = buildClarifyQuestion({
              query: String(gateQuestionChip.name ?? ''),
              alternatives: dedupeAlternativesByFdcId(
                (gateQuestionChip.alternatives as any[]) ?? [],
                (gateQuestionChip.fdc_id as string | null) ?? null,
              ),
              matchReviewReason:
                typeof gateQuestionChip.identity_reason === 'string'
                  ? gateQuestionChip.identity_reason
                  : undefined,
              currentName: String(gateQuestionChip.name ?? ''),
            });
          } else {
            built = buildPortionGateQuestion(gateQuestionChip);
          }
          if (built && chipId) {
            if (aggregateIssues.length > 0) {
              captureMealSaveGateWarning({ components: resolvedComponents, aggregateIssues });
            }
            captureSaveGateOutcome({
              action: 'warning',
              inputMethod,
              chip: gateQuestionChip,
              sanityResult: firstBlockedSanity!,
              formData: workingFormData as Record<string, unknown>,
              extractedData: (extractedData ?? null) as Record<string, unknown> | null,
            });
            releaseProcessingInFinally = false;
            setGateClarifyPayload({
              chipId,
              question: built.question,
              options: built.options,
              kind: gateQuestionKind,
            });
            setGateClarifyVisible(true);
            return;
          }
          if (gateQuestionKind === 'identity' && chipId) {
            releaseProcessingInFinally = false;
            pendingSaveAfterIdentityConfirmRef.current = true;
            openPickerForComponent(
              chipId,
              typeof gateQuestionChip.identity_reason === 'string'
                ? gateQuestionChip.identity_reason
                : t('unifiedConfirmation.prompts.whichMatchCorrect', 'Which match is correct?'),
            );
            releaseSaveLock();
            return;
          }
        }

        if (userOwnsItChip && userOwnsItIssue) {
          const userChipId = resolveOffenderChipId(userOwnsItIssue.component, userOwnsItChip);
          const userMessage = formatUserOwnsItGateMessage(
            userOwnsItIssue.component,
            firstBlockedSanity?.issues[0] ?? { field: 'gramWeight', reason: userOwnsItIssue.reason },
          );
          const rowKey = buildNumbersLookOffRowKey(payload as any);
          releaseProcessingInFinally = false;
          if (aggregateIssues.length > 0) {
            captureMealSaveGateWarning({ components: resolvedComponents, aggregateIssues });
          }
          if (firstBlockedChip && firstBlockedSanity) {
            captureSaveGateOutcome({
              action: 'warning',
              inputMethod,
              chip: firstBlockedChip,
              sanityResult: firstBlockedSanity,
              formData: workingFormData as Record<string, unknown>,
              extractedData: (extractedData ?? null) as Record<string, unknown> | null,
            });
          }
          const priorHist = gateWarningHistoryRef.current.get(userOwnsItIssue.component);
          gateWarningHistoryRef.current.set(userOwnsItIssue.component, {
            shown: (priorHist?.shown ?? 0) + 1,
            opened: priorHist?.opened ?? 0,
          });

          // T-0565 (b) / T-0646: user-authored portion warnings must offer Save
          // anyway — surface only, never a hard block. T-0646 removed this button
          // when retiring Numbers Look Off; that left turkey 8 g with no override.
          const proceedAfterUserOwnsItOverride = async () => {
            if (!gateOverrideGuardRef.current.tryConsume()) return;
            try {
              stampWasOverriddenAfterGate(resolvedComponents, flaggedRefs);
              if (payload && typeof payload === 'object') {
                (payload as any).was_overridden_after_gate = flaggedRefs.size > 0;
                (payload as any).plausibility_issues = buildPlausibilityIssuesForSave(
                  persistGateOffenders,
                  {
                    overridden: true,
                    gateWarningHistory: gateWarningHistoryRef.current,
                  },
                );
              }
              if (firstBlockedChip && firstBlockedSanity) {
                captureSaveGateOutcome({
                  action: 'overridden',
                  inputMethod,
                  chip: firstBlockedChip,
                  sanityResult: firstBlockedSanity,
                  formData: workingFormData as Record<string, unknown>,
                  extractedData: (extractedData ?? null) as Record<string, unknown> | null,
                });
              }

              auditMissingAfter = per100gMissingCount(payload as any, RECONCILIABLE_NUTRIENTS);
              try {
                const { userFoodPreferencesService } = await import('../services/userFoodPreferencesService');
                const { supabase } = await import('../services/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.id) {
                  await Promise.all(resolvedComponents.map(c =>
                    userFoodPreferencesService.upsertOnConfirm({
                      userId: user.id,
                      name: String(c.name ?? ''),
                      brand: c.brand ?? null,
                      fdcId: c.fdc_id ?? null,
                      source: c.data_source ?? null,
                      wasUserCorrected: !!c.was_user_corrected,
                    }),
                  ));
                }
              } catch (prefErr) {
                console.warn('[UnifiedConfirmationScreen] preference upsert failed:', prefErr);
              }

              const barcodeForCache =
                extractBarcodeFromNutritionLog({
                  ...(payload as Record<string, unknown>),
                  brand_barcode: payload.brand_barcode ?? (workingFormData as any)?.brand_barcode,
                  barcode: payload.barcode ?? (workingFormData as any)?.barcode,
                  per_component_nutrition: resolvedComponents,
                }) ??
                (inputMethod === 'barcode'
                  ? extractBarcodeFromNutritionLog({
                      ...(extractedData as Record<string, unknown>),
                      ...((extractedData as any)?.data_json ?? {}),
                    })
                  : undefined);
              if (barcodeForCache) {
                try {
                  for (const c of resolvedComponents) {
                    if (isAuthoritativeBarcodeLabelChip(c as any)) {
                      await nutritionGroundingService.persistVerifiedBarcodeFromComponent({
                        ...(c as Record<string, unknown>),
                        barcode: barcodeForCache,
                      });
                    }
                  }
                } catch (cacheErr) {
                  console.warn('[UnifiedConfirmationScreen] barcode cache persist failed:', cacheErr);
                }
              }

              setSavePhase('persisting');
              captureAddedSugarCoverageGapAtSave({
                input_method: inputMethod,
                payload: payload as Record<string, unknown>,
                components: resolvedComponents,
              });
              await onConfirm(payload);
              if (
                healthCategory === 'nutrition_log'
                && auditMissingBefore !== null
                && auditMissingAfter !== null
              ) {
                void recordNutritionSaveAudit({
                  input_method: typeof inputMethod === 'string' ? inputMethod : null,
                  is_edit_mode: isEditMode,
                  component_count: auditComponentCount,
                  reconciliable_missing_before: auditMissingBefore,
                  reconciliable_missing_after: auditMissingAfter,
                  payload: {
                    food_item: payload.food_item ?? null,
                    meal_type: payload.meal_type ?? null,
                    data_source: payload.data_source ?? null,
                    match_confidence: payload.match_confidence ?? null,
                    sugar_added_g_sanitized_components: sugarAddedSanitizedCount,
                    was_overridden_after_gate: true,
                  },
                });
              }
            } catch (overrideErr) {
              console.error('[UnifiedConfirmationScreen] user_owns_it override save failed:', overrideErr);
              Alert.alert(
                t('common.error', 'Error'),
                overrideErr instanceof Error ? overrideErr.message : t('common.unknownError', 'Unknown error'),
              );
            } finally {
              gateOverrideGuardRef.current.reset();
              releaseSaveLock();
            }
          };

          Alert.alert(
            t('unifiedConfirmation.alerts.checkYourPortion', 'Check your portion'),
            userMessage,
            [
              {
                text: t('unifiedConfirmation.buttons.editPortion', 'Edit portion'),
                style: 'cancel' as const,
                onPress: () => {
                  if (rowKey) markNumbersLookOffShown(rowKey);
                  const prior = gateWarningHistoryRef.current.get(userOwnsItIssue.component);
                  gateWarningHistoryRef.current.set(userOwnsItIssue.component, {
                    shown: prior?.shown ?? 1,
                    opened: (prior?.opened ?? 0) + 1,
                  });
                  openPortionEditorFromAlert(userChipId);
                  releaseSaveLock();
                },
              },
              {
                text: t('unifiedConfirmation.buttons.saveAnyway', 'Save anyway'),
                style: 'default' as const,
                onPress: () => {
                  if (rowKey) markNumbersLookOffShown(rowKey);
                  void proceedAfterUserOwnsItOverride();
                },
              },
            ],
          );
          return;
        }

        if (persistGateOffenders.length > 0) {
          if (aggregateIssues.length > 0) {
            captureMealSaveGateWarning({ components: resolvedComponents, aggregateIssues });
          }
          if (payload && typeof payload === 'object') {
            (payload as any).plausibility_issues = buildPlausibilityIssuesForSave(
              persistGateOffenders,
              {
                overridden: false,
                gateWarningHistory: gateWarningHistoryRef.current,
              },
            );
          }
        }

        auditMissingAfter = per100gMissingCount(payload as any, RECONCILIABLE_NUTRIENTS);

        // Phase 9.5 (2026-04-27): MFP-frequent-foods preference learning.
        // For every confirmed component bump (or create) the
        // `(user, name, brand)` row in user_food_preferences. When the
        // user explicitly swapped a match (was_user_corrected=true) the
        // service overwrites the stored fdc_id; otherwise it just bumps
        // last_used_at + use_count so frequency wins ties on the next
        // resolution. Best-effort — never blocks the save flow.
        //
        // Phase 9.12 (2026-04-29): use the post-enrichment array so
        // freshly-resolved stubs that picked up an fdc_id participate
        // in the preference loop too.
        try {
          const { userFoodPreferencesService } = await import('../services/userFoodPreferencesService');
          const { supabase } = await import('../services/supabase');
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            await Promise.all(resolvedComponents.map(c =>
              userFoodPreferencesService.upsertOnConfirm({
                userId: user.id,
                name: String(c.name ?? ''),
                brand: c.brand ?? null,
                fdcId: c.fdc_id ?? null,
                source: c.data_source ?? null,
                wasUserCorrected: !!c.was_user_corrected,
              }),
            ));
          }
        } catch (prefErr) {
          console.warn('[UnifiedConfirmationScreen] preference upsert failed:', prefErr);
        }

        // T-0271 / lookup-once: persist verified GTIN/barcode saves to nutrition_cache
        // (household serving + per-100g panel) before the row lands in nutrition_log.
        const barcodeForCache =
          extractBarcodeFromNutritionLog({
            ...(payload as Record<string, unknown>),
            brand_barcode: payload.brand_barcode ?? (workingFormData as any)?.brand_barcode,
            barcode: payload.barcode ?? (workingFormData as any)?.barcode,
            per_component_nutrition: resolvedComponents,
          }) ??
          (inputMethod === 'barcode'
            ? extractBarcodeFromNutritionLog({
                ...(extractedData as Record<string, unknown>),
                ...((extractedData as any)?.data_json ?? {}),
              })
            : undefined);
        if (barcodeForCache) {
          try {
            for (const c of resolvedComponents) {
              if (isAuthoritativeBarcodeLabelChip(c as any)) {
                await nutritionGroundingService.persistVerifiedBarcodeFromComponent({
                  ...(c as Record<string, unknown>),
                  barcode: barcodeForCache,
                });
              }
            }
          } catch (cacheErr) {
            console.warn('[UnifiedConfirmationScreen] barcode cache persist failed:', cacheErr);
          }
        }
        if (persistGateOffenders.length > 0) {
          (payload as any).plausibility_issues = buildPlausibilityIssuesForSave(
            persistGateOffenders,
            {
              overridden: false,
              gateWarningHistory: gateWarningHistoryRef.current,
            },
          );
        }
      }
      // Phase 11.2 (2026-05-01): we've finished the in-component
      // grounding/enrichment. The DB-write happens inside `onConfirm`.
      setSavePhase('persisting');
      captureAddedSugarCoverageGapAtSave({
        input_method: inputMethod,
        payload: payload as Record<string, unknown>,
        components:
          healthCategory === 'nutrition_log'
            ? (payload as Record<string, unknown>).per_component_nutrition
            : undefined,
      });
      await onConfirm(payload);

      if (
        healthCategory === 'nutrition_log'
        && auditMissingBefore !== null
        && auditMissingAfter !== null
      ) {
        void recordNutritionSaveAudit({
          input_method: typeof inputMethod === 'string' ? inputMethod : null,
          is_edit_mode: isEditMode,
          component_count: auditComponentCount,
          reconciliable_missing_before: auditMissingBefore,
          reconciliable_missing_after: auditMissingAfter,
          payload: {
            food_item: payload.food_item ?? null,
            meal_type: payload.meal_type ?? null,
            data_source: payload.data_source ?? null,
            match_confidence: payload.match_confidence ?? null,
            sugar_added_g_sanitized_components: sugarAddedSanitizedCount,
          },
        });
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : t('common.unknownError', 'Unknown error'));
    } finally {
      // Always release the local lock unless a gate Alert still owns it.
      // The screen wrapper may still be showing its own "Saving..." card via
      // `externalIsProcessing`, but our button no longer needs to claim ownership.
      if (releaseProcessingInFinally) {
        releaseSaveLock();
      }
    }
  };
  handleConfirmRef.current = handleConfirm;

  function hasPopulatedValue(v: unknown): boolean {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return false;
  }

  // Internal/system fields that should never be shown in the confirmation form
  const HIDDEN_SYSTEM_FIELDS = new Set([
    'source', 'input_method', 'enhancement_source', 'data_source',
    'nutrition_capture_kind',
    'corrected_by', 'correction_timestamp', 'original_enhancement_source',
    'original_calories', 'original_protein_g', 'original_carbs_g', 'original_fat_g',
    'original_values', 'was_edited', 'edited_at', 'edit_reason',
    'match_confidence', 'reconciliation_drift_pct', 'archived_at',
    'plausibility_issues', 'plausibility_resolutions', 'reconciliation_auto_corrected',
    'was_overridden_after_gate', 'per_component_nutrition',
    'provider_food_id', 'brand_barcode', 'confidence_score',
  ]);

  // Core fields shown in the compact confirmation view
  const coreFieldsByCategory: Record<string, string[]> = {
    nutrition_log: ['log_date', 'food_item', 'meal_type', 'quantity', 'unit', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'saturated_fat_g', 'cholesterol_mg', 'calcium_mg', 'iron_mg', 'potassium_mg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'folate_total_mcg', 'magnesium_mg', 'zinc_mg', 'omega_3_g', 'omega_6_g'],
    // Phase 9.17 P4 (2026-05-14) — supplement rows render a stripped-down
    // form: no meal_type, no macros, no sodium / cholesterol. Just identity +
    // the micros the medications bucket cares about. Keeps the screen from
    // looking like a meal entry when the user is logging a pill.
    nutrition_log__supplement: ['log_date', 'food_item', 'quantity', 'unit', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'vitamin_c_mg', 'vitamin_b6_mg', 'folate_total_mcg', 'vitamin_a_rae_mcg', 'vitamin_e_mg', 'vitamin_k_mcg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'selenium_mcg', 'omega_3_g'],
    physical_activity: [
      'activity_date', 'activity_type', 'duration_minutes', 'intensity',
      'calories_burned', 'distance_km', 'steps',
      'heart_rate_avg', 'workout_type', 'sets_count', 'reps_count',
      'weight_lifted_kg', 'exertion_level', 'notes',
    ],
    sleep_data: [
      'sleep_date', 'bedtime', 'wake_time', 'total_sleep_hours',
      'time_in_bed_hours', 'sleep_quality', 'wakings_count', 'notes',
    ],
    vital_signs: [
      'recorded_at', 'blood_pressure_systolic', 'blood_pressure_diastolic',
      'heart_rate', 'respiratory_rate', 'body_temperature',
      'oxygen_saturation', 'weight', 'height', 'bmi', 'notes',
    ],
    lab_results: ['test_name', 'test_date', 'result_value', 'result_unit', 'result_status'],
    vitamin_mineral_levels: ['nutrient_name', 'level', 'unit', 'status', 'reference_range_low', 'reference_range_high', 'test_date'],
    medications: ['medication_name', 'dosage', 'frequency', 'start_date', 'is_active'],
    allergies: ['allergen', 'allergen_type', 'reaction', 'severity'],
    symptoms: ['symptom_name', 'onset_at', 'severity', 'frequency'],
    mental_health: ['recorded_at', 'mood_score', 'anxiety_level', 'depression_level', 'stress_level'],
    demographics: ['date_of_birth', 'sex', 'gender_identity', 'ethnicity'],
    medical_conditions: ['condition_name', 'diagnosis_date', 'status', 'severity'],
    pain_records: ['recorded_at', 'pain_level', 'pain_type', 'pain_location'],
    substance_use: ['substance_type', 'use_date', 'quantity', 'unit'],
    reproductive_health: ['record_date', 'health_type', 'data'],
    environmental_exposures: ['exposure_date', 'exposure_type', 'exposure_level', 'unit'],
    sensory_health: ['assessment_date', 'sensory_type', 'assessment_result', 'severity'],
    skin_health: ['assessment_date', 'skin_condition', 'location', 'severity'],
    dental_health: ['visit_date', 'procedure_type', 'treatment_notes'],
    cognitive_assessments: ['assessment_date', 'assessment_type', 'score', 'max_score'],
    family_history: ['relationship', 'condition', 'age_of_onset'],
    genetic_history: ['genetic_test', 'gene_variant', 'result', 'test_date'],
    surgeries_procedures: ['procedure_name', 'procedure_date', 'procedure_type'],
    medical_imaging: ['imaging_date', 'imaging_type', 'body_part', 'laterality', 'reason_for_exam', 'findings_summary', 'impression', 'requires_follow_up', 'follow_up_recommendation', 'follow_up_date', 'notes'],
    vaccinations: [
      'vaccination_date', 'vaccine_name', 'vaccine_type', 'dose_number',
      'administration_site', 'lot_number', 'provider', 'notes',
    ],
    flexible_data: ['category', 'subcategory', 'data_type', 'value'],
  };

  // Phase 11.4 (2026-05-01) — narrower compact view for edit mode.
  // The full nutrition_log "core" list above includes many micros to
  // keep them inline on the standard new-entry confirmation, but
  // power users editing an existing row are usually fixing one of
  // the four macros (per nicissemd@icloud.net feedback). Show those
  // as primary always-visible inputs; everything else is under "More".
  const EDIT_MODE_CORE_FIELDS_NUTRITION = [
    'log_date',
    'food_item',
    'meal_type',
    'quantity',
    'unit',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
  ];

  // Phase 9.17 P4 — supplement rows should never display meal_type / macro
  // chrome. This helper picks the right core-fields list based on the row's
  // capture kind. `showAll` (Edit-All-Fields toggle) still drops meal_type
  // and macros from the "all" view too via `getVisibleFields`.
  const isSupplementRow = (formData as any).nutrition_capture_kind === 'supplement';

  // T-0225 (2026-06-13): true when the barcode-grounding fallback fired
  // (sparse OFF panel was backfilled from generic USDA). Drives the
  // "Estimated from USDA — verify against your product label" disclaimer
  // banner in MacroDisplay. Reads the chip's provenance flags
  // (`ai_filled_fields` / `foundation_borrowed_fields`) which are stamped
  // by `groundBarcodeSeedIfSparse` at scan time. For non-barcode entries
  // (chat / voice / camera / Type-It) this returns false because
  // `data_source !== 'barcode_scan'`.
  //
  // Reads from extractedData.data_json (the seed verbatim) when present;
  // falls back to formData / per_component_nutrition for edits where the
  // route param has been GC'd. The helper is defensive against shape
  // drift — it returns false rather than throwing on unexpected inputs.
  const isGroundedBarcodeRow = React.useMemo(() => {
    const seedFromExtract = (extractedData as any)?.data_json;
    if (seedFromExtract && wasBarcodeSeedGrounded(seedFromExtract)) return true;
    // Fall-through: synthesize a thin seed-shaped object from formData so the
    // helper's data_source + chip-provenance checks still work on edits.
    const synthesized = {
      data_source: (formData as any)?.data_source,
      per_component_nutrition: (formData as any)?.per_component_nutrition,
    };
    return wasBarcodeSeedGrounded(synthesized as any);
  }, [extractedData, formData]);

  const barcodeGroundingOutcome = React.useMemo(() => {
    const seedFromExtract = (extractedData as any)?.data_json;
    if (seedFromExtract) return getBarcodeGroundingOutcome(seedFromExtract);
    const synthesized = {
      data_source: (formData as any)?.data_source,
      per_component_nutrition: (formData as any)?.per_component_nutrition,
      barcode_grounding_outcome: (formData as any)?.barcode_grounding_outcome,
    };
    return getBarcodeGroundingOutcome(synthesized as any);
  }, [extractedData, formData]);
  const SUPPLEMENT_FORBIDDEN_FIELDS = new Set<string>([
    'meal_type',
    'meal_time',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'saturated_fat_g',
    'monounsaturated_fat_g',
    'polyunsaturated_fat_g',
    'trans_fat_g',
    'fiber_g',
    'sugar_g',
    'sugar_added_g',
    'sugar_alcohols_g',
    'starch_g',
    'alcohol_g',
    'cholesterol_mg',
    'sodium_mg',
    'water_g',
    'caffeine_mg',
    // Amino acids never belong on a pill row
    'tryptophan_mg', 'threonine_mg', 'isoleucine_mg', 'leucine_mg',
    'lysine_mg', 'methionine_mg', 'cystine_mg', 'phenylalanine_mg',
    'tyrosine_mg', 'valine_mg', 'histidine_mg',
  ]);

  const getCoreFieldNames = (): string[] => {
    if (healthCategory === 'nutrition_log' && isSupplementRow) {
      return coreFieldsByCategory.nutrition_log__supplement || [];
    }
    if (isEditMode && healthCategory === 'nutrition_log') {
      return EDIT_MODE_CORE_FIELDS_NUTRITION;
    }
    return coreFieldsByCategory[healthCategory] || [];
  };

  const getVisibleFields = (fields: FormField[], showAll: boolean): FormField[] => {
    const supplementGuard = (f: FormField): boolean =>
      !(healthCategory === 'nutrition_log' && isSupplementRow && SUPPLEMENT_FORBIDDEN_FIELDS.has(f.name));
    if (showAll) {
      return fields.filter(f => !HIDDEN_SYSTEM_FIELDS.has(f.name) && supplementGuard(f));
    }
    const coreFields = getCoreFieldNames();
    return fields.filter(field => {
      if (!supplementGuard(field)) return false;
      if (HIDDEN_SYSTEM_FIELDS.has(field.name)) return false;
      if (coreFields.includes(field.name)) return true;
      return hasPopulatedValue(formData[field.name]);
    });
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const helpText = formFactoryService.getFieldHelpText(field.name, healthCategory);


    switch (field.type) {
      case 'date':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <DatePicker
              date={value ? parseISODate(value) : undefined}
              onDateChange={(date) => {
                const dateString = date ? formatDateToISO(date) : '';
                updateField(field.name, dateString);
              }}
              placeholder={field.placeholder}
              style={styles.fieldInput}
              mode="outlined"
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      case 'datetime':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <DatePicker
              date={value ? new Date(value) : undefined}
              onDateChange={(date) => {
                updateField(field.name, date ? date.toISOString() : '');
                if (field.name === 'onset_at') {
                  updateField('onset_date', date ? formatDateToISO(date) : '');
                }
              }}
              placeholder={field.placeholder || t('unifiedConfirmation.placeholders.selectDateTime', 'Select date and time')}
              style={styles.fieldInput}
              mode="outlined"
              pickerMode="datetime"
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      case 'time':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              mode="outlined"
              value={value}
              onChangeText={(text) => updateField(field.name, text)}
              placeholder={field.placeholder}
              style={styles.fieldInput}
              keyboardType="numeric"
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      case 'boolean':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <View style={styles.booleanField}>
              <Text style={styles.fieldLabel}>
                {field.label} {field.required && <Text style={styles.required}>*</Text>}
              </Text>
              <Switch
                value={Boolean(value)}
                onValueChange={(newValue) => updateField(field.name, newValue)}
              />
            </View>
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      case 'select':
        // Get the proper dropdown options for this field - EXACT same as forms
        const getDropdownOptionsForField = (fieldName: string) => {
          // Map field names to dropdown option keys - EXACT same as used in forms
          const fieldToOptionMap: Record<string, keyof typeof DROPDOWN_OPTIONS> = {
            'sex': 'sex',
            'intensity': 'intensity',
            'severity': 'medicalConditionSeverity', // Used in MedicalConditionForm
            'status': 'medicalConditionStatus', // Used in MedicalConditionForm
            'frequency': 'symptomFrequency', // Used in SymptomsForm
            'allergen_type': 'allergenType', // Used in AllergiesForm
            'pain_type': 'painType',
            'activity_type': 'activityType', // Used in PhysicalActivityForm
            'meal_type': 'mealType', // Used in NutritionLogForm
            // Source field mapping removed - source is programmatically set,
            'result_status': 'labResultStatus', // Used in LabResultsForm
            'route': 'medicationRoute', // Used in MedicationsForm
            'marital_status': 'maritalStatus', // Used in DemographicsForm
            'education_level': 'educationLevel', // Used in DemographicsForm
            'income_range': 'incomeRange', // Used in DemographicsForm
            'procedure_type': 'dentalProcedureType', // Used in DentalHealthForm
            'health_type': 'reproductiveHealthType', // Used in ReproductiveHealthForm
            'sensory_type': 'sensoryType', // Used in SensoryHealthForm
            'vitamin_mineral_status': 'vitaminMineralStatus', // Used in VitaminMineralLevelForm
            'substance_type': 'substanceType', // Used in SubstanceUseForm
            'substance_frequency': 'substanceUseFrequency', // Used in SubstanceUseForm
            'exposure_type': 'environmentalExposureType', // Used in EnvironmentalExposureForm
            'allergy_severity': 'allergySeverity', // Used in AllergiesForm
            'skin_severity': 'skinHealthSeverity', // Used in SkinHealthForm
            'sensory_severity': 'sensorySeverity', // Used in SensoryHealthForm
            'surgery_procedure_type': 'surgeryProcedureType', // Used in SurgeryProcedureForm
            'imaging_type': 'imagingType',
            'body_part': 'imagingBodyPart',
            'laterality': 'imagingLaterality',
            'contrast_type': 'imagingContrast',
            'image_quality': 'imagingQuality',
            'nutrient_name': 'nutrientName',
            'relationship': 'familyRelationship',
            'anesthesia_type': 'anesthesiaType',
            'gender_identity': 'genderIdentity',
            'assessment_type': 'assessmentType',
            'pain_location': 'painLocation',
            'test_name': 'testName',
            'allergen': 'allergen',
            'symptom_name': 'symptomName',
            'vaccine_name': 'vaccineName',
            'skin_condition': 'skinCondition',
            'condition_name': 'conditionName',
          };
          
          const optionKey = fieldToOptionMap[fieldName];
          return optionKey ? DROPDOWN_OPTIONS[optionKey] : [];
        };

        const dropdownOptions = getDropdownOptionsForField(field.name);
        
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <StandardDropdown
              value={value}
              onValueChange={(newValue) => updateField(field.name, newValue)}
              options={dropdownOptions}
              placeholder={field.placeholder}
              label={`${field.label} ${field.required ? '*' : ''}`}
              error={!!error}
              helperText={error || helpText}
              style={styles.fieldInput}
            />
          </View>
        );

      case 'multiline':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              mode="outlined"
              value={value}
              onChangeText={(text) => updateField(field.name, text)}
              placeholder={field.placeholder}
              style={styles.fieldInput}
              multiline
              numberOfLines={3}
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      case 'number':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              mode="outlined"
              value={value ? String(value) : ''}
              onChangeText={(text) => {
                const numValue = text ? parseFloat(text) : '';
                updateField(field.name, numValue);
              }}
              placeholder={field.placeholder}
              style={styles.fieldInput}
              keyboardType="numeric"
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );

      default: // text
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              mode="outlined"
              value={value ? String(value) : ''}
              onChangeText={(text) => updateField(field.name, text)}
              placeholder={field.placeholder}
              style={styles.fieldInput}
            />
            {helpText && <HelperText type="info">{helpText}</HelperText>}
            {error && <HelperText type="error">{error}</HelperText>}
          </View>
        );
    }
  };

  const renderStandardDrinkPill = () => {
    if (healthCategory !== 'nutrition_log') return null;
    if (formData.meal_type !== 'beverage') return null;
    const alcoholG = Number(formData.alcohol_g);
    if (!Number.isFinite(alcoholG) || alcoholG <= 0) return null;

    let standardDrinks = Math.round((alcoholG / 14) * 2) / 2;
    if (standardDrinks <= 0) standardDrinks = 0.5;
    const drinkLabel = standardDrinks === 1 ? 'standard drink' : 'standard drinks';
    const niaaa = MEDICAL_SOURCES.niaaa_standard_drink_2024;

    return (
      <View style={styles.standardDrinkPill}>
        <Text style={styles.standardDrinkPillText}>
          {`≈ ${standardDrinks} ${drinkLabel}     [Alcohol: ${alcoholG.toFixed(1)} g]`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Standard drink information"
          onPress={() => {
            Alert.alert(
              niaaa.title,
              `${niaaa.summary}\n\n${niaaa.url}`,
            );
          }}
          hitSlop={8}
        >
          <Ionicons name="information-circle-outline" size={18} color="#666" />
        </Pressable>
      </View>
    );
  };

  const inputMethodInfo = getInputMethodInfo();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        <Text style={styles.loadingText}>{t('unifiedConfirmation.states.loadingConfig', 'Loading form configuration...')}</Text>
      </View>
    );
  }

  if (!formConfig) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color={paperTheme.colors.error} />
        <Text style={styles.errorText}>{t('unifiedConfirmation.states.failedLoadConfig', 'Failed to load form configuration')}</Text>
        <Button mode="contained" onPress={loadFormConfiguration}>
          {t('common.retry', 'Retry')}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={Platform.OS === 'web' ? styles.webContainer : undefined}
        contentContainerStyle={Platform.OS === 'web' ? styles.webContentContainer : undefined}
      >
      {/* ⚡ Phase 1.2: Streamlined header - minimal, modern */}
      <View style={styles.streamlinedHeader}>
        <Text style={styles.streamlinedTitle}>
          {isManualEntry
            ? t('unifiedConfirmation.headers.enterData', `Enter {{title}} Data`, { title: formConfig.title })
            : healthCategory === 'nutrition_log' ? t('unifiedConfirmation.headers.confirmMeal', '🍽️ Confirm Meal') : t('unifiedConfirmation.headers.confirmTitle', `Confirm {{title}}`, { title: formConfig.title })}
        </Text>
      </View>

      {/* T-0083: Editable meal name banner for chat / barcode / voice paths
          (camera shows an overlay on the image instead, handled below).    */}
      {healthCategory === 'nutrition_log' && !imageUri && (
        <View style={styles.mealNameBanner}>
          {editingTitle ? (
            <RNTextInput
              style={styles.mealNameInput}
              value={(formData.food_item as string) || ''}
              onChangeText={(v) => updateField('food_item', v)}
              onBlur={() => setEditingTitle(false)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => setEditingTitle(false)}
              placeholder={t('unifiedConfirmation.placeholders.mealName', 'Meal name')}
              placeholderTextColor="#aaa"
            />
          ) : (
            <TouchableOpacity
              onPress={() => setEditingTitle(true)}
              style={styles.mealNameTouchable}
              activeOpacity={0.7}
            >
              <Text style={styles.mealNameText} numberOfLines={2}>
                {(formData.food_item as string) || t('unifiedConfirmation.placeholders.tapToNameMeal', 'Tap to name this meal')}
              </Text>
              <Ionicons name="create-outline" size={16} color="#999" style={styles.mealNameEditIcon} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ⚡ Phase 1.2: Image Display for Camera/File Input */}
      {imageUri && (inputMethod === 'camera' || inputMethod === 'file') && (
        <Card style={styles.imageCard}>
          <Card.Content style={styles.imageCardContent}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.capturedImage, { width: windowWidth - 48, height: (windowWidth - 48) * 0.75 }]}
              resizeMode="cover"
            />
            {/* T-0083: Tap-to-edit food name overlay so camera-misidentified items
                can be corrected before save.                                       */}
            {healthCategory === 'nutrition_log' && (
              <View style={styles.imageOverlay}>
                {editingTitle ? (
                  <RNTextInput
                    style={[styles.foodNameOverlay, styles.foodNameOverlayInput]}
                    value={(formData.food_item as string) || ''}
                    onChangeText={(v) => updateField('food_item', v)}
                    onBlur={() => setEditingTitle(false)}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => setEditingTitle(false)}
                    placeholder={t('unifiedConfirmation.placeholders.mealName', 'Meal name')}
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    selectionColor="rgba(255,255,255,0.8)"
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingTitle(true)} activeOpacity={0.75}>
                    <View style={styles.mealNameOverlayRow}>
                      <Text style={styles.foodNameOverlay}>{formData.food_item || t('unifiedConfirmation.placeholders.tapToName', 'Tap to name')}</Text>
                      <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.85)" style={{ marginLeft: 5, marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                )}
                {baseMacros.calories > 0 && (
                  <Text style={styles.caloriesOverlay}>
                    {currentMacros.calories} cal • {currentMacros.protein_g}g protein
                    {portionMultiplier !== 1 && ` (${portionMultiplier}x)`}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {healthCategory === 'nutrition_log' &&
        imageUri &&
        (inputMethod === 'camera' || inputMethod === 'file') && (
          <View style={styles.photoEstimateBanner}>
            <Ionicons name="camera-outline" size={16} color="#E65100" />
            <Text style={styles.photoEstimateBannerText}>
              {t('unifiedConfirmation.banners.photoEstimateConfirm', 'Photo estimate — confirm portion below')}
            </Text>
          </View>
        )}

      {/* ⚡ Phase 1.4: Conversational AI Prompts */}
      {healthCategory === 'nutrition_log' && conversationalPrompts.length > 0 && !promptsCompleted && (
        <ConversationalPrompts
          questions={conversationalPrompts}
          onAnswer={handlePromptAnswer}
          onSkip={handlePromptSkip}
          onSkipAll={handlePromptSkipAll}
          onComplete={handlePromptsComplete}
        />
      )}

      {/* ⚡ Water Confirmation - for 0-calorie water entries */}
      {healthCategory === 'nutrition_log' && baseMacros.calories === 0 && (formData.food_item?.toLowerCase().includes('water') || formData.water_g) && (
        <Card style={[styles.card, { backgroundColor: '#E3F2FD' }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="water" size={28} color="#2196F3" />
              <Text style={{ fontSize: 20, fontWeight: '600', marginLeft: 8, color: '#0D47A1' }}>
                💧 {t('unifiedConfirmation.water.waterIntake', 'Water Intake')}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 32, fontWeight: '700', color: '#0D47A1' }}>
                  {formData.quantity || 1} {formData.unit || t('unifiedConfirmation.water.glass', 'glass')}
                </Text>
                {formData.water_g != null && formData.water_g > 0 ? (
                  <Text style={{ fontSize: 14, color: '#0D47A1' }}>
                    {(formData.water_g / 1000).toFixed(2)}L ({formData.water_g}g)
                  </Text>
                ) : null}
              </View>
              
              {/* Quick adjust buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#BBDEFB', borderRadius: 8, padding: 8 }}
                  onPress={() => {
                    const newQuantity = Math.max(1, (Number(formData.quantity) || 1) - 1);
                    const unit = (formData.unit || 'ounces').toLowerCase();
                    let waterGrams = 0;
                    if (unit.includes('ounce') || unit === 'oz') waterGrams = newQuantity * 29.57;
                    else if (unit.includes('cup')) waterGrams = newQuantity * 237;
                    else if (unit.includes('glass')) waterGrams = newQuantity * 237;
                    else waterGrams = newQuantity * 29.57;
                    setFormData(prev => ({ ...prev, quantity: newQuantity, water_g: Math.round(waterGrams), meal_type: 'beverage' }));
                  }}
                >
                  <Ionicons name="remove" size={24} color="#0D47A1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#BBDEFB', borderRadius: 8, padding: 8 }}
                  onPress={() => {
                    const newQuantity = (Number(formData.quantity) || 1) + 1;
                    const unit = (formData.unit || 'ounces').toLowerCase();
                    let waterGrams = 0;
                    if (unit.includes('ounce') || unit === 'oz') waterGrams = newQuantity * 29.57;
                    else if (unit.includes('cup')) waterGrams = newQuantity * 237;
                    else if (unit.includes('glass')) waterGrams = newQuantity * 237;
                    else waterGrams = newQuantity * 29.57;
                    setFormData(prev => ({ ...prev, quantity: newQuantity, water_g: Math.round(waterGrams), meal_type: 'beverage' }));
                  }}
                >
                  <Ionicons name="add" size={24} color="#0D47A1" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Hydration Progress - Shows today's total + this entry */}
            {(() => {
              const thisEntryWaterG = formData.water_g || 0;
              const totalAfterThisEntry = todaysWaterG + thisEntryWaterG;
              const targetWaterG = waterTargetL * 1000;
              const progressPercent = Math.min(100, (totalAfterThisEntry / targetWaterG) * 100);
              const previousPercent = Math.min(100, (todaysWaterG / targetWaterG) * 100);
              
              return (
                <View style={{ backgroundColor: '#BBDEFB', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D47A1', marginBottom: 4 }}>
                    🎯 {t('unifiedConfirmation.water.todaysGoal', 'Today\'s Hydration Goal:')} {waterTargetL.toFixed(1)}L
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, height: 10, backgroundColor: '#E3F2FD', borderRadius: 5, marginRight: 8, overflow: 'hidden' }}>
                      {/* Previous water (lighter shade) */}
                      <View 
                        style={{ 
                          position: 'absolute',
                          width: `${previousPercent}%`, 
                          height: 10, 
                          backgroundColor: '#90CAF9', 
                          borderRadius: 5 
                        }} 
                      />
                      {/* Total including this entry (darker shade) */}
                      <View 
                        style={{ 
                          position: 'absolute',
                          width: `${progressPercent}%`, 
                          height: 10, 
                          backgroundColor: '#2196F3', 
                          borderRadius: 5,
                          opacity: 0.7
                        }} 
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: '#0D47A1', fontWeight: '600', minWidth: 50, textAlign: 'right' }}>
                      {(totalAfterThisEntry / 1000).toFixed(1)}L
                    </Text>
                  </View>
                  
                  {/* Show breakdown: previous + this entry */}
                  {todaysWaterG > 0 && (
                    <Text style={{ fontSize: 11, color: '#0D47A1', marginTop: 4 }}>
                      {t('unifiedConfirmation.water.breakdown', 'Previously:')} {(todaysWaterG / 1000).toFixed(1)}L + {t('unifiedConfirmation.water.thisEntry', 'This entry:')} {(thisEntryWaterG / 1000).toFixed(1)}L
                    </Text>
                  )}
                  
                  <Text style={{ fontSize: 12, color: '#0D47A1', marginTop: 4, fontWeight: '500' }}>
                    {totalAfterThisEntry >= targetWaterG 
                      ? t('unifiedConfirmation.water.goalHit', "🎉 Great job! You'll hit your hydration goal with this!") 
                      : progressPercent >= 75
                        ? t('unifiedConfirmation.water.goalAlmost', `💪 Almost there! You'll be {{percent}}% hydrated!`, { percent: Math.round(progressPercent) })
                        : progressPercent >= 50
                          ? t('unifiedConfirmation.water.goalHalf', `👍 Halfway! {{glasses}} more glasses to go.`, { glasses: Math.ceil((targetWaterG - totalAfterThisEntry) / 237) })
                          : t('unifiedConfirmation.water.goalKeep', `💧 Keep going! {{glasses}} more glasses to hit your goal.`, { glasses: Math.ceil((targetWaterG - totalAfterThisEntry) / 237) })}
                  </Text>
                </View>
              );
            })()}
          </Card.Content>
        </Card>
      )}

      {/* ⚡ Barcode Serving Size Help - shows when we have product-specific info */}
      {healthCategory === 'nutrition_log' && inputMethod === 'barcode' && formData.product_serving_info && (
        <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#2E7D32', marginLeft: 8 }}>
                {formData.quantity} {formData.unit} (~{formData.serving_size}g)
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#388E3C', marginBottom: 6 }}>
              {t('unifiedConfirmation.barcode.adjustQuantityPrompt', 'Adjust quantity using the slider below or tap a preset:')}
            </Text>
            {!formData.is_per_100g &&
              (Number(formData.serving_size) > 0 ||
                Number((formData as any).product_serving_info?.grams) > 0) && (
              <Text style={{ fontSize: 11, color: '#558B2F', marginBottom: 10 }}>
                {t('unifiedConfirmation.barcode.presetsScaleNotice', 'Presets scale the label nutrition panel; gram amounts are approximate.')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(() => {
                // Generate presets based on unit type
                const unit = formData.unit || 'g';
                
                if (unit === 'crackers') {
                  return [
                    { label: t('unifiedConfirmation.barcode.crackers3', '3 crackers'), qty: 3 },
                    { label: t('unifiedConfirmation.barcode.crackers5', '5 crackers'), qty: 5 },
                    { label: t('unifiedConfirmation.barcode.crackers10', '10 crackers'), qty: 10 },
                    { label: t('unifiedConfirmation.barcode.crackers15', '15 crackers'), qty: 15 },
                  ];
                } else if (unit === 'cookies') {
                  return [
                    { label: t('unifiedConfirmation.barcode.cookie1', '1 cookie'), qty: 1 },
                    { label: t('unifiedConfirmation.barcode.cookie2', '2 cookies'), qty: 2 },
                    { label: t('unifiedConfirmation.barcode.cookie3', '3 cookies'), qty: 3 },
                  ];
                } else if (unit === 'slices') {
                  return [
                    { label: t('unifiedConfirmation.barcode.slice1', '1 slice'), qty: 1 },
                    { label: t('unifiedConfirmation.barcode.slice2', '2 slices'), qty: 2 },
                  ];
                }
                const labeledGrams =
                  Number(formData.serving_size) ||
                  Number((formData as any).product_serving_info?.grams) ||
                  0;
                const useApproxLabels = !formData.is_per_100g && labeledGrams > 0;
                return [
                  {
                    label: useApproxLabels
                      ? formatBarcodeLabeledServingPresetLabel(labeledGrams, 15)
                      : '15g',
                    qty: 15,
                  },
                  {
                    label: useApproxLabels
                      ? formatBarcodeLabeledServingPresetLabel(labeledGrams, 28)
                      : '28g (1oz)',
                    qty: 28,
                  },
                  {
                    label: useApproxLabels
                      ? formatBarcodeLabeledServingPresetLabel(labeledGrams, 50)
                      : '50g',
                    qty: 50,
                  },
                  {
                    label: useApproxLabels
                      ? formatBarcodeLabeledServingPresetLabel(labeledGrams, 100)
                      : '100g',
                    qty: 100,
                  },
                ];
              })().map(({ label, qty }) => {
                // Phase 9.13: active-state check now compares against the
                // multiplier we'd apply, not the raw `qty` literal. The
                // pre-9.13 `formData.quantity === qty` check was a
                // separate latent bug — it never lit up because the chip
                // also wrote a multiplier into a different state slot.
                const isActive = Math.abs(portionMultiplier - qty / 100) < 1e-6;
                return (
                  <TouchableOpacity
                    key={qty}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: isActive ? '#4CAF50' : '#C8E6C9',
                      borderRadius: 16,
                    }}
                    onPress={() => {
                      // Phase 9.13 (2026-04-29): handlePortionChange takes a
                      // MULTIPLIER (line ~486: originalBaseMacros.calories *
                      // newQuantity), not raw grams. Pre-9.13 this preset
                      // path passed `qty` literally (e.g. 100 for the
                      // "100g" chip), so a single tap multiplied the user's
                      // calories by 100x — the most extreme of the portion
                      // bugs reported by the 2026-04-29 TestFlight tester.
                      // The other preset path (per-100g barcode) already
                      // does this conversion correctly. Multiplier is
                      // qty/100 (full row = 1.0). With a real labeled
                      // serving, preset *labels* show ~grams via
                      // formatBarcodeLabeledServingPresetLabel — not "100g".
                      handlePortionChange(qty / 100);
                    }}
                  >
                    <Text style={{ color: isActive ? '#fff' : '#2E7D32', fontWeight: '500' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* ⚡ Per-100g Notice for Barcode Scans without serving size data */}
      {healthCategory === 'nutrition_log' && inputMethod === 'barcode' && formData.is_per_100g && !formData.product_serving_info && (
        <Card style={[styles.card, { backgroundColor: '#FFF3E0' }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="information-circle" size={24} color="#E65100" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#E65100', marginLeft: 8 }}>
                {t('unifiedConfirmation.barcode.per100gNoticeTitle', 'Data is per 100g - Adjust your serving size below')}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#EF6C00', marginBottom: 12 }}>
              {t('unifiedConfirmation.barcode.per100gNoticeBody', 'The barcode database doesn\'t have serving size info for this product. Use the slider to match your actual portion.')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: t('unifiedConfirmation.barcode.grams15Small', '15g (small)'), grams: 15 },
                { label: '30g', grams: 30 },
                { label: '50g', grams: 50 },
                { label: '100g', grams: 100 },
              ].map(({ label, grams }) => (
                <TouchableOpacity
                  key={grams}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: portionMultiplier === grams / 100 ? '#FF9800' : '#FFE0B2',
                    borderRadius: 16,
                  }}
                  onPress={() => handlePortionChange(grams / 100)}
                >
                  <Text style={{ color: portionMultiplier === grams / 100 ? '#fff' : '#E65100', fontWeight: '500' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {healthCategory === 'nutrition_log' && (supplementAffordance.active || supplementAffordance.suggest) && (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <SupplementBadge
            active={supplementAffordance.active}
            onPress={handleSupplementCaptureToggle}
          />
        </View>
      )}

      {healthCategory === 'nutrition_log' && !!(formData as any).typical_supplement_dose_note && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <HelperText type="info" visible>
            {(formData as any).typical_supplement_dose_note}
          </HelperText>
        </View>
      )}

      {/* Phase 9.6 (2026-04-27): data-confidence pill. One-line summary
          of "how much should the user trust this row?" derived from the
          minimum match_confidence across grounded components. Hidden
          when there are no components (manual entry / barcode-only). */}
      {healthCategory === 'nutrition_log' && (() => {
        const grounded = foodComponents.filter(
          c => typeof c.match_confidence === 'number' && c.match_confidence > 0
        );
        if (grounded.length === 0) return null;
        const minConf = Math.min(
          ...grounded.map(c => Number(c.match_confidence) || 0)
        );
        const aiFilledCount = foodComponents.filter(
          c => Array.isArray(c.ai_filled_fields) && c.ai_filled_fields.length > 0
        ).length;
        const correctedCount = foodComponents.filter(c => c.was_user_corrected).length;
        // Pill colour and label: green ≥0.85, amber 0.6-0.85, red <0.6.
        let pillBg = '#E8F5E9'; let pillFg = '#1B5E20'; let pillLabel = t('unifiedConfirmation.confidencePill.high', 'High data confidence');
        if (minConf < 0.6) { pillBg = '#FFEBEE'; pillFg = '#B71C1C'; pillLabel = t('unifiedConfirmation.confidencePill.low', 'Low data confidence'); }
        else if (minConf < 0.85) { pillBg = '#FFF8E1'; pillFg = '#8D6E00'; pillLabel = t('unifiedConfirmation.confidencePill.mixed', 'Mixed data confidence'); }
        const subtitle: string[] = [];
        subtitle.push(t('unifiedConfirmation.confidencePill.groundedCount', `{{count}} grounded`, { count: grounded.length }));
        if (aiFilledCount > 0) subtitle.push(t('unifiedConfirmation.confidencePill.estimatedCount', `{{count}} partly estimated`, { count: aiFilledCount }));
        if (correctedCount > 0) subtitle.push(t('unifiedConfirmation.confidencePill.correctedCount', `{{count}} corrected`, { count: correctedCount }));
        return (
          <View style={[styles.confidencePill, { backgroundColor: pillBg }]}>
            <Ionicons name="analytics-outline" size={16} color={pillFg} />
            <Text style={[styles.confidencePillLabel, { color: pillFg }]}>
              {pillLabel} ({Math.round(minConf * 100)}%)
            </Text>
            <Text style={[styles.confidencePillSubtitle, { color: pillFg }]}>
              {subtitle.join(' • ')}
            </Text>
          </View>
        );
      })()}

      {healthCategory === 'nutrition_log' && foodComponents.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Button
            mode="outlined"
            compact
            onPress={handleRefreshNutrients}
            loading={lookingUpNutrition}
            disabled={lookingUpNutrition || isProcessing}
          >
            {t('unifiedConfirmation.buttons.refreshNutrients', 'Refresh nutrients (USDA / cache)')}
          </Button>
          <HelperText type="info" style={{ marginTop: 4 }}>
            {t('unifiedConfirmation.helpers.refreshNutrients', 'Fills missing micronutrients from your chip names. Values you edited stay put.')}
          </HelperText>
        </View>
      )}

      {/*
        Phase 9.15 (2026-04-30) — entry-mode hint chip. Surfaces a
        gentle pointer that the Chat flow can do AI-assisted lookups
        for users who landed in the manual form (route emits
        `inputMethod: 'manual'` from `screens/input/ManualFormScreen.tsx`).
        Pure read-only nudge — no behaviour change if the user
        ignores it. Hidden once components have been added so the
        chrome stays minimal during active editing.
      */}
      {healthCategory === 'nutrition_log'
        && (inputMethod as string) === 'manual'
        && foodComponents.length === 0 && (
        <View style={styles.manualHintChip}>
          <Ionicons name="bulb-outline" size={14} color="#1976D2" style={{ marginRight: 6 }} />
          <Text style={styles.manualHintChipText}>
            {t('unifiedConfirmation.tips.chatLookup', 'Tip: Use the Chat tab for AI-assisted nutrition lookup.')}
          </Text>
        </View>
      )}

      {/* ⚡ Phase 1.2: Nutrition Confirmation Enhancements (portion slider, components, macro rings) */}
      {/* ⚡ FIX: Show enhancements even when calories are 0 (database lookup may have timed out) */}
      {/* Users can still manually enter nutrition data via the form fields below */}
      {healthCategory === 'nutrition_log' && (
        <NutritionConfirmationEnhancements
          quantity={portionMultiplier}
          onQuantityChange={handlePortionChange}
          baseMacros={baseMacros}
          currentMacros={currentMacros}
          macroTargets={userMacroTargets || undefined}  // ⚡ Pass user's actual targets
          isSupplement={isSupplementRow}
            /* Suppresses the "Nutrition data couldn't be loaded" warning
               for supplement rows where zero macros are the intended
               post-Phase-2 state. The "Supplement — calories not counted"
               banner already explains this above. */
          isGrounded={isGroundedBarcodeRow}
            /* T-0225 (2026-06-13): shows the "Estimated from USDA — verify
               against your product label" disclaimer banner above the
               macro rings when a barcode scan landed via the sparse-OFF
               grounding fallback. False for non-barcode entries and for
               barcode entries where OFF supplied the full panel. */
          barcodeGroundingOutcome={barcodeGroundingOutcome}
          onBarcodeScanNutritionFacts={
            inputMethod === 'barcode'
              ? () => inputTriggerService.openCamera('nutrition_log')
              : undefined
          }
          onBarcodeFindWithAI={
            inputMethod === 'barcode'
              ? () => {
                  const barcode = String(
                    (formData as any)?.brand_barcode ??
                      (extractedData as any)?.brand_barcode ??
                      '',
                  ).trim();
                  const productName = String(
                    formData.food_item ??
                      (extractedData as any)?.food_item ??
                      '',
                  ).trim();
                  inputTriggerService.openTextInput(
                    'nutrition_log',
                    barcode
                      ? buildBarcodeFindWithAIPrompt(barcode, productName || undefined)
                      : undefined,
                  );
                }
              : undefined
          }
          components={foodComponents}
          onComponentsChange={(updatedComponents) => {
            // Phase 9.15 (2026-04-30) — ring + image overlay derive
            // from `foodComponents` directly, so removing a chip
            // automatically subtracts its contribution from the
            // displayed totals. Pre-9.15 this callback maintained
            // three parallel mirrors (formData macros,
            // addedItemsMacros, originalBaseMacros), each with its
            // own rounding semantics; mismatches between mirrors
            // produced visible "phantom calories" after removals.
            // The single source of truth is the components array.
            // T-0366: mirror into formData so hydration cannot restore
            // deleted chips when food_item label updates on Recents add.
            syncLiveComponentsToFormData(updatedComponents, (fd) => {
              const reconciled = reconcileFoodItemLabelWithComponents(fd.food_item, updatedComponents);
              return reconciled && reconciled !== fd.food_item
                ? { ...fd, food_item: reconciled }
                : fd;
            });
            setFoodComponents(updatedComponents);
          }}
          onAddComponent={() => {
            setShowAddComponentModal(true);
          }}
          onEditComponent={async (id: string, newQuantity: number, newUnit: string) => {
            // Phase 13.2 (2026-05-02): use the same `unitToGrams` +
            // product-specific grams-per-unit override as
            // ComponentEditModal (`portionToGrams.ts`). The old inline
            // converter treated every unknown unit (e.g. cheese "stick")
            // as 100 g, did not thread `grams_per_unit` from barcode
            // seeds, and used `gramWeight || unitToGrams(qty, unit)` so
            // a bogus 1 g basis (100 cal / 1 g) skipped rescaling —
            // Expo Go save then tripped the 10 000 kcal/100g gate.
            const component = foodComponents.find(c => c.id === id);
            if (!component) return;

            const nu = normalisePortionUnit(newUnit);
            const qty0 = Number(component.quantity) || 1;

            const productGramsPerUnit = (() => {
              const gw = Number((component as any).gramWeight);
              if (Number.isFinite(gw) && gw > 0 && qty0 > 0) return gw / qty0;
              const gpu = Number(
                (component as any).grams_per_unit ??
                (formData as any).grams_per_unit ??
                (formData as any).product_serving_info?.grams,
              );
              return Number.isFinite(gpu) && gpu > 0 ? gpu : undefined;
            })();

            const chipEditOpts = {
              name: component.name,
              foodClass: (component as any).foodClass,
              foodPortions: (component as any).food_portions,
              gramsPerVariableUnitOverride: productGramsPerUnit,
            };
            const overrideOpts = {
              name: component.name,
              foodPortions: (component as any).food_portions,
            };

            let originalGrams = Number((component as any).gramWeight);
            if (!Number.isFinite(originalGrams) || originalGrams <= 0) {
              originalGrams = chipEditGramsForUnit(qty0, component.unit, {
                ...chipEditOpts,
                gramsPerVariableUnitOverride: productGramsPerUnit,
              }).grams;
            }

            const cal0 = Number(component.calories);
            const MAX_CAL_PER_G = 9;
            if (
              Number.isFinite(cal0) &&
              cal0 > 0 &&
              originalGrams > 0 &&
              productGramsPerUnit !== undefined &&
              productGramsPerUnit > 0 &&
              cal0 / originalGrams > MAX_CAL_PER_G
            ) {
              if (normalisePortionUnit(component.unit) === 'g') {
                originalGrams = productGramsPerUnit;
              } else {
                originalGrams = chipEditGramsForUnit(qty0, component.unit, chipEditOpts).grams;
              }
            }

            const newConversion = chipEditGramsForUnit(newQuantity, nu, {
              ...chipEditOpts,
              gramsPerVariableUnitOverride: variableUnitGramsOverride(
                component as any,
                nu,
                overrideOpts,
              ),
            });
            const newGrams = newConversion.grams;
            if (!(originalGrams > 0) || !Number.isFinite(newGrams)) {
              console.warn('[UnifiedConfirmationScreen] onEditComponent: invalid gram basis', {
                name: component.name,
                originalGrams,
                newGrams,
              });
              return;
            }

            const scale = newGrams / originalGrams;
            const roundG = (x: number) => Math.round(x * 10) / 10;

            console.log(
              `📝 Edit "${component.name}": ${qty0} ${component.unit} → ${newQuantity} ${nu} ` +
                `(basis ${originalGrams}g → ${newGrams}g, scale ${scale.toFixed(4)})`,
            );

            const updatedComponents = foodComponents.map((c) => {
              if (c.id !== id) return cloneChipForState(c as any);
              const next: Record<string, unknown> = {
                ...cloneChipForState(c as any),
                quantity: newQuantity,
                unit: nu,
                gramWeight: newGrams,
                was_user_corrected: true,
                portion_authored_by: 'user',
                portion_conversion_source: newConversion.source,
              };
              if (newQuantity > 0 && newGrams > 0) {
                next.grams_per_unit = newGrams / newQuantity;
              }
              const priorSrc = (component as any).portion_conversion_source;
              const priorGpu = Number((component as any).grams_per_unit);
              const priorLabelGrams = Number((component as any).label_serving_grams);
              const priorBarcode = (component as any).barcode;
              const compDataSource = (component as any).data_source;
              const mealBarcode = String(
                (formData as any)?.brand_barcode
                  ?? (formData as any)?.barcode
                  ?? (extractedData as any)?.brand_barcode
                  ?? (extractedData as any)?.barcode
                  ?? '',
              ).trim() || undefined;
              const isPackagedBarcodeContext =
                priorSrc === 'gtin_serving'
                || priorSrc === 'label_serving'
                || Boolean(priorBarcode)
                || compDataSource === 'barcode_scan'
                || Boolean(mealBarcode);
              const leavingNonMassForMass =
                !isMassUnit(component.unit) && isMassUnit(nu);
              let labelBasis: number | undefined;
              if (Number.isFinite(priorGpu) && priorGpu > 1) {
                labelBasis = priorGpu;
              } else if (leavingNonMassForMass && originalGrams > 1) {
                labelBasis = originalGrams;
              }
              let labelServingGrams: number | undefined;
              if (Number.isFinite(priorLabelGrams) && priorLabelGrams > 1) {
                labelServingGrams = priorLabelGrams;
              } else if (isPackagedBarcodeContext && labelBasis !== undefined) {
                labelServingGrams = labelBasis;
              }
              if (labelServingGrams !== undefined) {
                next.label_serving_grams = labelServingGrams;
              }
              if (!priorBarcode && mealBarcode) {
                next.barcode = mealBarcode;
              }
              const gpp = (component as any).grams_per_piece;
              if (gpp != null && Number.isFinite(gpp) && gpp > 0) {
                next.grams_per_piece = gpp;
              }
              for (const f of RECONCILIABLE_NUTRIENTS) {
                const v = (c as any)[f];
                if (typeof v !== 'number' || !Number.isFinite(v)) continue;
                const nv = v * scale;
                if (f === 'calories') {
                  next[f] = Math.round(nv);
                } else if (f.endsWith('_mg') || f.endsWith('_mcg')) {
                  next[f] = Math.round(nv);
                } else {
                  next[f] = roundG(nv);
                }
              }
              return next as typeof c;
            });
            setFoodComponents(updatedComponents as any);
            setFormData((prev) => {
              const next: Record<string, any> = {
                ...prev,
                per_component_nutrition: componentsForFormMirror(updatedComponents as any),
              };
              if (updatedComponents.length === 1) {
                const only = updatedComponents[0] as any;
                next.quantity = only.quantity;
                next.unit = only.unit;
              }
              return next;
            });
            componentsUserEditedRef.current = true;
          }}
          showPortionSlider={true}
          showComponents={true}
          showMacroRings={true}
          isAddingIngredient={lookingUpNutrition}
          onChangeMatch={(componentId) => openPickerForComponent(componentId)}
          repairingChipIds={repairingCalorieChipIds}
          requestEditComponentId={requestEditComponentId}
          onRequestEditHandled={() => setRequestEditComponentId(null)}
        />
      )}

      {/* Phase 6 (2026-05-19) — F4: "Other Ingredients" section.
          Shown for supplement rows when DSLD returned unmappedIngredients
          (e.g. herbals like Bilberry Fruit Extract, Saw Palmetto, CoQ10)
          that have no matching nutrition_log column.
          These are display-only — they are NOT persisted to the DB in this
          phase. A future phase can add an unmapped_ingredients jsonb column. */}
      {isSupplementRow && (() => {
        const allUnmapped: Array<{ name: string; quantity: number; unit: string }> = [];
        for (const comp of foodComponents) {
          const items = (comp as any).unmapped_ingredients;
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item?.name && !allUnmapped.some(u => u.name === item.name)) {
                allUnmapped.push(item);
              }
            }
          }
        }
        if (allUnmapped.length === 0) return null;
        return (
          <View style={styles.unmappedIngredientsSection}>
            <Text style={styles.unmappedIngredientsTitle}>
              {t('unifiedConfirmation.supplements.otherIngredients', 'Other Ingredients (not yet tracked)')}
            </Text>
            {allUnmapped.map((item, idx) => (
              <Text key={idx} style={styles.unmappedIngredientRow}>
                {item.name}
                {item.quantity > 0 ? ` — ${item.quantity} ${item.unit}` : ''}
              </Text>
            ))}
          </View>
        );
      })()}

      {/* ⚡ Phase 1.2: Quick Context Section - Inline meal type and date.
          Phase 9.17 P4 (2026-05-14): for supplement rows we hide the
          meal-type chips entirely (a pill is not breakfast/lunch/dinner)
          and relabel the section "When did you take it?" so the screen
          stops looking like a meal-entry form. Date / time / notes chips
          stay because users still log supplements at a specific time on a
          specific day. */}
      {healthCategory === 'nutrition_log' && (
        <View style={styles.quickContextSection}>
          <Text style={styles.quickContextLabel}>
            {isSupplementRow ? t('unifiedConfirmation.context.whenDidYouTakeIt', 'When did you take it?') : t('unifiedConfirmation.context.quickContext', 'Quick Context')}
          </Text>
          {!isSupplementRow && (
            <View style={styles.mealTypeChips}>
              {mealTypes.map((meal) => (
                <TouchableOpacity
                  key={meal.value}
                  style={[
                    styles.mealTypeChip,
                    formData.meal_type === meal.value && styles.mealTypeChipSelected,
                  ]}
                  onPress={() => updateField('meal_type', meal.value)}
                >
                  <Text style={styles.mealTypeIcon}>{meal.icon}</Text>
                  <Text style={[
                    styles.mealTypeText,
                    formData.meal_type === meal.value && styles.mealTypeTextSelected,
                  ]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.contextRow}>
            {/* Date Picker Chip */}
            <TouchableOpacity 
              style={[styles.contextChip, showDatePicker && { backgroundColor: '#E3F2FD' }]}
              onPress={() => {
                setShowDatePicker(!showDatePicker);
                setShowTimePicker(false); // Close time picker if open
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={showDatePicker ? '#1976D2' : '#666'} />
              <Text style={[styles.contextChipText, showDatePicker && { color: '#1976D2' }]}>
                {formData.log_date === getTodayISO() 
                  ? t('unifiedConfirmation.dates.today', 'Today') 
                  : formData.log_date === getYesterdayISO()
                    ? t('unifiedConfirmation.dates.yesterday', 'Yesterday')
                    : formData.log_date || t('unifiedConfirmation.dates.today', 'Today')}
              </Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={14} color="#666" />
            </TouchableOpacity>
            
            {/* ⚡ TIME PICKER CHIP - Critical for circadian rhythm & fasting */}
            <TouchableOpacity 
              style={[styles.contextChip, showTimePicker && { backgroundColor: '#E3F2FD' }]}
              onPress={() => {
                setShowTimePicker(!showTimePicker);
                setShowDatePicker(false); // Close date picker if open
              }}
            >
              <Ionicons name="time-outline" size={16} color={showTimePicker ? '#1976D2' : '#666'} />
              <Text style={[styles.contextChipText, showTimePicker && { color: '#1976D2' }]}>
                {formData.meal_time 
                  ? new Date(formData.meal_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : t('unifiedConfirmation.time.now', 'Now')}
              </Text>
              <Ionicons name={showTimePicker ? "chevron-up" : "chevron-down"} size={14} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contextChip}
              onPress={() => setShowDetailedFields(true)}
            >
              <Ionicons name="create-outline" size={16} color="#666" />
              <Text style={styles.contextChipText}>{t('unifiedConfirmation.buttons.addNotes', 'Add Notes')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* ⚡ Inline Date Picker - Quick date selection */}
          {showDatePicker && (
            <View style={styles.inlineDatePicker}>
              <TouchableOpacity 
                style={[
                  styles.dateOption, 
                  formData.log_date === getTodayISO() && styles.dateOptionSelected
                ]}
                onPress={() => {
                  updateField('log_date', getTodayISO());
                  setShowDatePicker(false);
                }}
              >
                <Text style={[
                  styles.dateOptionText,
                  formData.log_date === getTodayISO() && styles.dateOptionTextSelected
                ]}>{t('unifiedConfirmation.dates.today', 'Today')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.dateOption,
                  formData.log_date === getYesterdayISO() && styles.dateOptionSelected
                ]}
                onPress={() => {
                  updateField('log_date', getYesterdayISO());
                  setShowDatePicker(false);
                }}
              >
                <Text style={[
                  styles.dateOptionText,
                  formData.log_date === getYesterdayISO() && styles.dateOptionTextSelected
                ]}>{t('unifiedConfirmation.dates.yesterday', 'Yesterday')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.dateOption,
                  formData.log_date === getDaysAgoISO(2) && styles.dateOptionSelected
                ]}
                onPress={() => {
                  updateField('log_date', getDaysAgoISO(2));
                  setShowDatePicker(false);
                }}
              >
                <Text style={[
                  styles.dateOptionText,
                  formData.log_date === getDaysAgoISO(2) && styles.dateOptionTextSelected
                ]}>{t('unifiedConfirmation.dates.daysAgoTwo', '2 days ago')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dateOption}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowDetailedFields(true); // Open full form for calendar picker
                }}
              >
                <Ionicons name="calendar" size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.dateOptionText}>{t('unifiedConfirmation.dates.other', 'Other...')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* ⚡ Inline Time Picker - CRITICAL for circadian rhythm & fasting */}
          {showTimePicker && (
            <View style={styles.inlineDatePicker}>
              {/* Quick time options */}
              {[
                { label: t('unifiedConfirmation.time.now', 'Now'), getTime: () => new Date() },
                { label: t('unifiedConfirmation.time.thirtyMinAgo', '30 min ago'), getTime: () => { const d = new Date(); d.setMinutes(d.getMinutes() - 30); return d; } },
                { label: t('unifiedConfirmation.time.oneHrAgo', '1 hr ago'), getTime: () => { const d = new Date(); d.setHours(d.getHours() - 1); return d; } },
                { label: t('unifiedConfirmation.time.twoHrsAgo', '2 hrs ago'), getTime: () => { const d = new Date(); d.setHours(d.getHours() - 2); return d; } },
              ].map((option) => {
                const optionTime = option.getTime();
                const isSelected = formData.meal_time && 
                  Math.abs(new Date(formData.meal_time).getTime() - optionTime.getTime()) < 60000; // Within 1 minute
                return (
                  <TouchableOpacity 
                    key={option.label}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      // Use current log_date with the selected time
                      const logDate = formData.log_date || getTodayISO();
                      const [year, month, day] = logDate.split('-').map(Number);
                      const newTime = option.getTime();
                      const newMealTime = new Date(year, month - 1, day, newTime.getHours(), newTime.getMinutes());
                      updateField('meal_time', newMealTime.toISOString());
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Common meal times */}
              {[
                { label: '7 AM', hour: 7 },
                { label: '12 PM', hour: 12 },
                { label: '6 PM', hour: 18 },
                { label: '9 PM', hour: 21 },
              ].map((option) => {
                const logDate = formData.log_date || getTodayISO();
                const [year, month, day] = logDate.split('-').map(Number);
                const optionTime = new Date(year, month - 1, day, option.hour, 0);
                const isSelected = formData.meal_time && 
                  new Date(formData.meal_time).getHours() === option.hour &&
                  new Date(formData.meal_time).getMinutes() === 0;
                return (
                  <TouchableOpacity 
                    key={option.label}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      updateField('meal_time', optionTime.toISOString());
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* ⚡ CUSTOM TIME - Opens native time picker for exact time selection */}
              <TouchableOpacity 
                style={[styles.dateOption, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}
                onPress={() => {
                  setShowCustomTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
                <Text style={[styles.dateOptionText, { color: '#4CAF50', fontWeight: '600' }]}>
                  {t('unifiedConfirmation.time.exactTime', 'Exact time...')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* ⚡ Native Time Picker for exact time selection */}
          {showCustomTimePicker && (
            <DateTimePicker
              value={formData.meal_time ? new Date(formData.meal_time) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={false}
              onChange={(event, selectedTime) => {
                // On Android, picker closes automatically. On iOS, it stays open.
                if (Platform.OS === 'android') {
                  setShowCustomTimePicker(false);
                }
                
                if (event.type === 'dismissed') {
                  setShowCustomTimePicker(false);
                  return;
                }
                
                if (selectedTime) {
                  // Combine selected time with current log_date
                  const logDate = formData.log_date || getTodayISO();
                  const [year, month, day] = logDate.split('-').map(Number);
                  const newMealTime = new Date(
                    year, 
                    month - 1, 
                    day, 
                    selectedTime.getHours(), 
                    selectedTime.getMinutes()
                  );
                  updateField('meal_time', newMealTime.toISOString());
                  
                  // Close the quick options panel and picker
                  setShowTimePicker(false);
                  if (Platform.OS === 'ios') {
                    // On iOS, we need a "Done" button or auto-close after selection
                    setShowCustomTimePicker(false);
                  }
                }
              }}
            />
          )}
        </View>
      )}

      {/* ⚡ Phase 1.2: Streamlined Vital Signs Display */}
      {healthCategory === 'vital_signs' && (formData.blood_pressure_systolic || formData.heart_rate || formData.weight || formData.oxygen_saturation || formData.body_temperature || formData.respiratory_rate || formData.height || formData.bmi || formData.pain_level) && (
        <View style={styles.quickContextSection}>
          <Text style={styles.quickContextLabel}>{t('unifiedConfirmation.vitals.title', 'Your Vitals')}</Text>
          <View style={styles.vitalsGrid}>
            {formData.blood_pressure_systolic && formData.blood_pressure_diastolic && (
              <View style={styles.vitalCard}>
                <Ionicons name="heart" size={24} color="#E53935" />
                <Text style={styles.vitalValue}>
                  {formData.blood_pressure_systolic}/{formData.blood_pressure_diastolic}
                </Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.bloodPressure', 'Blood Pressure')}</Text>
                <Text style={styles.vitalUnit}>mmHg</Text>
              </View>
            )}
            
            {formData.heart_rate && (
              <View style={styles.vitalCard}>
                <Ionicons name="pulse" size={24} color="#E91E63" />
                <Text style={styles.vitalValue}>{formData.heart_rate}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.heartRate', 'Heart Rate')}</Text>
                <Text style={styles.vitalUnit}>bpm</Text>
              </View>
            )}
            
            {formData.oxygen_saturation && (
              <View style={styles.vitalCard}>
                <Ionicons name="water" size={24} color="#00BCD4" />
                <Text style={styles.vitalValue}>{formData.oxygen_saturation}%</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.spo2', 'SpO2')}</Text>
                <Text style={styles.vitalUnit}>{t('unifiedConfirmation.vitals.oxygenSaturation', 'oxygen saturation')}</Text>
              </View>
            )}
            
            {formData.weight && (
              <View style={styles.vitalCard}>
                <Ionicons name="scale" size={24} color="#3F51B5" />
                <Text style={styles.vitalValue}>{formData.weight}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.weight', 'Weight')}</Text>
                <Text style={styles.vitalUnit}>kg</Text>
              </View>
            )}
            
            {formData.height && (
              <View style={styles.vitalCard}>
                <Ionicons name="resize" size={24} color="#7E57C2" />
                <Text style={styles.vitalValue}>{formData.height}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.height', 'Height')}</Text>
                <Text style={styles.vitalUnit}>cm</Text>
              </View>
            )}
            
            {formData.bmi && (
              <View style={styles.vitalCard}>
                <Ionicons name="body" size={24} color="#26A69A" />
                <Text style={styles.vitalValue}>{formData.bmi}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.bmi', 'BMI')}</Text>
                <Text style={styles.vitalUnit}>kg/m²</Text>
              </View>
            )}
            
            {formData.body_temperature && (
              <View style={styles.vitalCard}>
                <Ionicons name="thermometer" size={24} color="#FF5722" />
                <Text style={styles.vitalValue}>{formData.body_temperature}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.temperature', 'Temperature')}</Text>
                <Text style={styles.vitalUnit}>°C</Text>
              </View>
            )}
            
            {formData.respiratory_rate && (
              <View style={styles.vitalCard}>
                <Ionicons name="cloud" size={24} color="#42A5F5" />
                <Text style={styles.vitalValue}>{formData.respiratory_rate}</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.respiratoryRate', 'Respiratory Rate')}</Text>
                <Text style={styles.vitalUnit}>{t('unifiedConfirmation.vitals.breathsPerMin', 'breaths/min')}</Text>
              </View>
            )}
            
            {formData.pain_level != null && formData.pain_level !== '' && (
              <View style={styles.vitalCard}>
                <Ionicons name="flash" size={24} color="#FF7043" />
                <Text style={styles.vitalValue}>{formData.pain_level}/10</Text>
                <Text style={styles.vitalLabel}>{t('unifiedConfirmation.vitals.painLevel', 'Pain Level')}</Text>
                {formData.pain_location && <Text style={styles.vitalUnit}>{formData.pain_location}</Text>}
              </View>
            )}
          </View>
          
          {/* ⚡ Date/Time pickers for vital signs - Critical for accurate tracking */}
          <View style={styles.contextRow}>
            {/* Date Picker Chip */}
            <TouchableOpacity 
              style={[styles.contextChip, showDatePicker && { backgroundColor: '#E3F2FD' }]}
              onPress={() => {
                setShowDatePicker(!showDatePicker);
                setShowTimePicker(false);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={showDatePicker ? '#1976D2' : '#666'} />
              <Text style={[styles.contextChipText, showDatePicker && { color: '#1976D2' }]}>
                {(() => {
                  if (!formData.recorded_at) return t('unifiedConfirmation.dates.today', 'Today');
                  const recordedDate = new Date(formData.recorded_at);
                  const today = new Date();
                  const isToday = recordedDate.toDateString() === today.toDateString();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const isYesterday = recordedDate.toDateString() === yesterday.toDateString();
                  if (isToday) return t('unifiedConfirmation.dates.today', 'Today');
                  if (isYesterday) return t('unifiedConfirmation.dates.yesterday', 'Yesterday');
                  return recordedDate.toLocaleDateString();
                })()}
              </Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={14} color="#666" />
            </TouchableOpacity>
            
            {/* Time Picker Chip */}
            <TouchableOpacity 
              style={[styles.contextChip, showTimePicker && { backgroundColor: '#E3F2FD' }]}
              onPress={() => {
                setShowTimePicker(!showTimePicker);
                setShowDatePicker(false);
              }}
            >
              <Ionicons name="time-outline" size={16} color={showTimePicker ? '#1976D2' : '#666'} />
              <Text style={[styles.contextChipText, showTimePicker && { color: '#1976D2' }]}>
                {formData.recorded_at 
                  ? new Date(formData.recorded_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : t('unifiedConfirmation.time.now', 'Now')}
              </Text>
              <Ionicons name={showTimePicker ? "chevron-up" : "chevron-down"} size={14} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contextChip}
              onPress={() => setShowDetailedFields(true)}
            >
              <Ionicons name="create-outline" size={16} color="#666" />
              <Text style={styles.contextChipText}>{t('unifiedConfirmation.buttons.editDetails', 'Edit Details')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Inline Date Picker for Vital Signs */}
          {showDatePicker && (
            <View style={styles.inlineDatePicker}>
              {[
                { label: t('unifiedConfirmation.dates.today', 'Today'), days: 0 },
                { label: t('unifiedConfirmation.dates.yesterday', 'Yesterday'), days: 1 },
                { label: t('unifiedConfirmation.dates.daysAgoTwo', '2 days ago'), days: 2 },
              ].map(({ label, days }) => {
                const getDateForOption = () => {
                  const d = new Date();
                  d.setDate(d.getDate() - days);
                  return d;
                };
                const optionDate = getDateForOption();
                const currentDate = formData.recorded_at ? new Date(formData.recorded_at) : new Date();
                const isSelected = optionDate.toDateString() === currentDate.toDateString();
                
                return (
                  <TouchableOpacity 
                    key={label}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      // Keep the time, change the date
                      const newDate = new Date(formData.recorded_at || new Date());
                      newDate.setFullYear(optionDate.getFullYear());
                      newDate.setMonth(optionDate.getMonth());
                      newDate.setDate(optionDate.getDate());
                      updateField('recorded_at', newDate.toISOString());
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          {/* Inline Time Picker for Vital Signs */}
          {showTimePicker && (
            <View style={styles.inlineDatePicker}>
              {[
                { label: t('unifiedConfirmation.time.now', 'Now'), getTime: () => new Date() },
                { label: t('unifiedConfirmation.time.thirtyMinAgo', '30 min ago'), getTime: () => { const d = new Date(); d.setMinutes(d.getMinutes() - 30); return d; } },
                { label: t('unifiedConfirmation.time.oneHrAgo', '1 hr ago'), getTime: () => { const d = new Date(); d.setHours(d.getHours() - 1); return d; } },
                { label: t('unifiedConfirmation.time.twoHrsAgo', '2 hrs ago'), getTime: () => { const d = new Date(); d.setHours(d.getHours() - 2); return d; } },
              ].map((option) => (
                <TouchableOpacity 
                  key={option.label}
                  style={styles.dateOption}
                  onPress={() => {
                    const newTime = option.getTime();
                    // Keep the date from recorded_at, update time
                    const currentDate = new Date(formData.recorded_at || new Date());
                    currentDate.setHours(newTime.getHours());
                    currentDate.setMinutes(newTime.getMinutes());
                    currentDate.setSeconds(newTime.getSeconds());
                    updateField('recorded_at', currentDate.toISOString());
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.dateOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ⚡ Removed verbose Source Information card - not needed for streamlined UX */}

      {/* ⚡ Phase 1.2: Streamlined - Only show validation warnings if critical */}
      {extractedData._validation_warnings && extractedData._validation_warnings.length > 0 && (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle" size={16} color="#F57C00" />
          <Text style={styles.inlineWarningText}>
            {extractedData._validation_warnings[0]}
          </Text>
        </View>
      )}

      {/* Data summary: shows all populated fields for any category */}
      {(() => {
        const skipForNutrition = healthCategory === 'nutrition_log';
        if (skipForNutrition) return null;

        const vitalSignsVisualFields = new Set([
          'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
          'oxygen_saturation', 'weight', 'height', 'bmi', 'body_temperature',
          'respiratory_rate', 'pain_level', 'pain_location', 'recorded_at',
        ]);
        const isVitals = healthCategory === 'vital_signs';

        const coreNames = getCoreFieldNames();
        const allFieldNames = new Set([
          ...coreNames,
          ...Object.keys(formData).filter(k => !HIDDEN_SYSTEM_FIELDS.has(k)),
        ]);

        const populatedFields = Array.from(allFieldNames)
          .map(name => {
            const val = formData[name];
            if (val === undefined || val === null || val === '') return null;
            if (isVitals && vitalSignsVisualFields.has(name)) return null;
            const field = formConfig.fields.find(f => f.name === name);
            return { name, label: field?.label || formatFieldName(name), value: val };
          })
          .filter(Boolean) as { name: string; label: string; value: any }[];

        if (populatedFields.length === 0) return null;

        return (
          <Card style={styles.card}>
            <Card.Content>
              {populatedFields.map(({ name, label, value }) => (
                <View key={name} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryValue}>
                    {typeof value === 'boolean' ? (value ? t('common.yes', 'Yes') : t('common.no', 'No')) : String(value)}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        );
      })()}

      {/* ⚡ Phase 1.2: Collapsible Details Section */}
      <TouchableOpacity 
        style={styles.detailsToggle}
        onPress={() => setShowDetailedFields(!showDetailedFields)}
      >
        <View style={styles.detailsToggleLeft}>
          <Ionicons 
            name={showDetailedFields ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
          <Text style={styles.detailsToggleText}>
            {showDetailedFields
              ? t('unifiedConfirmation.details.hideDetails', 'Hide details')
              : (() => {
                  const all = formConfig?.fields ?? [];
                  const compactN = getVisibleFields(all, false).length;
                  const totalN = getVisibleFields(all, true).length;
                  return getDetailsToggleCollapsedLabel({
                    isSupplement: isSupplementRow,
                    compactFieldCount: compactN,
                    totalFieldCount: totalN,
                    formData: formData as Record<string, unknown>,
                  });
                })()}
          </Text>
        </View>
        <Text style={styles.detailsToggleCount}>
          {t('unifiedConfirmation.details.fieldsCount', `{{count}} fields`, { count: Object.keys(formData).filter(key => hasPopulatedValue(formData[key])).length })}
        </Text>
      </TouchableOpacity>

      {renderStandardDrinkPill()}

      {/* Expanded form fields - only show when toggled */}
      {showDetailedFields && (() => {
        const allFields = getVisibleFields(formConfig.fields, true);
        const coreNames = new Set(getCoreFieldNames());

        // For nutrition_log, organize extra fields into labeled sections
        const nutritionSections: { key: string; label: string; fields: string[] }[] = healthCategory === 'nutrition_log' ? [
          { key: 'fats', label: t('unifiedConfirmation.sections.fats', 'Fats & Lipids'), fields: ['saturated_fat_g', 'monounsaturated_fat_g', 'polyunsaturated_fat_g', 'trans_fat_g', 'omega_3_g', 'omega_6_g', 'cholesterol_mg'] },
          { key: 'sugars', label: t('unifiedConfirmation.sections.sugars', 'Sugars & Carb Details'), fields: ['sugar_added_g', 'sugar_alcohols_g', 'starch_g', 'alcohol_g'] },
          // Phase 5 (2026-05-17 §13.3.B): biotin_mcg + inositol_mg added
          // to nutrition_log; surface them under "Vitamins" so Choline &
          // Inositol bottles render their second nutrient.
          { key: 'vitamins', label: t('unifiedConfirmation.sections.vitamins', 'Vitamins'), fields: ['vitamin_a_rae_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg', 'vitamin_k_mcg', 'thiamin_b1_mg', 'riboflavin_b2_mg', 'niacin_b3_mg', 'pantothenic_acid_b5_mg', 'vitamin_b6_mg', 'folate_total_mcg', 'folic_acid_mcg', 'food_folate_mcg', 'folate_dfe_mcg', 'vitamin_b12_mcg', 'biotin_mcg', 'choline_mg', 'inositol_mg'] },
          { key: 'minerals', label: t('unifiedConfirmation.sections.minerals', 'Minerals'), fields: ['calcium_mg', 'iron_mg', 'magnesium_mg', 'phosphorus_mg', 'potassium_mg', 'zinc_mg', 'copper_mg', 'manganese_mg', 'selenium_mcg', 'iodine_mcg'] },
          { key: 'aminos', label: t('unifiedConfirmation.sections.aminos', 'Amino Acids'), fields: ['tryptophan_mg', 'threonine_mg', 'isoleucine_mg', 'leucine_mg', 'lysine_mg', 'methionine_mg', 'cystine_mg', 'phenylalanine_mg', 'tyrosine_mg', 'valine_mg', 'histidine_mg'] },
          { key: 'other', label: t('unifiedConfirmation.sections.other', 'Other'), fields: ['caffeine_mg', 'water_g', 'brand_name', 'servings', 'meal_time', 'notes'] },
        ] : [];

        // Fields that belong to a named section
        const sectionFieldNames = new Set(nutritionSections.flatMap(s => s.fields));
        // Core fields that are always shown at the top
        const coreFields = allFields.filter(f => coreNames.has(f.name));
        // Any remaining fields not in core or a named section
        const uncategorized = allFields.filter(f => !coreNames.has(f.name) && !sectionFieldNames.has(f.name));

        const toggleSection = (key: string) => {
          setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
        };

        return (
          <Card style={styles.formCard}>
            <Card.Content>
              <Text style={styles.formTitle}>{formConfig.title}</Text>
              <Text style={styles.formSubtitle}>
                {t('unifiedConfirmation.details.formSubtitle', `{{total}} fields • {{required}} required`, { total: allFields.length, required: allFields.filter(f => f.required).length })}
              </Text>

              <Divider style={styles.divider} />

              {renderStandardDrinkPill()}

              {/* Core fields always visible */}
              {coreFields.map(field => renderField(field))}

              {/* Collapsible sections for nutrition_log */}
              {nutritionSections.map(section => {
                const sectionFields = allFields.filter(f => section.fields.includes(f.name));
                if (sectionFields.length === 0) return null;
                const isOpen = expandedSections[section.key] ?? false;
                const filledCount = sectionFields.filter(f => {
                  const v = formData[f.name];
                  return v !== undefined && v !== '' && v !== null && v !== '0' && v !== 0;
                }).length;

                return (
                  <View key={section.key}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 4 }}
                      onPress={() => toggleSection(section.key)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', marginLeft: 6 }}>
                          {section.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#888' }}>
                        {t('unifiedConfirmation.details.filledCount', `{{filled}}/{{total}} filled`, { filled: filledCount, total: sectionFields.length })}
                      </Text>
                    </TouchableOpacity>
                    {isOpen && sectionFields.map(field => renderField(field))}
                    <Divider style={{ marginVertical: 2 }} />
                  </View>
                );
              })}

              {/* Uncategorized extras */}
              {uncategorized.length > 0 && uncategorized.map(field => renderField(field))}
            </Card.Content>
          </Card>
        );
      })()}

      {/* Loading indicator */}
      {isProcessing && (
        <Card style={styles.loadingCard}>
          <Card.Content style={styles.loadingContent}>
            <ActivityIndicator size="large" color={paperTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: paperTheme.colors.onSurface }]}>
              {t('unifiedConfirmation.states.savingHealthData', 'Saving your health data...')}
            </Text>
            <ProgressBar 
              indeterminate 
              color={paperTheme.colors.primary} 
              style={styles.progressBar}
            />
          </Card.Content>
        </Card>
      )}

      {/* ⚡ Phase 1.2: Streamlined action buttons */}
      <View style={styles.streamlinedButtonContainer}>
        <TouchableOpacity 
          style={styles.cancelIconButton}
          onPress={onCancel}
          disabled={isProcessing}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>

        <View style={styles.primarySaveButtonWrap}>
          {healthCategory === 'nutrition_log' && caloriesTotalPending && (
            <View style={styles.savePendingRow}>
              <ActivityIndicator size="small" color="#1565C0" />
              <Text style={styles.calorieTotalPendingText}>
                {t('unifiedConfirmation.states.updatingNutritionTotal', 'Updating nutrition total…')}
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.primarySaveButton}
            disabled={isProcessing || saveBlockedOnCalorieRepair}
            loading={isProcessing}
            contentStyle={styles.primarySaveButtonContent}
            labelStyle={styles.primarySaveButtonLabel}
          >
          {/* Phase 11.2 (2026-05-01): phase-aware label so the multi-
              second wait feels purposeful. `savePhase` reflects the
              in-component pipeline; once we hand off to the screen
              wrapper (`externalIsProcessing`) we just show "Saving...". */}
          {!isProcessing
            ? t('unifiedConfirmation.buttons.saveEntry', 'Save Entry')
            : savePhase === 'grounding'
              ? t('unifiedConfirmation.savePhases.lookingUpNutrients', 'Looking up nutrients…')
              : savePhase === 'enriching'
                ? t('unifiedConfirmation.savePhases.fillingInDetails', 'Filling in details…')
                : t('unifiedConfirmation.savePhases.saving', 'Saving…')}
          </Button>
        </View>
        
        {onRetry && (
          <TouchableOpacity 
            style={styles.retryIconButton}
            onPress={onRetry}
            disabled={isProcessing}
          >
            <Ionicons name="refresh" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>
      
      {/* Phase 9.17: Add ingredient = Recents / Favorites / My Meals / USDA Search (embedded Quick Add). */}
      <Modal
        visible={showAddComponentModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddComponentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.nutritionOptionsModalOverlay}
        >
          <View
            style={[
              styles.nutritionOptionsModalContent,
              {
                maxHeight: '88%',
                minHeight: Math.min(Math.round(windowHeight * 0.72), 560),
                width: '100%',
                paddingHorizontal: 0,
                paddingTop: 8,
              },
            ]}
          >
            <QuickAddMealLibrary
              variant="embedded_add_ingredient"
              onSelectMeal={({ log }) => {
                appendQuickAddLogAsChips(log);
                setShowAddComponentModal(false);
              }}
              onCancel={() => setShowAddComponentModal(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ⚡ Nutrition Options Selection Modal */}
      <Modal
        visible={showNutritionOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowNutritionOptionsModal(false);
          setNutritionOptions([]);
        }}
      >
        <View style={styles.nutritionOptionsModalOverlay}>
          <View style={styles.nutritionOptionsModalContent}>
            <View style={styles.nutritionOptionsModalHeader}>
              <Text style={styles.nutritionOptionsModalTitle}>
                {t('unifiedConfirmation.modals.selectIngredientTitle', `Select "{{name}}"`, { name: pendingIngredientName })}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowNutritionOptionsModal(false);
                  setNutritionOptions([]);
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.nutritionOptionsList}>
              {nutritionOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.nutritionOptionItem}
                  onPress={() => handleSelectNutritionOption(option)}
                >
                  <View style={styles.nutritionOptionMain}>
                    <Text style={styles.nutritionOptionName} numberOfLines={2}>
                      {option.food_name}
                      {option.brand && <Text style={styles.nutritionOptionBrand}> ({option.brand})</Text>}
                    </Text>
                    <View style={styles.nutritionOptionMetaRow}>
                      <View style={styles.nutritionOptionBadge}>
                        <Text style={styles.nutritionOptionBadgeText}>
                          {searchResultLabel(option)}
                        </Text>
                      </View>
                      <Text style={styles.nutritionOptionServing}>
                        {option.serving_size} {option.serving_unit}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nutritionOptionMacros}>
                    <Text style={styles.nutritionOptionCalories}>
                      {option.nutrition_per_serving.calories || 0} cal
                    </Text>
                    <Text style={styles.nutritionOptionMacroDetails}>
                      P: {option.nutrition_per_serving.protein_g?.toFixed(1) || 0}g • 
                      C: {option.nutrition_per_serving.carbs_g?.toFixed(1) || 0}g • 
                      F: {option.nutrition_per_serving.fat_g?.toFixed(1) || 0}g
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.nutritionOptionsAddWithoutBtn}
              onPress={() => {
                // Add without nutrition
                setFoodComponents(prev => [...prev, {
                  id: `user-added-${Date.now()}`,
                  name: pendingIngredientName,
                  quantity: 1,
                  unit: 'serving',
                  detected: false,
                }]);
                setShowNutritionOptionsModal(false);
                setNutritionOptions([]);
              }}
            >
              <Text style={styles.nutritionOptionsAddWithoutText}>
                {t('unifiedConfirmation.buttons.addWithoutData', `Add "{{name}}" without nutrition data`, { name: pendingIngredientName })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Phase 9.4 (2026-04-27): match-picker modal. Renders top-K USDA
          alternatives for the chip the user tapped (or that auto-popped
          due to low confidence). Selection re-resolves via the grounding
          service with `forcedFdcId`. */}
      {(() => {
        const targetComponent = pickerComponentId
          ? foodComponents.find(c => c.id === pickerComponentId)
          : null;
        return (
          <IngredientPickerModal
            visible={!!targetComponent}
            onClose={() => {
              clearPendingIdentityGateSave(pendingSaveAfterIdentityConfirmRef);
              setPickerComponentId(null);
            }}
            componentName={targetComponent?.name ?? ''}
            currentFdcId={targetComponent?.fdc_id}
            alternatives={(targetComponent?.alternatives ?? []) as IngredientPickerAlternative[]}
            onSelectAlternative={(alt) => {
              if (!targetComponent) return;
              void (async () => {
                await handlePickerSelectAlternative(targetComponent.id, alt);
                resumeSaveAfterIdentityGatePickerIfPending();
              })();
            }}
            onSelectSearchResult={(opt) => {
              if (!targetComponent) return;
              void (async () => {
                await handlePickerSelectSearchResult(targetComponent.id, opt);
                resumeSaveAfterIdentityGatePickerIfPending();
              })();
            }}
            onConfirmCurrent={
              targetComponent
                ? () => {
                    setFoodComponents(prev => {
                      const next = prev.map(c =>
                        c.id === targetComponent.id
                          ? {
                              ...c,
                              was_user_corrected: true,
                              user_match_confirmed: true,
                              needs_user_review: false,
                              order_ambiguous: false,
                              identity_verdict: 'accept' as const,
                            }
                          : c,
                      );
                      foodComponentsRef.current = next;
                      return next;
                    });
                    setPickerComponentId(null);
                    resumeSaveAfterIdentityGatePickerIfPending();
                  }
                : undefined
            }
            reason={pickerReason ?? undefined}
            currentCaloriesPer100g={(() => {
              // Phase 9.7 (2026-04-27): derive the current pick's
              // kcal/100g from its scaled macros + gramWeight so the
              // picker can render the low-density mismatch warning.
              // Falls back to undefined when either piece is missing —
              // the warning path silently no-ops in that case.
              const c = targetComponent?.calories;
              const g = targetComponent?.gramWeight;
              if (typeof c !== 'number' || !Number.isFinite(c)) return undefined;
              if (typeof g !== 'number' || !Number.isFinite(g) || g <= 0) return undefined;
              return Math.round((c / g) * 100);
            })()}
          />
        );
      })()}
      <ClarifyQuestionSheet
        visible={gateClarifyVisible}
        question={gateClarifyPayload?.question ?? ''}
        options={gateClarifyPayload?.options ?? []}
        onSelect={(option) => { void handleGateClarifySelect(option); }}
        onDismiss={() => {
          setGateClarifyVisible(false);
          setGateClarifyPayload(null);
          releaseSaveInFlight();
        }}
      />
      {swappingComponentId ? (
        <View style={{
          position: 'absolute', bottom: 24, left: 24, right: 24,
          backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, borderRadius: 12,
        }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>
            {t('unifiedConfirmation.states.updatingNutritionMatch', 'Updating nutrition for the new match…')}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};