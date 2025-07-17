import NotebookCard from "./NotebookCard";
import { Notebook } from "@/types";

interface NotebookListProps {
  notebooks: Notebook[];
}

const NotebookList = ({notebooks}: NotebookListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notebooks.map((notebook) => (
        <NotebookCard key={notebook.id} notebook={notebook} />
      ))}
    </div>
  );
};

export default NotebookList; 