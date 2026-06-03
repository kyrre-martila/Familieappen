import { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { tokens } from "@familieappen/ui";

type MealDay = {
  id: string;
  weekday: string;
  dateLabel: string;
  section?: string;
  meal?: string;
  isPast?: boolean;
};

type EditingMeal = {
  dayId: string;
};

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const previousMeals = [
  "Taco",
  "Pizza",
  "Fiskegrateng",
  "Pasta med kylling",
  "Lasagne",
  "Fiskekaker",
  "Kjøttsuppe",
  "Hjemmelaget burger",
];

const fallbackMeals = ["Lasagne", "Kjøttsuppe", "Hjemmelaget burger"];

const suggestedMeals = [...previousMeals, ...fallbackMeals];

const initialMealPlan: MealDay[] = [
  {
    id: "mon-2",
    weekday: "Mandag",
    dateLabel: "2. juni",
    meal: "Lasagne",
    isPast: true,
  },
  {
    id: "tue-3",
    weekday: "Tirsdag",
    dateLabel: "3. juni",
    section: "I dag",
    meal: "Taco",
  },
  { id: "wed-4", weekday: "Onsdag", dateLabel: "4. juni" },
  {
    id: "thu-5",
    weekday: "Torsdag",
    dateLabel: "5. juni",
    meal: "Fiskegrateng",
  },
  { id: "fri-6", weekday: "Fredag", dateLabel: "6. juni", meal: "Pizza" },
  { id: "sat-7", weekday: "Lørdag", dateLabel: "7. juni" },
  { id: "sun-8", weekday: "Søndag", dateLabel: "8. juni" },
  {
    id: "mon-9",
    weekday: "Mandag",
    dateLabel: "9. juni",
    meal: "Pasta med kylling",
  },
  {
    id: "tue-10",
    weekday: "Tirsdag",
    dateLabel: "10. juni",
    section: "Neste uke",
  },
  { id: "wed-11", weekday: "Onsdag", dateLabel: "11. juni" },
];

const mealVisuals: Record<string, string> = {
  taco: "🌮",
  pizza: "🍕",
  fiskegrateng: "🥘",
  "pasta med kylling": "🍝",
  lasagne: "🍲",
  fiskekaker: "🐟",
  kjøttsuppe: "🥣",
  "hjemmelaget burger": "🍔",
};

function getMealVisual(meal: string) {
  return mealVisuals[meal.toLowerCase()] ?? "🍽️";
}

function normalizeMeal(meal: string) {
  return meal.trim().toLocaleLowerCase("nb-NO");
}

function getSuggestionMatches(query: string) {
  const normalizedQuery = normalizeMeal(query);
  const uniqueSuggestions = suggestedMeals.filter(
    (meal, index, meals) =>
      meals.findIndex(
        (candidate) => normalizeMeal(candidate) === normalizeMeal(meal),
      ) === index,
  );

  if (!normalizedQuery) {
    return uniqueSuggestions.slice(0, 5);
  }

  return uniqueSuggestions
    .filter((meal) => {
      const normalizedMeal = normalizeMeal(meal);
      return (
        normalizedMeal.startsWith(normalizedQuery) ||
        normalizedMeal.includes(normalizedQuery)
      );
    })
    .slice(0, 5);
}

function stopPress(event: GestureResponderEvent) {
  event.stopPropagation();
}

export default function MealsScreen() {
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [editingMeal, setEditingMeal] = useState<EditingMeal | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleSuggestions = useMemo(
    () => getSuggestionMatches(inputValue),
    [inputValue],
  );
  const firstTodayOrFutureIndex = mealPlan.findIndex((day) => !day.isPast);
  const futureMealDays = mealPlan
    .slice(Math.max(firstTodayOrFutureIndex, 0))
    .filter((day) => Boolean(day.meal));
  const shouldShowReminder =
    futureMealDays.length > 0 && futureMealDays.length <= 2;
  const reminderEndDay = futureMealDays[futureMealDays.length - 1];
  const hasFutureMeals = futureMealDays.length > 0;

  const showToast = (nextToast: ToastState) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast(nextToast);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3200);
  };

  const openCreate = (dayId: string) => {
    setSelectedDayId(null);
    setEditingMeal({ dayId });
    setInputValue("");
  };

  const openEdit = (dayId: string, meal: string) => {
    setSelectedDayId(null);
    setEditingMeal({ dayId });
    setInputValue(meal);
  };

  const closeEditor = () => {
    setEditingMeal(null);
    setInputValue("");
    Keyboard.dismiss();
  };

  const saveMeal = (meal: string) => {
    if (!editingMeal) {
      return;
    }

    const trimmedMeal = meal.trim();

    if (!trimmedMeal) {
      closeEditor();
      return;
    }

    setMealPlan((days) =>
      days.map((day) =>
        day.id === editingMeal.dayId ? { ...day, meal: trimmedMeal } : day,
      ),
    );
    closeEditor();
    showToast({ message: "Middag lagret" });
  };

  const handleOutsidePress = () => {
    Keyboard.dismiss();
    if (!editingMeal) {
      return;
    }

    if (inputValue.trim()) {
      saveMeal(inputValue);
    } else {
      closeEditor();
    }
  };

  const deleteMeal = (dayId: string) => {
    const deletedDay = mealPlan.find((day) => day.id === dayId);

    if (!deletedDay?.meal) {
      return;
    }

    const deletedMeal = deletedDay.meal;
    setSelectedDayId(null);
    setMealPlan((days) =>
      days.map((day) => (day.id === dayId ? { ...day, meal: undefined } : day)),
    );
    showToast({
      message: "Middag slettet",
      actionLabel: "Angre",
      onAction: () => {
        setMealPlan((days) =>
          days.map((day) =>
            day.id === dayId ? { ...day, meal: deletedMeal } : day,
          ),
        );
        setToast(null);
      },
    });
  };

  const selectedDay = selectedDayId
    ? mealPlan.find((day) => day.id === selectedDayId)
    : undefined;

  const openFirstFutureMeal = () => {
    const emptyDay = mealPlan.find((day) => !day.isPast && !day.meal);
    openCreate(
      emptyDay?.id ??
        mealPlan[Math.max(firstTodayOrFutureIndex, 0)]?.id ??
        mealPlan[0].id,
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable style={styles.page} onPress={handleOutsidePress}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.headerRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandIcon}>♧</Text>
            </View>
            <Text style={styles.brandName}>FamilieAppen</Text>
          </View>

          <Text style={styles.title}>Måltidsplan</Text>
          <Text style={styles.subtitle}>Planlegg middager for familien</Text>

          {shouldShowReminder && reminderEndDay ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeIcon}>🍽️</Text>
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>
                  Snart tomt for middager 🍽️
                </Text>
                <Text style={styles.noticeText}>
                  Du har planlagt frem til{" "}
                  {reminderEndDay.weekday.toLocaleLowerCase("nb-NO")}.
                </Text>
              </View>
            </View>
          ) : null}

          {!hasFutureMeals ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🍽️</Text>
              <View style={styles.emptyStateCopy}>
                <Text style={styles.emptyStateTitle}>
                  Ingen middager planlagt
                </Text>
                <Text style={styles.emptyStateText}>
                  Legg inn noen middager for å gjøre hverdagen enklere.
                </Text>
              </View>
              <Pressable
                style={styles.emptyStateButton}
                onPress={openFirstFutureMeal}
              >
                <Text style={styles.emptyStateButtonText}>
                  + Legg til første middag
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.timeline}>
            {mealPlan.map((day) => (
              <View key={day.id}>
                {day.section ? (
                  <Text style={styles.sectionLabel}>{day.section}</Text>
                ) : null}
                <View style={[styles.dayRow, day.isPast && styles.pastDayRow]}>
                  <View style={styles.dateColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        day.section === "I dag" && styles.activeTimelineDot,
                      ]}
                    />
                    <View style={styles.timelineLine} />
                    <Text style={styles.weekday}>{day.weekday}</Text>
                    <Text style={styles.dateLabel}>{day.dateLabel}</Text>
                  </View>

                  <View style={styles.cardColumn}>
                    {editingMeal?.dayId === day.id ? (
                      <InlineMealEditor
                        value={inputValue}
                        suggestions={visibleSuggestions}
                        onChangeText={setInputValue}
                        onSubmit={() => saveMeal(inputValue)}
                        onSelectSuggestion={(meal) => saveMeal(meal)}
                      />
                    ) : day.meal ? (
                      <MealCard
                        meal={day.meal}
                        isPast={Boolean(day.isPast)}
                        onMenuPress={() => setSelectedDayId(day.id)}
                      />
                    ) : (
                      <EmptyMealCard onPress={() => openCreate(day.id)} />
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {toast ? <Toast toast={toast} /> : null}

        <Modal
          visible={Boolean(selectedDay)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDayId(null)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSelectedDayId(null)}
          >
            <Pressable style={styles.bottomSheet} onPress={() => undefined}>
              <View style={styles.sheetHandle} />
              <Pressable
                style={styles.sheetAction}
                onPress={() =>
                  selectedDay?.meal &&
                  openEdit(selectedDay.id, selectedDay.meal)
                }
              >
                <Text style={styles.sheetIcon}>✎</Text>
                <Text style={styles.sheetActionText}>Rediger</Text>
              </Pressable>
              <Pressable
                style={styles.sheetAction}
                onPress={() => selectedDay && deleteMeal(selectedDay.id)}
              >
                <Text style={styles.deleteIcon}>⌫</Text>
                <Text style={styles.deleteActionText}>Slett middag</Text>
              </Pressable>
              <Pressable
                style={styles.cancelAction}
                onPress={() => setSelectedDayId(null)}
              >
                <Text style={styles.cancelActionText}>Avbryt</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function MealCard({
  meal,
  isPast,
  onMenuPress,
}: {
  meal: string;
  isPast: boolean;
  onMenuPress: () => void;
}) {
  return (
    <View style={[styles.mealCard, isPast && styles.pastMealCard]}>
      <View style={styles.mealVisual}>
        <Text style={styles.mealVisualText}>{getMealVisual(meal)}</Text>
      </View>
      <Text style={styles.mealTitle}>{meal}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Åpne meny for ${meal}`}
        onPress={(event) => {
          stopPress(event);
          onMenuPress();
        }}
      >
        <Text style={styles.menuDots}>•••</Text>
      </Pressable>
    </View>
  );
}

function EmptyMealCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.emptyCard}
      onPress={(event) => {
        stopPress(event);
        onPress();
      }}
      accessibilityRole="button"
    >
      <Text style={styles.emptyPlus}>＋</Text>
      <Text style={styles.emptyText}>Legg til middag</Text>
    </Pressable>
  );
}

function InlineMealEditor({
  value,
  suggestions,
  onChangeText,
  onSubmit,
  onSelectSuggestion,
}: {
  value: string;
  suggestions: string[];
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onSelectSuggestion: (meal: string) => void;
}) {
  return (
    <View style={styles.editorCard}>
      <View style={styles.inputRow}>
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="done"
          placeholder="Skriv middag…"
          placeholderTextColor={tokens.colors.muted}
          style={styles.input}
        />
        {value ? (
          <Pressable
            onPress={(event) => {
              stopPress(event);
              onChangeText("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Tøm middag"
          >
            <Text style={styles.clearInput}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.suggestionList}>
        {suggestions.map((meal) => (
          <Pressable
            key={meal}
            style={styles.suggestionRow}
            onPress={(event) => {
              stopPress(event);
              onSelectSuggestion(meal);
            }}
          >
            <View style={styles.suggestionVisual}>
              <Text style={styles.suggestionVisualText}>
                {getMealVisual(meal)}
              </Text>
            </View>
            <Text style={styles.suggestionText}>{meal}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.allMealsLink} onPress={stopPress}>
          <Text style={styles.allMealsText}>Se alle tidligere middager</Text>
          <Text style={styles.allMealsChevron}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Toast({ toast }: { toast: ToastState }) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{toast.message}</Text>
      {toast.actionLabel ? (
        <Pressable
          onPress={(event) => {
            stopPress(event);
            toast.onAction?.();
          }}
        >
          <Text style={styles.toastAction}>{toast.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fbfaf8",
  },
  scrollContent: {
    padding: tokens.layout.gutter,
    paddingBottom: 112,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    marginBottom: tokens.spacing.m,
  },
  brandMark: {
    alignItems: "center",
    borderColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  brandIcon: {
    color: tokens.colors.primary,
    fontSize: 18,
  },
  brandName: {
    color: tokens.colors.primary,
    fontSize: tokens.textSizes.body,
    fontWeight: "800",
  },
  title: {
    color: "#178044",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: tokens.colors.muted,
    fontSize: tokens.textSizes.body,
    marginTop: tokens.spacing.s,
  },
  noticeCard: {
    alignItems: "center",
    backgroundColor: "#f3f5f2",
    borderRadius: tokens.radius.m,
    flexDirection: "row",
    gap: tokens.spacing.m,
    marginBottom: tokens.spacing.l,
    marginTop: tokens.spacing.l,
    padding: tokens.spacing.l,
  },
  noticeIcon: {
    color: "#178044",
    fontSize: 25,
  },
  noticeCopy: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.body,
    fontWeight: "800",
  },
  noticeText: {
    color: "#30343b",
    fontSize: tokens.textSizes.label,
    lineHeight: 18,
  },
  noticeChevron: {
    color: tokens.colors.muted,
    fontSize: 30,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#f6f7f4",
    borderColor: "#e8ece5",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    marginBottom: tokens.spacing.l,
    marginTop: tokens.spacing.l,
    padding: tokens.spacing.m,
  },
  emptyStateIcon: {
    fontSize: 24,
  },
  emptyStateCopy: {
    flex: 1,
    gap: 3,
  },
  emptyStateTitle: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.body,
    fontWeight: "800",
  },
  emptyStateText: {
    color: tokens.colors.muted,
    fontSize: tokens.textSizes.label,
    lineHeight: 18,
  },
  emptyStateButton: {
    backgroundColor: tokens.colors.surface,
    borderColor: "#dfe8df",
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  emptyStateButtonText: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
  },
  timeline: {
    gap: tokens.spacing.s,
  },
  sectionLabel: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
    marginBottom: tokens.spacing.s,
  },
  dayRow: {
    flexDirection: "row",
    minHeight: 76,
  },
  pastDayRow: {
    opacity: 0.7,
  },
  dateColumn: {
    paddingLeft: 10,
    paddingRight: tokens.spacing.m,
    position: "relative",
    width: 116,
  },
  timelineDot: {
    backgroundColor: "#d9dde0",
    borderRadius: tokens.radius.pill,
    height: 9,
    left: 0,
    position: "absolute",
    top: 20,
    width: 9,
    zIndex: 1,
  },
  activeTimelineDot: {
    backgroundColor: "#178044",
  },
  timelineLine: {
    backgroundColor: "#e4e6e8",
    bottom: -8,
    left: 4,
    position: "absolute",
    top: 28,
    width: 1,
  },
  weekday: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
    marginTop: 14,
  },
  dateLabel: {
    color: "#30343b",
    fontSize: tokens.textSizes.label,
    marginTop: 4,
  },
  cardColumn: {
    flex: 1,
    paddingBottom: tokens.spacing.s,
  },
  mealCard: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    minHeight: 66,
    padding: tokens.spacing.s,
    shadowColor: "#15211a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  pastMealCard: {
    backgroundColor: "#f8f7f4",
    shadowOpacity: 0.02,
  },
  mealVisual: {
    alignItems: "center",
    backgroundColor: "#f4f3ec",
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    width: 52,
  },
  mealVisualText: {
    fontSize: 26,
  },
  mealTitle: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.body,
    fontWeight: "800",
  },
  menuDots: {
    color: "#20232a",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
    padding: tokens.spacing.s,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    justifyContent: "center",
    minHeight: 64,
    padding: tokens.spacing.m,
  },
  emptyPlus: {
    color: "#178044",
    fontSize: 32,
    lineHeight: 32,
  },
  emptyText: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
  },
  editorCard: {
    backgroundColor: tokens.colors.surface,
    borderColor: "#e6ebe4",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#15211a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  inputRow: {
    alignItems: "center",
    borderColor: "#2f8a62",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    margin: tokens.spacing.s,
    paddingHorizontal: tokens.spacing.s,
  },
  input: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.body,
    minHeight: 42,
    paddingVertical: tokens.spacing.s,
  },
  clearInput: {
    color: "#31363f",
    fontSize: 25,
    paddingHorizontal: tokens.spacing.s,
  },
  suggestionList: {
    paddingTop: tokens.spacing.xs,
  },
  suggestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.m,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  suggestionVisual: {
    alignItems: "center",
    backgroundColor: tokens.colors.surfaceWarm,
    borderRadius: 7,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  suggestionVisualText: {
    fontSize: 18,
  },
  suggestionText: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.label,
    fontWeight: "700",
  },
  allMealsLink: {
    alignItems: "center",
    borderColor: "#eef0ec",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: tokens.spacing.xs,
    padding: tokens.spacing.m,
  },
  allMealsText: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.label,
    fontWeight: "700",
  },
  allMealsChevron: {
    color: tokens.colors.text,
    fontSize: 24,
    marginLeft: tokens.spacing.m,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: tokens.spacing.s,
    padding: tokens.spacing.m,
    paddingBottom: tokens.spacing.xl,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#bfc3c4",
    borderRadius: tokens.radius.pill,
    height: 4,
    marginBottom: tokens.spacing.s,
    width: 48,
  },
  sheetAction: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    padding: tokens.spacing.m,
  },
  sheetIcon: {
    color: "#30343b",
    fontSize: 20,
  },
  sheetActionText: {
    color: "#30343b",
    fontSize: tokens.textSizes.body,
    fontWeight: "600",
  },
  deleteIcon: {
    color: "#c23934",
    fontSize: 20,
  },
  deleteActionText: {
    color: "#c23934",
    fontSize: tokens.textSizes.body,
    fontWeight: "700",
  },
  cancelAction: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 12,
    borderWidth: 1,
    padding: tokens.spacing.m,
  },
  cancelActionText: {
    color: "#30343b",
    fontSize: tokens.textSizes.body,
    fontWeight: "600",
  },
  toast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#e2e8e4",
    borderRadius: 12,
    borderWidth: 1,
    bottom: 32,
    flexDirection: "row",
    gap: tokens.spacing.s,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: 12,
    position: "absolute",
    shadowColor: "#15211a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  toastText: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
  },
  toastAction: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "900",
  },
});
