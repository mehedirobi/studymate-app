import { useEffect, useState } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { loadAssignments, saveAssignments } from "./src/storage/assignmentStorage";

const defaultAssignments = [
  {
    id: "1",
    title: "DBMS Lab Report",
    subject: "DBMS",
    deadline: "2026-07-10",
    description: "Complete ER diagram and SQL queries",
    status: "pending",
  },
  {
    id: "2",
    title: "English Presentation",
    subject: "English",
    deadline: "2026-07-12",
    description: "Prepare presentation slides",
    status: "completed",
  },
  {
    id: "3",
    title: "Math Homework",
    subject: "Math",
    deadline: "2026-07-15",
    description: "Complete exercises from chapter 5",
    status: "pending",
  }
];

export default function App() {
  const [assignments, setAssignments] = useState(defaultAssignments);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const getAssignments = async () => {
      const savedAssignments = await loadAssignments();

      if (savedAssignments && savedAssignments.length > 0) {
        setAssignments(savedAssignments);
      }

      setIsLoaded(true);
    };

    getAssignments();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveAssignments(assignments);
    }
  }, [assignments, isLoaded]);

  const addAssignment = (newAssignment) => {
    setAssignments((prev) => [newAssignment, ...prev]);
  };

  const deleteAssignment = (id) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleAssignmentStatus = (id) => {
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "pending" ? "completed" : "pending",
            }
          : item
      )
    );
  };

  const resetAssignments = () => {
    setAssignments(defaultAssignments);
  };

  return (
    <AppNavigator
      assignments={assignments}
      addAssignment={addAssignment}
      deleteAssignment={deleteAssignment}
      toggleAssignmentStatus={toggleAssignmentStatus}
      resetAssignments={resetAssignments}
    />
  );
}