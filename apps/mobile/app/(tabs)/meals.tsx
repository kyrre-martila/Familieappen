import { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { tokens } from "@familieappen/ui";

type MealDay = {
  id: string;
  weekday: string;
  dateLabel: string;
  section?: string;
  meal?: string;
};

type EditingMeal = {
  dayId: string;
};

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const suggestedMeals = [
  "Taco",
  "Pizza",
  "Fiskegrateng",
  "Pasta med kylling",
  "Lasagne",
  "Fiskekaker",
  "Kjøttsuppe",
  "Hjemmelaget burger"
];

const initialMealPlan: MealDay[] = [
  { id: "tue-3", weekday: "Tirsdag", dateLabel: "3. juni", section: "I dag", meal: "Taco" },
  { id: "wed-4", weekday: "Onsdag", dateLabel: "4. juni" },
  { id: "thu-5", weekday: "Torsdag", dateLabel: "5. juni", meal: "Fiskegrateng" },
  { id: "fri-6", weekday: "Fredag", dateLabel: "6. juni", meal: "Pizza" },
  { id: "sat-7", weekday: "Lørdag", dateLabel: "7. juni" },
  { id: "sun-8", weekday: "Søndag", dateLabel: "8. juni" },
  { id: "mon-9", weekday: "Mandag", dateLabel: "9. juni", meal: "Pasta med kylling" },
  { id: "tue-10", weekday: "Tirsdag", dateLabel: "10. juni", section: "Neste uke" },
  { id: "wed-11", weekday: "Onsdag", dateLabel: "11. juni" }
];

const mealVisuals: Record<string, string> = {
  taco: "🌮",
  pizza: "🍕",
  fiskegrateng: "🥘",
  "pasta med kylling": "🍝",
  lasagne: "🍲",
  fiskekaker: "🐟",
  kjøttsuppe: "🥣",
  "hjemmelaget burger": "🍔"
};

function getMealVisual(meal: string) {
  return mealVisuals[meal.toLowerCase()] ?? "🍽️";
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

  const visibleSuggestions = useMemo(() => {
    const normalizedQuery = inputValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return suggestedMeals.slice(0, 4);
    }

    return suggestedMeals
      .filter((meal) => meal.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
  }, [inputValue]);

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
      days.map((day) => (day.id === editingMeal.dayId ? { ...day, meal: trimmedMeal } : day))
    );
    closeEditor();
    showToast({ message: "Middag lagret" });
  };

  const handleOutsidePress = () => {
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
    setMealPlan((days) => days.map((day) => (day.id === dayId ? { ...day, meal: undefined } : day)));
    showToast({
      message: "Middag slettet",
      actionLabel: "Angre",
      onAction: () => {
        setMealPlan((days) =>
          days.map((day) => (day.id === dayId ? { ...day, meal: deletedMeal } : day))
        );
        setToast(null);
      }
    });
  };

  const selectedDay = selectedDayId ? mealPlan.find((day) => day.id === selectedDayId) : undefined;

  return (
    <Pressable style={styles.page} onPress={handleOutsidePress}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandIcon}>♧</Text>
          </View>
          <Text style={styles.brandName}>FamilieAppen</Text>
        </View>

        <Text style={styles.title}>Måltidsplan</Text>
        <Text style={styles.subtitle}>Planlegg middager for familien</Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>🔔</Text>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Snart tomt for middager</Text>
            <Text style={styles.noticeText}>Du har planlagt frem til mandag 9. juni.</Text>
            <Text style={styles.noticeText}>Planlegg neste uke i god tid.</Text>
          </View>
          <Text style={styles.noticeChevron}>›</Text>
        </View>

        <View style={styles.timeline}>
          {mealPlan.map((day) => (
            <View key={day.id}>
              {day.section ? <Text style={styles.sectionLabel}>{day.section}</Text> : null}
              <View style={styles.dayRow}>
                <View style={styles.dateColumn}>
                  <View style={[styles.timelineDot, day.section === "I dag" && styles.activeTimelineDot]} />
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
                    <MealCard meal={day.meal} onMenuPress={() => setSelectedDayId(day.id)} />
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

      <Modal visible={Boolean(selectedDay)} transparent animationType="slide" onRequestClose={() => setSelectedDayId(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedDayId(null)}>
          <Pressable style={styles.bottomSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Pressable
              style={styles.sheetAction}
              onPress={() => selectedDay?.meal && openEdit(selectedDay.id, selectedDay.meal)}
            >
              <Text style={styles.sheetIcon}>✎</Text>
              <Text style={styles.sheetActionText}>Rediger</Text>
            </Pressable>
            <Pressable style={styles.sheetAction} onPress={() => selectedDay && deleteMeal(selectedDay.id)}>
              <Text style={styles.deleteIcon}>⌫</Text>
              <Text style={styles.deleteActionText}>Slett middag</Text>
            </Pressable>
            <Pressable style={styles.cancelAction} onPress={() => setSelectedDayId(null)}>
              <Text style={styles.cancelActionText}>Avbryt</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

function MealCard({ meal, onMenuPress }: { meal: string; onMenuPress: () => void }) {
  return (
    <View style={styles.mealCard}>
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
  onSelectSuggestion
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
              <Text style={styles.suggestionVisualText}>{getMealVisual(meal)}</Text>
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
    backgroundColor: "#fbfaf8"
  },
  scrollContent: {
    padding: tokens.layout.gutter,
    paddingBottom: 112
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    marginBottom: tokens.spacing.m
  },
  brandMark: {
    alignItems: "center",
    borderColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  brandIcon: {
    color: tokens.colors.primary,
    fontSize: 18
  },
  brandName: {
    color: tokens.colors.primary,
    fontSize: tokens.textSizes.body,
    fontWeight: "800"
  },
  title: {
    color: "#178044",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  subtitle: {
    color: tokens.colors.muted,
    fontSize: tokens.textSizes.body,
    marginTop: tokens.spacing.s
  },
  noticeCard: {
    alignItems: "center",
    backgroundColor: "#f3f5f2",
    borderRadius: tokens.radius.m,
    flexDirection: "row",
    gap: tokens.spacing.m,
    marginBottom: tokens.spacing.l,
    marginTop: tokens.spacing.l,
    padding: tokens.spacing.l
  },
  noticeIcon: {
    color: "#178044",
    fontSize: 25
  },
  noticeCopy: {
    flex: 1,
    gap: 3
  },
  noticeTitle: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.body,
    fontWeight: "800"
  },
  noticeText: {
    color: "#30343b",
    fontSize: tokens.textSizes.label,
    lineHeight: 18
  },
  noticeChevron: {
    color: tokens.colors.muted,
    fontSize: 30
  },
  timeline: {
    gap: tokens.spacing.s
  },
  sectionLabel: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
    marginBottom: tokens.spacing.s
  },
  dayRow: {
    flexDirection: "row",
    minHeight: 76
  },
  dateColumn: {
    paddingLeft: 10,
    paddingRight: tokens.spacing.m,
    position: "relative",
    width: 116
  },
  timelineDot: {
    backgroundColor: "#d9dde0",
    borderRadius: tokens.radius.pill,
    height: 9,
    left: 0,
    position: "absolute",
    top: 20,
    width: 9,
    zIndex: 1
  },
  activeTimelineDot: {
    backgroundColor: "#178044"
  },
  timelineLine: {
    backgroundColor: "#e4e6e8",
    bottom: -8,
    left: 4,
    position: "absolute",
    top: 28,
    width: 1
  },
  weekday: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.label,
    fontWeight: "800",
    marginTop: 14
  },
  dateLabel: {
    color: "#30343b",
    fontSize: tokens.textSizes.label,
    marginTop: 4
  },
  cardColumn: {
    flex: 1,
    paddingBottom: tokens.spacing.s
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
    shadowRadius: 12
  },
  mealVisual: {
    alignItems: "center",
    backgroundColor: tokens.colors.surfaceWarm,
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    width: 58
  },
  mealVisualText: {
    fontSize: 31
  },
  mealTitle: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.body,
    fontWeight: "800"
  },
  menuDots: {
    color: "#20232a",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
    padding: tokens.spacing.s
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
    padding: tokens.spacing.m
  },
  emptyPlus: {
    color: "#178044",
    fontSize: 32,
    lineHeight: 32
  },
  emptyText: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800"
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
    shadowRadius: 14
  },
  inputRow: {
    alignItems: "center",
    borderColor: "#2f8a62",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    margin: tokens.spacing.s,
    paddingHorizontal: tokens.spacing.s
  },
  input: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.body,
    minHeight: 42,
    paddingVertical: tokens.spacing.s
  },
  clearInput: {
    color: "#31363f",
    fontSize: 25,
    paddingHorizontal: tokens.spacing.s
  },
  suggestionList: {
    paddingTop: tokens.spacing.xs
  },
  suggestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.m,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s
  },
  suggestionVisual: {
    alignItems: "center",
    backgroundColor: tokens.colors.surfaceWarm,
    borderRadius: 7,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  suggestionVisualText: {
    fontSize: 18
  },
  suggestionText: {
    color: tokens.colors.text,
    flex: 1,
    fontSize: tokens.textSizes.label,
    fontWeight: "700"
  },
  allMealsLink: {
    alignItems: "center",
    borderColor: "#eef0ec",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: tokens.spacing.xs,
    padding: tokens.spacing.m
  },
  allMealsText: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.label,
    fontWeight: "700"
  },
  allMealsChevron: {
    color: tokens.colors.text,
    fontSize: 24,
    marginLeft: tokens.spacing.m
  },
  sheetBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    flex: 1,
    justifyContent: "flex-end"
  },
  bottomSheet: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: tokens.spacing.s,
    padding: tokens.spacing.m,
    paddingBottom: tokens.spacing.xl
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#bfc3c4",
    borderRadius: tokens.radius.pill,
    height: 4,
    marginBottom: tokens.spacing.s,
    width: 48
  },
  sheetAction: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    padding: tokens.spacing.m
  },
  sheetIcon: {
    color: "#30343b",
    fontSize: 20
  },
  sheetActionText: {
    color: "#30343b",
    fontSize: tokens.textSizes.body,
    fontWeight: "600"
  },
  deleteIcon: {
    color: "#c23934",
    fontSize: 20
  },
  deleteActionText: {
    color: "#c23934",
    fontSize: tokens.textSizes.body,
    fontWeight: "700"
  },
  cancelAction: {
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderColor: "#eef0ec",
    borderRadius: 12,
    borderWidth: 1,
    padding: tokens.spacing.m
  },
  cancelActionText: {
    color: "#30343b",
    fontSize: tokens.textSizes.body,
    fontWeight: "600"
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
    shadowRadius: 16
  },
  toastText: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "800"
  },
  toastAction: {
    color: "#178044",
    fontSize: tokens.textSizes.label,
    fontWeight: "900"
  }
});
