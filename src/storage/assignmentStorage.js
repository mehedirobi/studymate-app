import AsyncStorage from "@react-native-async-storage/async-storage";

const ASSIGNMENTS_KEY = "studymate_assignments";

export const saveAssignments = async (assignments) => {
  try {
    await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch (error) {
    console.log("Error saving assignments:", error);
  }
};

export const loadAssignments = async () => {
  try {
    const data = await AsyncStorage.getItem(ASSIGNMENTS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.log("Error loading assignments:", error);
    return null;
  }
};