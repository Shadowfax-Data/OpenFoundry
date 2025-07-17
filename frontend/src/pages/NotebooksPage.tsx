import { useEffect, useState } from "react";
import { CreateNotebookDialog } from "@/components/notebooks/CreateNotebookDialog";
import NotebookList from "@/components/notebooks/NotebookList";
import { Button } from "@/components/ui/button";

interface NotebooksPageProps {
  autoOpenCreateDialog?: boolean;
}

const NotebooksPage = ({
  autoOpenCreateDialog = false,
}: NotebooksPageProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (autoOpenCreateDialog) {
      setIsCreateDialogOpen(true);
    }
  }, [autoOpenCreateDialog]);

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
      <NotebookList />
      {isCreateDialogOpen && (
        <CreateNotebookDialog onClose={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
};

export default NotebooksPage; 