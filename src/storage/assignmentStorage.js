import AsyncStorage from "@react-native-async-storage/async-storage";

const ASSIGNMENTS_KEY = "studymate_assignments";
const STORAGE_VERSION_KEY = "studymate_storage_version";
const CURRENT_VERSION = 1;

/**
 * Basic shape check for a single assignment. Doesn't validate every field
 * exhaustively — just enough to catch corrupted/malformed entries before
 * they crash a screen that assumes e.g. `assignment.title` exists.
 */
function isValidAssignment(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.deadline === "string"
  );
}

/**
 * Save the full assignments array to disk.
 * @param {Array} assignments
 * @returns {Promise<boolean>} true if saved successfully
 */
export const saveAssignments = async (assignments) => {
  if (!Array.isArray(assignments)) {
    console.log("saveAssignments: expected an array, got", typeof assignments);
    return false;
  }

  try {
    const serialized = JSON.stringify(assignments);
    await AsyncStorage.multiSet([
      [ASSIGNMENTS_KEY, serialized],
      [STORAGE_VERSION_KEY, String(CURRENT_VERSION)],
    ]);
    return true;
  } catch (error) {
    console.log("Error saving assignments:", error);
    return false;
  }
};

/**
 * Load the assignments array from disk.
 * Filters out any corrupted individual entries rather than failing the
 * whole load, so one bad record doesn't wipe out the user's entire list.
 * @returns {Promise<Array|null>} the array, or null if nothing is stored /
 *   the stored data is unreadable
 */
export const loadAssignments = async () => {
  try {
    const data = await AsyncStorage.getItem(ASSIGNMENTS_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      console.log("loadAssignments: stored data is not an array, discarding");
      return null;
    }

    const validEntries = parsed.filter(isValidAssignment);

    if (validEntries.length !== parsed.length) {
      const droppedCount = parsed.length - validEntries.length;
      console.log(`loadAssignments: dropped ${droppedCount} corrupted entr${droppedCount === 1 ? "y" : "ies"}`);
      // Persist the cleaned-up list so we don't keep re-filtering corrupted
      // entries on every load, and so a corrupted item doesn't linger forever.
      await saveAssignments(validEntries);
    }

    return validEntries;
  } catch (error) {
    console.log("Error loading assignments:", error);
    return null;
  }
};

/**
 * Clear all stored assignments. Used by the "Reset Assignments" feature.
 * @returns {Promise<boolean>} true if cleared successfully
 */
export const clearAssignments = async () => {
  try {
    await AsyncStorage.multiRemove([ASSIGNMENTS_KEY, STORAGE_VERSION_KEY]);
    return true;
  } catch (error) {
    console.log("Error clearing assignments:", error);
    return false;
  }
};

/**
 * Merge-update helper: load current assignments, apply an updater function,
 * and save the result — all in one call. Reduces boilerplate in screens that
 * otherwise have to load -> mutate -> save manually every time.
 *
 * Example:
 *   await updateAssignments((current) =>
 *     current.map((a) => (a.id === id ? { ...a, status: "completed" } : a))
 *   );
 *
 * @param {(current: Array) => Array} updaterFn
 * @returns {Promise<Array|null>} the new array if saved successfully, else null
 */
export const updateAssignments = async (updaterFn) => {
  const current = (await loadAssignments()) || [];

  let updated;
  try {
    updated = updaterFn(current);
  } catch (error) {
    console.log("updateAssignments: updater function threw:", error);
    return null;
  }

  if (!Array.isArray(updated)) {
    console.log("updateAssignments: updater must return an array");
    return null;
  }

  const success = await saveAssignments(updated);
  return success ? updated : null;
};