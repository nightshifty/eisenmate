import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddTodoFormProps {
  onAdd: (content: string, estimationMinutes: number) => void;
}

export function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [estimation, setEstimation] = useState("25");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(content.trim(), parseInt(estimation, 10) || 25);
    setContent("");
    setEstimation("25");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder={t("todos.newTask")}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Min"
        min={1}
        max={999}
        value={estimation}
        onChange={(e) => setEstimation(e.target.value)}
        className="w-20"
      />
      <Button type="submit" size="icon" disabled={!content.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
