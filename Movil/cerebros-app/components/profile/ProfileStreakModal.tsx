import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

type ProfileStreakModalProps = {
  visible: boolean;
  streak: number;
  onClose: () => void;
};

type CalendarDay = {
  day: number;
  hasActivity: boolean;
};

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const weekDayNames = ["L", "M", "X", "J", "V", "S", "D"] as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStreakDateKeys(streakDays: number) {
  const keys = new Set<string>();
  const safeStreak = Math.max(0, Math.floor(Number(streakDays) || 0));
  const today = new Date();

  for (let index = 0; index < safeStreak; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    keys.add(toDateKey(date));
  }

  return keys;
}

function buildCalendarDays(
  year: number,
  month: number,
  streakDateKeys: Set<string>,
) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (CalendarDay | null)[] = [];

  for (let offset = 0; offset < startOffset; offset += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    days.push({
      day,
      hasActivity: streakDateKeys.has(toDateKey(date)),
    });
  }

  return days;
}

export function ProfileStreakModal({
  visible,
  streak,
  onClose,
}: ProfileStreakModalProps) {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (visible) {
      setCurrentMonth(new Date().getMonth());
    }
  }, [visible]);

  const streakDateKeys = useMemo(() => getStreakDateKeys(streak), [streak]);
  const calendarDays = useMemo(
    () => buildCalendarDays(currentYear, currentMonth, streakDateKeys),
    [currentMonth, currentYear, streakDateKeys],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.dark
                ? "#363c47"
                : theme.colors.elevation.level4,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Racha de juego
            </Text>
            <IconButton
              icon="close"
              size={20}
              iconColor={theme.colors.onSurface}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <Text
            style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}
          >
            Dias resaltados = dias con actividad de racha en este año.
          </Text>

          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              disabled={currentMonth === 0}
              onPress={() => setCurrentMonth((value) => Math.max(0, value - 1))}
              style={[
                styles.arrowButton,
                {
                  borderColor: theme.colors.outline,
                  opacity: currentMonth === 0 ? 0.45 : 1,
                },
              ]}
            >
              <Text
                style={[styles.arrowText, { color: theme.colors.onSurface }]}
              >
                ◀
              </Text>
            </Pressable>

            <Text
              style={[styles.monthLabel, { color: theme.colors.onSurface }]}
            >
              {monthNames[currentMonth]} {currentYear}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
              disabled={currentMonth === 11}
              onPress={() =>
                setCurrentMonth((value) => Math.min(11, value + 1))
              }
              style={[
                styles.arrowButton,
                {
                  borderColor: theme.colors.outline,
                  opacity: currentMonth === 11 ? 0.45 : 1,
                },
              ]}
            >
              <Text
                style={[styles.arrowText, { color: theme.colors.onSurface }]}
              >
                ▶
              </Text>
            </Pressable>
          </View>

          <View style={styles.weekdays}>
            {weekDayNames.map((day) => (
              <Text
                key={day}
                style={[
                  styles.weekdayText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendar}>
            {calendarDays.map((day, index) => (
              <View
                key={day ? `day-${day.day}` : `empty-${index}`}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayInner,
                    {
                      backgroundColor: theme.dark
                        ? "#2d343e"
                        : theme.colors.elevation.level2,
                      borderColor: theme.colors.outline,
                    },
                    !day ? styles.dayInnerEmpty : null,
                    day?.hasActivity ? styles.dayInnerActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: theme.colors.onSurfaceVariant },
                      day?.hasActivity ? styles.dayTextActive : null,
                    ]}
                  >
                    {day ? day.day : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 18, 56, 0.45)",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  closeButton: {
    margin: 0,
  },
  helpText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  toolbar: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  arrowButton: {
    minWidth: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  monthLabel: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
  },
  weekdays: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayText: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  dayInner: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayInnerEmpty: {
    borderStyle: "dashed",
    opacity: 0.45,
  },
  dayInnerActive: {
    backgroundColor: "rgba(255, 122, 0, 0.22)",
    borderColor: "rgba(255, 122, 0, 0.75)",
  },
  dayText: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
  },
  dayTextActive: {
    color: "#ffddb8",
    fontWeight: "800",
  },
});
