import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Notebook } from "@/types";

interface NotebookCardProps {
  notebook: Notebook;
}

const NotebookCard = ({ notebook }: NotebookCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{notebook.name}</CardTitle>
        <CardDescription>5 min ago</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="outline">active</Badge>
          <div className="flex items-center">
            <p className="text-sm text-gray-500 mr-2">12 sessions</p>
            <p className="text-sm text-gray-500">2 shared</p>
          </div>
        </div>
        <div className="flex items-center mt-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>AT</AvatarFallback>
          </Avatar>
          <p className="ml-2">Amogh Tantradi</p>
        </div>
        <div className="mt-4">
          <Badge>Exploration</Badge>
          <Badge>Python</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotebookCard; 