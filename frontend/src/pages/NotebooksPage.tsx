import { useEffect, useState } from "react";
import { CreateNotebookDialog } from "@/components/notebooks/CreateNotebookDialog";
import NotebookList from "@/components/notebooks/NotebookList";
import { Button } from "@/components/ui/button";
import { Notebook } from "@/types";

interface NotebooksPageProps {
  autoOpenCreateDialog?: boolean;
}

const NotebooksPage = ({
  autoOpenCreateDialog = false,
}: NotebooksPageProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    if (autoOpenCreateDialog) {
      setIsCreateDialogOpen(true);
    }
  }, [autoOpenCreateDialog]);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchNotebooks = async () => {
      const mockNotebooks: Notebook[] = [
        { id: "1", name: "My first notebook" },
        { id: "2", name: "Another notebook" },
      ];
      setNotebooks(mockNotebooks);
    };

    fetchNotebooks();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Notebooks</h1>
          <p className="text-gray-500">
            Create and manage your interactive notebooks
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          + New Notebook
        </Button>
      </div>
      <NotebookList notebooks={notebooks} />
      {isCreateDialogOpen && (
        <CreateNotebookDialog onClose={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
};

export default NotebooksPage; 