import NotebookCard from "./NotebookCard";

const NotebookList = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NotebookCard />
      <NotebookCard />
      <NotebookCard />
    </div>
  );
};

export default NotebookList; 