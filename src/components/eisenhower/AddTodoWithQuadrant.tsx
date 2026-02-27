import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { EisenhowerQuadrant } from "@/lib/storage";
import { QUADRANT_OPTIONS } from "./quadrant-config";
import { useTranslation } from "react-i18next";

interface AddTodoWithQuadrantProps {
  onAdd: (content: string, estimationMinutes: number, quadrant?: EisenhowerQuadrant | null) => void;
}

export function AddTodoWithQuadrant({ onAdd }: AddTodoWithQuadrantProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [estimation, setEstimation] = useState("25");
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(content.trim(), parseInt(estimation, 10) || 25, quadrant === "" ? null : quadrant);
    setContent("");
    setEstimation("25");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap sm:flex-nowrap">
      <Input
        placeholder={t("todos.newTask")}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-w-[150px]"
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
      <select
        value={quadrant}
        onChange={(e) => setQuadrant(e.target.value as EisenhowerQuadrant | "")}
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none min-w-[140px]"
      >
        <option value="">{t("eisenhower.unsorted")}</option>
        {QUADRANT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
      <Button type="submit" size="icon" disabled={!content.trim()} className="shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
